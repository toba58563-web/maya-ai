package com.maya.ai.assistant

import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "MayaPhoneControl")
class MayaPhoneControlPlugin : Plugin() {

    @PluginMethod
    fun isAccessibilityEnabled(call: PluginCall) {
        val enabled = MayaAccessibilityService.isServiceRunning
        val ret = JSObject().apply {
            put("enabled", enabled)
        }
        call.resolve(ret)
    }

    @PluginMethod
    fun openAccessibilitySettings(call: PluginCall) {
        val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
        context.startActivity(intent)
        call.resolve()
    }

    @PluginMethod
    fun isOverlayPermissionGranted(call: PluginCall) {
        val granted = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Settings.canDrawOverlays(context)
        } else {
            true
        }
        val ret = JSObject().apply {
            put("granted", granted)
        }
        call.resolve(ret)
    }

    @PluginMethod
    fun requestOverlayPermission(call: PluginCall) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(context)) {
            val intent = Intent(
                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:${context.packageName}")
            ).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            context.startActivity(intent)
        }
        call.resolve()
    }

    @PluginMethod
    fun showFloatingOrb(call: PluginCall) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(context)) {
            val intent = Intent(context, MayaFloatingOrbService::class.java).apply {
                action = MayaFloatingOrbService.ACTION_START
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
            call.resolve(JSObject().apply { put("success", true) })
        } else {
            call.reject("Overlay permission not granted. Please enable 'Display over other apps'")
        }
    }

    @PluginMethod
    fun hideFloatingOrb(call: PluginCall) {
        val intent = Intent(context, MayaFloatingOrbService::class.java).apply {
            action = MayaFloatingOrbService.ACTION_STOP
        }
        context.startService(intent)
        call.resolve(JSObject().apply { put("success", true) })
    }

    @PluginMethod
    fun updateOrbState(call: PluginCall) {
        val state = call.getString("state") ?: "IDLE"
        val intent = Intent(context, MayaFloatingOrbService::class.java).apply {
            action = MayaFloatingOrbService.ACTION_UPDATE_STATE
            putExtra(MayaFloatingOrbService.EXTRA_STATE, state)
        }
        context.startService(intent)
        call.resolve()
    }

    @PluginMethod
    fun startForegroundService(call: PluginCall) {
        val intent = Intent(context, MayaForegroundService::class.java).apply {
            action = MayaForegroundService.ACTION_START
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(intent)
        } else {
            context.startService(intent)
        }
        call.resolve(JSObject().apply { put("running", true) })
    }

    @PluginMethod
    fun stopForegroundService(call: PluginCall) {
        val intent = Intent(context, MayaForegroundService::class.java).apply {
            action = MayaForegroundService.ACTION_STOP
        }
        context.startService(intent)
        call.resolve(JSObject().apply { put("running", false) })
    }

    @PluginMethod
    fun launchApp(call: PluginCall) {
        val packageName = call.getString("packageName")
        if (packageName.isNullOrBlank()) {
            call.reject("Package name is required")
            return
        }

        val pm = context.packageManager
        val intent = pm.getLaunchIntentForPackage(packageName)
        if (intent != null) {
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
            context.startActivity(intent)
            call.resolve(JSObject().apply { put("success", true) })
        } else {
            call.reject("Application '$packageName' not found or cannot be launched")
        }
    }

    @PluginMethod
    fun getInstalledApps(call: PluginCall) {
        val pm = context.packageManager
        val mainIntent = Intent(Intent.ACTION_MAIN, null).apply {
            addCategory(Intent.CATEGORY_LAUNCHER)
        }

        val apps = pm.queryIntentActivities(mainIntent, 0)
        val jsArray = JSArray()

        for (info in apps) {
            val appObj = JSObject().apply {
                put("name", info.loadLabel(pm).toString())
                put("packageName", info.activityInfo.packageName)
            }
            jsArray.put(appObj)
        }

        val ret = JSObject().apply {
            put("apps", jsArray)
        }
        call.resolve(ret)
    }

    @PluginMethod
    fun performTap(call: PluginCall) {
        val target = call.getString("target")
        if (target.isNullOrBlank()) {
            call.reject("Target text or view description required")
            return
        }

        val service = MayaAccessibilityService.instance
        if (service == null) {
            call.reject("Accessibility Service is not enabled. Please enable Maya in Android Settings -> Accessibility.")
            return
        }

        val success = service.tapElement(target)
        call.resolve(JSObject().apply { put("success", success) })
    }

    @PluginMethod
    fun performScroll(call: PluginCall) {
        val direction = call.getString("direction") ?: "down"
        val service = MayaAccessibilityService.instance
        if (service == null) {
            call.reject("Accessibility Service is not enabled")
            return
        }

        val success = service.scrollScreen(direction)
        call.resolve(JSObject().apply { put("success", success) })
    }

    @PluginMethod
    fun enterText(call: PluginCall) {
        val text = call.getString("text")
        val targetField = call.getString("targetField")
        if (text == null) {
            call.reject("Text is required")
            return
        }

        val service = MayaAccessibilityService.instance
        if (service == null) {
            call.reject("Accessibility Service is not enabled")
            return
        }

        val success = service.enterText(text, targetField)
        call.resolve(JSObject().apply { put("success", success) })
    }

    @PluginMethod
    fun readScreen(call: PluginCall) {
        val service = MayaAccessibilityService.instance
        if (service == null) {
            call.reject("Accessibility Service is not enabled")
            return
        }

        val content = service.readScreenContent()
        val jsArray = JSArray()
        for (item in content) {
            jsArray.put(item)
        }
        call.resolve(JSObject().apply { put("content", jsArray) })
    }

    @PluginMethod
    fun stopActions(call: PluginCall) {
        MayaAccessibilityService.instance?.requestStop()
        call.resolve(JSObject().apply { put("stopped", true) })
    }

    @PluginMethod
    fun saveApiKey(call: PluginCall) {
        val key = call.getString("apiKey") ?: ""
        MayaSecureStorage.saveApiKey(context, key)
        call.resolve(JSObject().apply { put("saved", true) })
    }

    @PluginMethod
    fun getApiKey(call: PluginCall) {
        val key = MayaSecureStorage.getApiKey(context)
        call.resolve(JSObject().apply { put("apiKey", key) })
    }

    @PluginMethod
    fun clearApiKey(call: PluginCall) {
        MayaSecureStorage.clearApiKey(context)
        call.resolve(JSObject().apply { put("cleared", true) })
    }
}
