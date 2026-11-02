package com.maya.ai.assistant

import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

/**
 * Hardware-backed encrypted storage for Gemini API key.
 * Strictly uses Android Keystore AES256 encryption.
 * NEVER falls back to plaintext SharedPreferences.
 * NEVER logs the API key.
 */
object MayaSecureStorage {
    private const val TAG = "MayaSecureStorage"
    private const val PREFS_FILE = "maya_secure_encrypted_prefs"
    private const val KEY_GEMINI_API = "gemini_api_key"

    @Synchronized
    private fun getEncryptedPrefs(context: Context): SharedPreferences? {
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
            Log.e(TAG, "EncryptedSharedPreferences Keystore initialization failed: ${e.message}")
            null
        }
    }

    @Synchronized
    fun saveApiKey(context: Context, key: String): Boolean {
        val trimmed = key.trim()
        if (trimmed.isEmpty()) {
            return clearApiKey(context)
        }

        val prefs = getEncryptedPrefs(context)
        if (prefs == null) {
            Log.e(TAG, "Cannot save API key: Android Keystore encryption unavailable")
            return false
        }

        return try {
            prefs.edit().putString(KEY_GEMINI_API, trimmed).commit()
        } catch (e: Exception) {
            Log.e(TAG, "Failed to securely save API key: ${e.message}")
            false
        }
    }

    @Synchronized
    fun getApiKey(context: Context): String {
        val prefs = getEncryptedPrefs(context) ?: return ""
        return try {
            prefs.getString(KEY_GEMINI_API, "") ?: ""
        } catch (e: Exception) {
            Log.e(TAG, "Failed to securely retrieve API key: ${e.message}")
            ""
        }
    }

    @Synchronized
    fun clearApiKey(context: Context): Boolean {
        val prefs = getEncryptedPrefs(context) ?: return false
        return try {
            prefs.edit().remove(KEY_GEMINI_API).commit()
        } catch (e: Exception) {
            Log.e(TAG, "Failed to securely clear API key: ${e.message}")
            false
        }
    }
}
