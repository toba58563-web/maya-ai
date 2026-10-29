package com.maya.ai.assistant

import android.content.Context
import android.content.SharedPreferences
import android.os.Build
import android.util.Log
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

object MayaSecureStorage {
    private const val TAG = "MayaSecureStorage"
    private const val PREFS_FILE = "maya_secure_prefs"
    private const val KEY_GEMINI_API = "gemini_api_key"

    private fun getPrefs(context: Context): SharedPreferences {
        return try {
            val masterKey = MasterKey.Builder(context)
                .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
                .build()

            EncryptedSharedPreferences.create(
                context,
                PREFS_FILE,
                masterKey,
                EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
            )
        } catch (e: Exception) {
            Log.w(TAG, "Keystore EncryptedSharedPreferences unavailable, falling back: ${e.message}")
            context.getSharedPreferences("maya_app_prefs", Context.MODE_PRIVATE)
        }
    }

    fun saveApiKey(context: Context, key: String) {
        getPrefs(context).edit().putString(KEY_GEMINI_API, key.trim()).apply()
    }

    fun getApiKey(context: Context): String {
        return getPrefs(context).getString(KEY_GEMINI_API, "") ?: ""
    }

    fun clearApiKey(context: Context) {
        getPrefs(context).edit().remove(KEY_GEMINI_API).apply()
    }
}
