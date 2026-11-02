package com.maya.ai.assistant

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

data class MayaNotificationItem(
    val id: String,
    val packageName: String,
    val appName: String,
    val title: String,
    val text: String,
    val timestamp: Long,
    val timeFormatted: String
)

class MayaNotificationListenerService : NotificationListenerService() {

    companion object {
        private const val TAG = "MayaNotifListener"
        var instance: MayaNotificationListenerService? = null
            private set

        private val recentNotifications = mutableListOf<MayaNotificationItem>()
        private const val MAX_SAVED = 30

        @Synchronized
        fun getRecentList(): List<MayaNotificationItem> {
            return recentNotifications.toList()
        }

        @Synchronized
        fun clearNotifications() {
            recentNotifications.clear()
        }
    }

    override fun onListenerConnected() {
        super.onListenerConnected()
        instance = this
        Log.i(TAG, "Maya Notification Listener Service Connected")
    }

    override fun onListenerDisconnected() {
        super.onListenerDisconnected()
        instance = null
        Log.i(TAG, "Maya Notification Listener Service Disconnected")
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        if (sbn == null) return

        val extras = sbn.notification.extras ?: return
        val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString()?.trim() ?: ""
        val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString()?.trim() ?: ""
        val bigText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString()?.trim() ?: ""
        val bodyText = if (bigText.isNotBlank()) bigText else text

        // Filter out empty or self notifications
        if (title.isBlank() && bodyText.isBlank()) return
        if (sbn.packageName == packageName) return

        val pm = packageManager
        val appName = try {
            val appInfo = pm.getApplicationInfo(sbn.packageName, 0)
            pm.getApplicationLabel(appInfo).toString()
        } catch (e: Exception) {
            sbn.packageName
        }

        val timeStr = SimpleDateFormat("h:mm a", Locale.getDefault()).format(Date(sbn.postTime))
        val item = MayaNotificationItem(
            id = "${sbn.id}_${sbn.postTime}",
            packageName = sbn.packageName,
            appName = appName,
            title = title,
            text = bodyText,
            timestamp = sbn.postTime,
            timeFormatted = timeStr
        )

        synchronized(recentNotifications) {
            recentNotifications.removeAll { it.id == item.id }
            recentNotifications.add(0, item)
            if (recentNotifications.size > MAX_SAVED) {
                recentNotifications.removeAt(recentNotifications.lastIndex)
            }
        }

        Log.d(TAG, "New Notification: [$appName] $title: $bodyText")
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification?) {
        // Handled if needed
    }
}
