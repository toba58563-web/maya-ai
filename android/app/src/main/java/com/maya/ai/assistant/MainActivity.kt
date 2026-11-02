package com.maya.ai.assistant

import android.os.Bundle
import android.util.Log
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {

    private val TAG = "MainActivity"

    override fun onCreate(savedInstanceState: Bundle?) {
        registerPlugin(MayaPhoneControlPlugin::class.java)
        super.onCreate(savedInstanceState)

        // Configure WebView settings to allow background audio streaming and WebSockets
        try {
            bridge?.webView?.settings?.apply {
                mediaPlaybackRequiresUserGesture = false
                domStorageEnabled = true
                databaseEnabled = true
            }
            Log.d(TAG, "WebView configured for background voice streaming")
        } catch (e: Exception) {
            Log.w(TAG, "Error configuring WebView settings: ${e.message}")
        }
    }

    override fun onPause() {
        super.onPause()
        // If Maya voice assistant is running via Foreground Service, keep JavaScript timers active
        if (MayaForegroundService.isRunning) {
            try {
                bridge?.webView?.resumeTimers()
                Log.d(TAG, "Activity paused but Maya Foreground Service is active - keeping WebView timers running")
            } catch (e: Exception) {
                Log.w(TAG, "Error resuming WebView timers on pause: ${e.message}")
            }
        }
    }

    override fun onStop() {
        super.onStop()
        if (MayaForegroundService.isRunning) {
            try {
                bridge?.webView?.resumeTimers()
                Log.d(TAG, "Activity stopped (minimized) - keeping WebView timers running for Maya background session")
            } catch (e: Exception) {
                Log.w(TAG, "Error resuming WebView timers on stop: ${e.message}")
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        // If the entire activity is destroyed and foreground service isn't keeping it alive, clean up
        if (!MayaForegroundService.isRunning) {
            MayaPhoneControlPlugin.stopAllAudio()
        }
    }
}
