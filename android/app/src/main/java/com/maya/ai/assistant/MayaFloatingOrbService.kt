package com.maya.ai.assistant

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.IBinder
import android.provider.Settings
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.TextView
import androidx.core.app.NotificationCompat

class MayaFloatingOrbService : Service() {

    companion object {
        const val ACTION_START = "com.maya.ai.assistant.START_ORB"
        const val ACTION_STOP = "com.maya.ai.assistant.STOP_ORB"
        const val ACTION_UPDATE_STATE = "com.maya.ai.assistant.UPDATE_ORB_STATE"
        const val EXTRA_STATE = "extra_state"

        const val STATE_LISTENING = "LISTENING"
        const val STATE_THINKING = "THINKING"
        const val STATE_EXECUTING = "EXECUTING"
        const val STATE_SPEAKING = "SPEAKING"
        const val STATE_ERROR = "ERROR"
        const val STATE_IDLE = "IDLE"

        var isRunning = false
            private set
    }

    private var windowManager: WindowManager? = null
    private var orbView: View? = null
    private var innerCoreView: View? = null
    private var statusTextView: TextView? = null
    private var currentState = STATE_IDLE

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        isRunning = true
        createNotificationChannel()
        val notification = createNotification("Maya Floating Assistant is active")
        startForeground(1001, notification)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_STOP -> {
                stopSelf()
                return START_NOT_STICKY
            }
            ACTION_UPDATE_STATE -> {
                val newState = intent.getStringExtra(EXTRA_STATE) ?: STATE_IDLE
                updateOrbVisualState(newState)
            }
            else -> {
                if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(this)) {
                    initFloatingOrb()
                }
            }
        }
        return START_STICKY
    }

    private fun initFloatingOrb() {
        if (orbView != null) return

        windowManager = getSystemService(WINDOW_SERVICE) as WindowManager

        val layoutType = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        } else {
            @Suppress("DEPRECATION")
            WindowManager.LayoutParams.TYPE_PHONE
        }

        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            layoutType,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.START
            x = 30
            y = 200
        }

        val density = resources.displayMetrics.density
        val orbSizePx = (64 * density).toInt()

        // Root container
        val rootLayout = FrameLayout(this).apply {
            layoutParams = FrameLayout.LayoutParams(FrameLayout.LayoutParams.WRAP_CONTENT, FrameLayout.LayoutParams.WRAP_CONTENT)
        }

        // Glowing outer circle
        val orbContainer = FrameLayout(this).apply {
            layoutParams = FrameLayout.LayoutParams(orbSizePx, orbSizePx)
            elevation = 12 * density
        }

        // Inner glowing core
        innerCoreView = View(this).apply {
            val innerSize = (52 * density).toInt()
            layoutParams = FrameLayout.LayoutParams(innerSize, innerSize).apply {
                gravity = Gravity.CENTER
            }
            background = createOrbDrawable(Color.parseColor("#06B6D4"), Color.parseColor("#3B82F6"))
        }

        // Monogram text in orb
        statusTextView = TextView(this).apply {
            text = "M"
            textSize = 22f
            setTextColor(Color.WHITE)
            gravity = Gravity.CENTER
            layoutParams = FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT)
        }

        orbContainer.addView(innerCoreView)
        orbContainer.addView(statusTextView)
        rootLayout.addView(orbContainer)

        // Drag and tap logic
        rootLayout.setOnTouchListener(object : View.OnTouchListener {
            private var initialX = 0
            private var initialY = 0
            private var initialTouchX = 0f
            private var initialTouchY = 0f
            private var isClick = true

            override fun onTouch(v: View?, event: MotionEvent): Boolean {
                when (event.action) {
                    MotionEvent.ACTION_DOWN -> {
                        initialX = params.x
                        initialY = params.y
                        initialTouchX = event.rawX
                        initialTouchY = event.rawY
                        isClick = true
                        return true
                    }
                    MotionEvent.ACTION_MOVE -> {
                        val dx = event.rawX - initialTouchX
                        val dy = event.rawY - initialTouchY
                        if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
                            isClick = false
                        }
                        params.x = initialX + dx.toInt()
                        params.y = initialY + dy.toInt()
                        windowManager?.updateViewLayout(rootLayout, params)
                        return true
                    }
                    MotionEvent.ACTION_UP -> {
                        if (isClick) {
                            // Tapped orb: bring Maya to foreground
                            val launchIntent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
                                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
                            }
                            if (launchIntent != null) {
                                startActivity(launchIntent)
                            }
                        }
                        return true
                    }
                }
                return false
            }
        })

        orbView = rootLayout
        try {
            windowManager?.addView(orbView, params)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun updateOrbVisualState(state: String) {
        currentState = state
        val (colorStart, colorEnd, label) = when (state) {
            STATE_LISTENING -> Triple(Color.parseColor("#06B6D4"), Color.parseColor("#0284C7"), "M")
            STATE_THINKING -> Triple(Color.parseColor("#8B5CF6"), Color.parseColor("#6366F1"), "...")
            STATE_EXECUTING -> Triple(Color.parseColor("#F59E0B"), Color.parseColor("#10B981"), "⚡")
            STATE_SPEAKING -> Triple(Color.parseColor("#EC4899"), Color.parseColor("#F43F5E"), "♪")
            STATE_ERROR -> Triple(Color.parseColor("#EF4444"), Color.parseColor("#DC2626"), "!")
            else -> Triple(Color.parseColor("#06B6D4"), Color.parseColor("#3B82F6"), "M")
        }

        innerCoreView?.background = createOrbDrawable(colorStart, colorEnd)
        statusTextView?.text = label
    }

    private fun createOrbDrawable(startColor: Int, endColor: Int): GradientDrawable {
        return GradientDrawable(GradientDrawable.Orientation.TL_BR, intArrayOf(startColor, endColor)).apply {
            shape = GradientDrawable.OVAL
            setStroke(3, Color.WHITE)
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                "maya_orb_channel",
                "Maya Floating Assistant",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Shows status of Maya Floating Orb overlay"
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager?.createNotificationChannel(channel)
        }
    }

    private fun createNotification(contentText: String): Notification {
        val launchIntent = packageManager.getLaunchIntentForPackage(packageName)?.let {
            PendingIntent.getActivity(this, 0, it, PendingIntent.FLAG_IMMUTABLE)
        }

        return NotificationCompat.Builder(this, "maya_orb_channel")
            .setContentTitle("Maya AI Assistant")
            .setContentText(contentText)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentIntent(launchIntent)
            .setOngoing(true)
            .build()
    }

    override fun onDestroy() {
        super.onDestroy()
        isRunning = false
        if (orbView != null) {
            try {
                windowManager?.removeView(orbView)
            } catch (e: Exception) {
                e.printStackTrace()
            }
            orbView = null
        }
    }
}
