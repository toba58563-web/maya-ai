package com.maya.ai.assistant

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import android.util.Log
import androidx.core.app.NotificationCompat

class MayaForegroundService : Service() {

    companion object {
        private const val TAG = "MayaForegroundService"
        const val CHANNEL_ID = "maya_foreground_channel"
        const val NOTIFICATION_ID = 2001
        const val ACTION_START = "com.maya.ai.assistant.START_FOREGROUND"
        const val ACTION_STOP = "com.maya.ai.assistant.STOP_FOREGROUND"
        const val ACTION_UPDATE_STATUS = "com.maya.ai.assistant.UPDATE_STATUS"
        const val EXTRA_STATUS_TEXT = "extra_status_text"

        @Volatile
        var isRunning = false
            private set
    }

    private var currentStatus = "Maya AI is active and listening"
    private var wakeLock: PowerManager.WakeLock? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        acquireWakeLock()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_STOP -> {
                Log.d(TAG, "Stopping MayaForegroundService via ACTION_STOP")
                // Genuinely stop audio pipeline when user presses Stop in notification
                MayaPhoneControlPlugin.stopAllAudio()
                releaseWakeLock()

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                    stopForeground(STOP_FOREGROUND_REMOVE)
                } else {
                    @Suppress("DEPRECATION")
                    stopForeground(true)
                }
                stopSelf()
                isRunning = false
                return START_NOT_STICKY
            }
            ACTION_UPDATE_STATUS -> {
                val newStatus = intent.getStringExtra(EXTRA_STATUS_TEXT)
                if (!newStatus.isNullOrBlank()) {
                    currentStatus = newStatus
                    val notification = buildForegroundNotification(currentStatus)
                    val manager = getSystemService(NotificationManager::class.java)
                    manager?.notify(NOTIFICATION_ID, notification)
                }
                return START_NOT_STICKY
            }
            else -> {
                currentStatus = intent?.getStringExtra(EXTRA_STATUS_TEXT) ?: "Maya AI is active and listening"
                val notification = buildForegroundNotification(currentStatus)

                try {
                    // Android 14+ (API 34+) requires explicit FOREGROUND_SERVICE_TYPE_MICROPHONE
                    // for microphone access while in foreground service
                    val fgsType = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                        ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE or ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE
                    } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                        ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE
                    } else {
                        0
                    }

                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                        try {
                            startForeground(NOTIFICATION_ID, notification, fgsType)
                        } catch (secEx: SecurityException) {
                            Log.w(TAG, "Microphone FGS permission fallback: ${secEx.message}")
                            startForeground(NOTIFICATION_ID, notification)
                        }
                    } else {
                        startForeground(NOTIFICATION_ID, notification)
                    }
                    isRunning = true
                    acquireWakeLock()
                    Log.d(TAG, "MayaForegroundService started successfully (fgsType=$fgsType)")
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to startForeground: ${e.message}", e)
                    isRunning = false
                    releaseWakeLock()
                    stopSelf()
                }
                return START_NOT_STICKY
            }
        }
    }

    private fun acquireWakeLock() {
        if (wakeLock == null) {
            try {
                val pm = getSystemService(Context.POWER_SERVICE) as? PowerManager
                wakeLock = pm?.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "MayaAI::ForegroundWakeLock")?.apply {
                    setReferenceCounted(false)
                    acquire(12 * 60 * 60 * 1000L) // 12-hour safe cap
                }
                Log.d(TAG, "Partial WakeLock acquired for background voice assistant")
            } catch (e: Exception) {
                Log.w(TAG, "Failed to acquire WakeLock: ${e.message}")
            }
        }
    }

    private fun releaseWakeLock() {
        try {
            if (wakeLock?.isHeld == true) {
                wakeLock?.release()
                Log.d(TAG, "Partial WakeLock released")
            }
        } catch (e: Exception) {
            Log.w(TAG, "Error releasing WakeLock: ${e.message}")
        } finally {
            wakeLock = null
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Maya AI Voice Assistant",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Shows live assistant and background voice status while Maya is active"
                setShowBadge(false)
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager?.createNotificationChannel(channel)
        }
    }

    private fun buildForegroundNotification(statusText: String): Notification {
        val launchIntent = packageManager.getLaunchIntentForPackage(packageName)?.let {
            PendingIntent.getActivity(
                this,
                0,
                it,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
        }

        val stopIntent = Intent(this, MayaForegroundService::class.java).apply {
            action = ACTION_STOP
        }
        val stopPendingIntent = PendingIntent.getService(
            this,
            1,
            stopIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Maya AI Assistant")
            .setContentText(statusText)
            .setSmallIcon(android.R.drawable.ic_btn_speak_now)
            .setContentIntent(launchIntent)
            .addAction(android.R.drawable.ic_menu_close_clear_cancel, "Stop Maya", stopPendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .build()
    }

    override fun onDestroy() {
        super.onDestroy()
        releaseWakeLock()
        isRunning = false
        Log.d(TAG, "MayaForegroundService destroyed")
    }
}
