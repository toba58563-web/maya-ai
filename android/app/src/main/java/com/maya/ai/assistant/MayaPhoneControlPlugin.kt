package com.maya.ai.assistant

import android.Manifest
import android.app.role.RoleManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioRecord
import android.media.AudioTrack
import android.media.MediaRecorder
import android.media.audiofx.AcousticEchoCanceler
import android.media.audiofx.NoiseSuppressor
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import android.util.Base64
import android.util.Log
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.PermissionState
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback
import java.util.concurrent.atomic.AtomicBoolean

@CapacitorPlugin(
    name = "MayaPhoneControl",
    permissions = [
        Permission(
            alias = "microphone",
            strings = [Manifest.permission.RECORD_AUDIO]
        ),
        Permission(
            alias = "notifications",
            strings = [Manifest.permission.POST_NOTIFICATIONS]
        ),
        Permission(
            alias = "location",
            strings = [Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION]
        ),
        Permission(
            alias = "camera",
            strings = [Manifest.permission.CAMERA]
        ),
        Permission(
            alias = "contacts",
            strings = [Manifest.permission.READ_CONTACTS]
        ),
        Permission(
            alias = "phone",
            strings = [Manifest.permission.CALL_PHONE]
        ),
        Permission(
            alias = "sms",
            strings = [Manifest.permission.SEND_SMS]
        )
    ]
)
class MayaPhoneControlPlugin : Plugin() {

    private val TAG = "MayaPhoneControl"

    companion object {
        @Volatile
        var pluginInstance: MayaPhoneControlPlugin? = null
            private set

        fun stopAllAudio() {
            pluginInstance?.internalStopAllAudio()
        }
    }

    override fun load() {
        super.load()
        pluginInstance = this
    }

    // -------------------------------------------------------------
    // NATIVE AUDIO RECORDING (16kHz PCM mono for Gemini Live input)
    // -------------------------------------------------------------
    private var audioRecord: AudioRecord? = null
    private var recordingThread: Thread? = null
    private val isRecording = AtomicBoolean(false)
    private val audioRecordLock = Any()
    private val RECORD_SAMPLE_RATE = 16000
    private val RECORD_CHANNEL = AudioFormat.CHANNEL_IN_MONO
    private val RECORD_FORMAT = AudioFormat.ENCODING_PCM_16BIT
    private var aecInstance: AcousticEchoCanceler? = null
    private var nsInstance: NoiseSuppressor? = null

    // -------------------------------------------------------------
    // NATIVE AUDIO PLAYBACK (24kHz PCM mono for Gemini Live output)
    // -------------------------------------------------------------
    private var audioTrack: AudioTrack? = null
    private val audioTrackLock = Any()
    private val PLAY_SAMPLE_RATE = 24000
    private val PLAY_CHANNEL = AudioFormat.CHANNEL_OUT_MONO
    private val PLAY_FORMAT = AudioFormat.ENCODING_PCM_16BIT
    private var audioFocusRequest: AudioFocusRequest? = null

    @Synchronized
    private fun getOrCreateAudioTrack(): AudioTrack? {
        synchronized(audioTrackLock) {
            if (audioTrack == null || audioTrack?.state != AudioTrack.STATE_INITIALIZED) {
                try {
                    // Release any defunct previous track
                    try {
                        audioTrack?.release()
                    } catch (_: Exception) {}
                    audioTrack = null

                    val minBuf = AudioTrack.getMinBufferSize(
                        PLAY_SAMPLE_RATE,
                        PLAY_CHANNEL,
                        PLAY_FORMAT
                    )
                    // Responsive buffer size: max(minBuf * 2, 8192) bytes (~170ms) to ensure low latency and continuous flow
                    val bufferSize = Math.max(minBuf * 2, 8192)

                    // USAGE_MEDIA with CONTENT_TYPE_SPEECH routes directly to the primary media speaker
                    val attributes = AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_MEDIA)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                        .setFlags(AudioAttributes.FLAG_AUDIBILITY_ENFORCED)
                        .build()

                    val format = AudioFormat.Builder()
                        .setSampleRate(PLAY_SAMPLE_RATE)
                        .setChannelMask(PLAY_CHANNEL)
                        .setEncoding(PLAY_FORMAT)
                        .build()

                    val am = context.getSystemService(Context.AUDIO_SERVICE) as? AudioManager
                    am?.let { audioManager ->
                        try {
                            audioManager.mode = AudioManager.MODE_NORMAL
                            // Ensure loudspeaker routing when no headphones/bluetooth are connected
                            if (!audioManager.isWiredHeadsetOn && !audioManager.isBluetoothA2dpOn && !audioManager.isBluetoothScoOn) {
                                audioManager.isSpeakerphoneOn = true
                            }

                            // Request transient audio focus
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                                if (audioFocusRequest == null) {
                                    audioFocusRequest = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK)
                                        .setAudioAttributes(attributes)
                                        .build()
                                }
                                audioFocusRequest?.let { audioManager.requestAudioFocus(it) }
                            } else {
                                @Suppress("DEPRECATION")
                                audioManager.requestAudioFocus(null, AudioManager.STREAM_MUSIC, AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK)
                            }
                        } catch (e: Exception) {
                            Log.w(TAG, "Audio focus/routing warning: ${e.message}")
                        }
                    }

                    val track = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                        AudioTrack(
                            attributes,
                            format,
                            bufferSize,
                            AudioTrack.MODE_STREAM,
                            AudioManager.AUDIO_SESSION_ID_GENERATE
                        )
                    } else {
                        @Suppress("DEPRECATION")
                        AudioTrack(
                            AudioManager.STREAM_MUSIC,
                            PLAY_SAMPLE_RATE,
                            PLAY_CHANNEL,
                            PLAY_FORMAT,
                            bufferSize,
                            AudioTrack.MODE_STREAM
                        )
                    }

                    if (track.state == AudioTrack.STATE_INITIALIZED) {
                        try {
                            track.setVolume(1.0f)
                        } catch (_: Exception) {}
                        track.play()
                        audioTrack = track
                        Log.d(TAG, "AudioTrack initialized successfully (sampleRate=$PLAY_SAMPLE_RATE, bufferSize=$bufferSize)")
                    } else {
                        Log.e(TAG, "AudioTrack state not initialized (state=${track.state})")
                        track.release()
                        audioTrack = null
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to initialize AudioTrack: ${e.message}", e)
                    audioTrack = null
                }
            }
            return audioTrack
        }
    }

    @PluginMethod
    fun startAudioCapture(call: PluginCall) {
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            call.reject("Microphone permission (android.permission.RECORD_AUDIO) is not granted. Please enable it in Android Settings.")
            return
        }

        synchronized(audioRecordLock) {
            internalStopAudioCapture()

            try {
                val minBuf = AudioRecord.getMinBufferSize(
                    RECORD_SAMPLE_RATE,
                    RECORD_CHANNEL,
                    RECORD_FORMAT
                )
                val bufferSize = Math.max(minBuf * 2, 4096)

                // Prefer VOICE_COMMUNICATION for hardware Acoustic Echo Cancellation (AEC), fallback to VOICE_RECOGNITION
                var record: AudioRecord? = null
                val audioSources = arrayOf(
                    MediaRecorder.AudioSource.VOICE_COMMUNICATION,
                    MediaRecorder.AudioSource.VOICE_RECOGNITION,
                    MediaRecorder.AudioSource.MIC
                )

                for (source in audioSources) {
                    try {
                        val testRecord = AudioRecord(
                            source,
                            RECORD_SAMPLE_RATE,
                            RECORD_CHANNEL,
                            RECORD_FORMAT,
                            bufferSize
                        )
                        if (testRecord.state == AudioRecord.STATE_INITIALIZED) {
                            record = testRecord
                            Log.d(TAG, "AudioRecord initialized with audioSource=$source")
                            break
                        } else {
                            testRecord.release()
                        }
                    } catch (e: Exception) {
                        Log.w(TAG, "AudioRecord source $source init failed: ${e.message}")
                    }
                }

                if (record == null || record.state != AudioRecord.STATE_INITIALIZED) {
                    call.reject("AudioRecord initialization failed across all audio sources")
                    return
                }

                // Attach Hardware Acoustic Echo Canceler if available to prevent speaker feedback
                try {
                    if (AcousticEchoCanceler.isAvailable()) {
                        aecInstance = AcousticEchoCanceler.create(record.audioSessionId)?.apply {
                            enabled = true
                        }
                        Log.d(TAG, "Hardware AcousticEchoCanceler enabled on session ${record.audioSessionId}")
                    }
                } catch (e: Exception) {
                    Log.w(TAG, "Could not enable AcousticEchoCanceler: ${e.message}")
                }

                // Attach Noise Suppressor if available
                try {
                    if (NoiseSuppressor.isAvailable()) {
                        nsInstance = NoiseSuppressor.create(record.audioSessionId)?.apply {
                            enabled = true
                        }
                        Log.d(TAG, "Hardware NoiseSuppressor enabled on session ${record.audioSessionId}")
                    }
                } catch (e: Exception) {
                    Log.w(TAG, "Could not enable NoiseSuppressor: ${e.message}")
                }

                record.startRecording()
                audioRecord = record
                isRecording.set(true)

                recordingThread = Thread({
                    val buffer = ByteArray(2048)
                    while (isRecording.get() && !Thread.currentThread().isInterrupted) {
                        val currentRecord = audioRecord ?: break
                        val read = try {
                            currentRecord.read(buffer, 0, buffer.size)
                        } catch (e: Exception) {
                            Log.w(TAG, "AudioRecord read exception: ${e.message}")
                            -1
                        }

                        if (read > 0 && isRecording.get()) {
                            val base64 = Base64.encodeToString(buffer, 0, read, Base64.NO_WRAP)
                            val event = JSObject().apply {
                                put("data", base64)
                            }
                            notifyListeners("audioInputChunk", event)
                        } else if (read < 0) {
                            Log.w(TAG, "AudioRecord read returned error code: $read")
                            break
                        }
                    }
                }, "MayaAudioRecordThread").apply {
                    priority = Thread.MAX_PRIORITY
                    start()
                }

                call.resolve(JSObject().apply {
                    put("success", true)
                    put("status", "RECORDING")
                    put("sampleRate", RECORD_SAMPLE_RATE)
                })
            } catch (e: Exception) {
                Log.e(TAG, "Error starting AudioRecord: ${e.message}", e)
                call.reject("Audio capture error: ${e.message}")
            }
        }
    }

    private fun internalStopAudioCapture() {
        try {
            isRecording.set(false)
            val threadToJoin = recordingThread
            recordingThread = null
            threadToJoin?.interrupt()
            try {
                threadToJoin?.join(500)
            } catch (_: InterruptedException) {}

            try {
                aecInstance?.release()
            } catch (_: Exception) {}
            aecInstance = null

            try {
                nsInstance?.release()
            } catch (_: Exception) {}
            nsInstance = null

            try {
                if (audioRecord?.state == AudioRecord.STATE_INITIALIZED) {
                    audioRecord?.stop()
                }
            } catch (e: Exception) {
                Log.w(TAG, "AudioRecord stop exception: ${e.message}")
            } finally {
                try {
                    audioRecord?.release()
                } catch (_: Exception) {}
                audioRecord = null
            }
        } catch (e: Exception) {
            Log.w(TAG, "Error in internalStopAudioCapture: ${e.message}")
        }
    }

    @PluginMethod
    fun stopAudioCapture(call: PluginCall) {
        Thread({
            synchronized(audioRecordLock) {
                internalStopAudioCapture()
                call.resolve(JSObject().apply {
                    put("success", true)
                    put("status", "STOPPED")
                })
            }
        }, "MayaAudioStopThread").start()
    }

    @PluginMethod
    fun playAudioChunk(call: PluginCall) {
        val base64Data = call.getString("data")
        if (base64Data.isNullOrBlank()) {
            call.reject("Audio chunk data cannot be empty")
            return
        }

        val pcmBytes: ByteArray
        try {
            pcmBytes = Base64.decode(base64Data, Base64.DEFAULT)
            if (pcmBytes.isEmpty()) {
                call.reject("Decoded PCM data is empty")
                return
            }
        } catch (e: Exception) {
            call.reject("Invalid base64 PCM data: ${e.message}")
            return
        }

        synchronized(audioTrackLock) {
            val track = getOrCreateAudioTrack()
            if (track == null || track.state != AudioTrack.STATE_INITIALIZED) {
                call.reject("AudioTrack is uninitialized or unavailable")
                return
            }

            try {
                if (track.playState != AudioTrack.PLAYSTATE_PLAYING) {
                    track.play()
                }

                val written = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    track.write(pcmBytes, 0, pcmBytes.size, AudioTrack.WRITE_BLOCKING)
                } else {
                    track.write(pcmBytes, 0, pcmBytes.size)
                }

                if (written < 0) {
                    val errMsg = when (written) {
                        AudioTrack.ERROR_INVALID_OPERATION -> "AudioTrack write ERROR_INVALID_OPERATION"
                        AudioTrack.ERROR_BAD_VALUE -> "AudioTrack write ERROR_BAD_VALUE"
                        AudioTrack.ERROR_DEAD_OBJECT -> "AudioTrack write ERROR_DEAD_OBJECT"
                        else -> "AudioTrack write error code: $written"
                    }
                    Log.e(TAG, errMsg)
                    call.reject(errMsg)
                    return
                }

                notifyListeners("audioPlaybackState", JSObject().apply {
                    put("state", "playing")
                    put("bytesWritten", written)
                })

                call.resolve(JSObject().apply {
                    put("success", true)
                    put("status", "PLAYING")
                    put("bytesWritten", written)
                })
            } catch (e: Exception) {
                Log.e(TAG, "AudioTrack write exception: ${e.message}", e)
                call.reject("Audio playback write error: ${e.message}")
            }
        }
    }

    private fun internalStopAudioPlayback() {
        synchronized(audioTrackLock) {
            try {
                audioTrack?.pause()
                audioTrack?.flush()
                audioTrack?.stop()
            } catch (e: Exception) {
                Log.w(TAG, "AudioTrack pause/stop warning: ${e.message}")
            } finally {
                try {
                    audioTrack?.release()
                } catch (_: Exception) {}
                audioTrack = null
            }

            // Abandon audio focus
            try {
                val am = context.getSystemService(Context.AUDIO_SERVICE) as? AudioManager
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    audioFocusRequest?.let { am?.abandonAudioFocusRequest(it) }
                } else {
                    @Suppress("DEPRECATION")
                    am?.abandonAudioFocus(null)
                }
            } catch (_: Exception) {}

            notifyListeners("audioPlaybackState", JSObject().apply {
                put("state", "stopped")
                put("completed", true)
            })
        }
    }

    @PluginMethod
    fun stopAudioPlayback(call: PluginCall) {
        internalStopAudioPlayback()
        call.resolve(JSObject().apply {
            put("success", true)
            put("status", "STOPPED")
        })
    }

    fun internalStopAllAudio() {
        internalStopAudioCapture()
        internalStopAudioPlayback()
    }

    @PluginMethod
    fun getAudioStatus(call: PluginCall) {
        val ret = JSObject()
        ret.put("isRecording", isRecording.get())
        ret.put("isAudioTrackInitialized", audioTrack?.state == AudioTrack.STATE_INITIALIZED)
        ret.put("audioTrackPlayState", audioTrack?.playState ?: 0)
        ret.put("sampleRate", PLAY_SAMPLE_RATE)
        ret.put(
            "status",
            if (audioTrack?.playState == AudioTrack.PLAYSTATE_PLAYING) "PLAYING"
            else if (isRecording.get()) "RECORDING"
            else "IDLE"
        )
        call.resolve(ret)
    }

    @PluginMethod
    fun getBackgroundServiceStatus(call: PluginCall) {
        val ret = JSObject()
        ret.put("running", MayaForegroundService.isRunning)
        ret.put("status", if (MayaForegroundService.isRunning) "RUNNING" else "STOPPED")
        call.resolve(ret)
    }

    @PluginMethod
    fun startMayaService(call: PluginCall) {
        startForegroundService(call)
    }

    @PluginMethod
    fun stopMayaService(call: PluginCall) {
        stopForegroundService(call)
    }

    // -------------------------------------------------------------
    // REAL ANDROID PERMISSIONS INSPECTION FOR ALL 13 PERMISSIONS
    // -------------------------------------------------------------
    @PluginMethod
    fun checkAllPermissions(call: PluginCall) {
        val ret = JSObject()

        // 1. Microphone
        val mic = ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED
        ret.put("microphone", mic)

        // 2. Notifications
        val notif = NotificationManagerCompat.from(context).areNotificationsEnabled()
        ret.put("notifications", notif)

        // 3. Overlay / Display Over Apps
        val overlay = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Settings.canDrawOverlays(context)
        } else {
            true
        }
        ret.put("overlay", overlay)

        // 4. Accessibility Service
        val accessibility = isAccessibilityServiceEnabled()
        ret.put("accessibility", accessibility)

        // 5. Battery Optimization
        val powerManager = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
        val batteryIgnored = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && powerManager != null) {
            powerManager.isIgnoringBatteryOptimizations(context.packageName)
        } else {
            false
        }
        ret.put("battery", batteryIgnored)

        // 6. Location
        val location = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
        ret.put("location", location)

        // 7. Camera
        val camera = ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED
        ret.put("camera", camera)

        // 8. Storage / Media
        val storage = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            ContextCompat.checkSelfPermission(context, Manifest.permission.READ_MEDIA_AUDIO) == PackageManager.PERMISSION_GRANTED
        } else {
            ContextCompat.checkSelfPermission(context, Manifest.permission.READ_EXTERNAL_STORAGE) == PackageManager.PERMISSION_GRANTED
        }
        ret.put("storage", storage)

        // 9. Contacts
        val contacts = ContextCompat.checkSelfPermission(context, Manifest.permission.READ_CONTACTS) == PackageManager.PERMISSION_GRANTED
        ret.put("contacts", contacts)

        // 10. Phone
        val phone = ContextCompat.checkSelfPermission(context, Manifest.permission.CALL_PHONE) == PackageManager.PERMISSION_GRANTED
        ret.put("phone", phone)

        // 11. SMS
        val sms = ContextCompat.checkSelfPermission(context, Manifest.permission.SEND_SMS) == PackageManager.PERMISSION_GRANTED
        ret.put("sms", sms)

        // 12. Notification Access (Listener Service)
        val notifPackages = NotificationManagerCompat.getEnabledListenerPackages(context)
        val notifAccess = notifPackages.contains(context.packageName)
        ret.put("notificationAccess", notifAccess)

        // 13. Default Digital Assistant
        val isDefaultAssistant = checkDefaultAssistant()
        ret.put("defaultAssistant", isDefaultAssistant)

        call.resolve(ret)
    }

    private fun isAccessibilityServiceEnabled(): Boolean {
        if (MayaAccessibilityService.isServiceRunning) return true
        try {
            val enabledServices = Settings.Secure.getString(
                context.contentResolver,
                Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
            )
            if (!enabledServices.isNullOrEmpty()) {
                val colonSplitter = android.text.TextUtils.SimpleStringSplitter(':')
                colonSplitter.setString(enabledServices)
                val expectedComponentName = "${context.packageName}/${MayaAccessibilityService::class.java.name}"
                val expectedShortName = "${context.packageName}/.MayaAccessibilityService"
                while (colonSplitter.hasNext()) {
                    val componentName = colonSplitter.next()
                    if (componentName.equals(expectedComponentName, ignoreCase = true) ||
                        componentName.equals(expectedShortName, ignoreCase = true) ||
                        (componentName.contains(context.packageName) && componentName.contains("Accessibility", ignoreCase = true))) {
                        return true
                    }
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "Error checking accessibility service status: ${e.message}")
        }
        return false
    }

    private fun checkDefaultAssistant(): Boolean {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                val roleManager = context.getSystemService(Context.ROLE_SERVICE) as? RoleManager
                if (roleManager != null && roleManager.isRoleAvailable(RoleManager.ROLE_ASSISTANT)) {
                    return roleManager.isRoleHeld(RoleManager.ROLE_ASSISTANT)
                }
            }
            val defaultAssistant = Settings.Secure.getString(context.contentResolver, "voice_interaction_service")
            return !defaultAssistant.isNullOrEmpty() && defaultAssistant.contains(context.packageName)
        } catch (e: Exception) {
            return false
        }
    }

    @PermissionCallback
    private fun permissionCallback(call: PluginCall) {
        val permissionName = call.getString("name") ?: "microphone"
        val state = getPermissionState(permissionName)
        val isGranted = (state == PermissionState.GRANTED)
        val isDenied = (state == PermissionState.DENIED)
        val isPromptWithRationale = (state == PermissionState.PROMPT_WITH_RATIONALE)

        Log.i(TAG, "Native PermissionCallback for '$permissionName': state=$state, granted=$isGranted")

        call.resolve(JSObject().apply {
            put("success", isGranted)
            put("granted", isGranted)
            put("denied", isDenied)
            put("permanentlyDenied", isDenied && !isPromptWithRationale)
            put("state", state.toString().lowercase())
        })
    }

    @PluginMethod
    fun requestSystemPermission(call: PluginCall) {
        val permissionName = call.getString("name") ?: ""
        try {
            when (permissionName) {
                "microphone" -> {
                    if (ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
                        call.resolve(JSObject().apply {
                            put("success", true)
                            put("granted", true)
                            put("state", "granted")
                        })
                        return
                    }
                    requestPermissionForAlias("microphone", call, "permissionCallback")
                }
                "notifications" -> {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                        if (ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) {
                            call.resolve(JSObject().apply {
                                put("success", true)
                                put("granted", true)
                                put("state", "granted")
                            })
                            return
                        }
                        requestPermissionForAlias("notifications", call, "permissionCallback")
                    } else {
                        val enabled = NotificationManagerCompat.from(context).areNotificationsEnabled()
                        if (enabled) {
                            call.resolve(JSObject().apply {
                                put("success", true)
                                put("granted", true)
                                put("state", "granted")
                            })
                        } else {
                            val intent = Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).apply {
                                putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)
                                flags = Intent.FLAG_ACTIVITY_NEW_TASK
                            }
                            context.startActivity(intent)
                            call.resolve(JSObject().apply {
                                put("success", false)
                                put("granted", false)
                                put("openedSettings", true)
                            })
                        }
                    }
                }
                "accessibility" -> {
                    if (isAccessibilityServiceEnabled()) {
                        call.resolve(JSObject().apply {
                            put("success", true)
                            put("granted", true)
                            put("state", "granted")
                        })
                    } else {
                        val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).apply {
                            flags = Intent.FLAG_ACTIVITY_NEW_TASK
                        }
                        context.startActivity(intent)
                        call.resolve(JSObject().apply {
                            put("success", false)
                            put("granted", false)
                            put("openedSettings", true)
                        })
                    }
                }
                "overlay" -> {
                    val canDraw = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                        Settings.canDrawOverlays(context)
                    } else {
                        true
                    }
                    if (canDraw) {
                        call.resolve(JSObject().apply {
                            put("success", true)
                            put("granted", true)
                            put("state", "granted")
                        })
                    } else {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                            val intent = Intent(
                                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                                Uri.parse("package:${context.packageName}")
                            ).apply { flags = Intent.FLAG_ACTIVITY_NEW_TASK }
                            context.startActivity(intent)
                        }
                        call.resolve(JSObject().apply {
                            put("success", false)
                            put("granted", false)
                            put("openedSettings", true)
                        })
                    }
                }
                "location" -> {
                    if (ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
                        call.resolve(JSObject().apply { put("success", true); put("granted", true); put("state", "granted") })
                        return
                    }
                    requestPermissionForAlias("location", call, "permissionCallback")
                }
                "camera" -> {
                    if (ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
                        call.resolve(JSObject().apply { put("success", true); put("granted", true); put("state", "granted") })
                        return
                    }
                    requestPermissionForAlias("camera", call, "permissionCallback")
                }
                "contacts" -> {
                    if (ContextCompat.checkSelfPermission(context, Manifest.permission.READ_CONTACTS) == PackageManager.PERMISSION_GRANTED) {
                        call.resolve(JSObject().apply { put("success", true); put("granted", true); put("state", "granted") })
                        return
                    }
                    requestPermissionForAlias("contacts", call, "permissionCallback")
                }
                "phone" -> {
                    if (ContextCompat.checkSelfPermission(context, Manifest.permission.CALL_PHONE) == PackageManager.PERMISSION_GRANTED) {
                        call.resolve(JSObject().apply { put("success", true); put("granted", true); put("state", "granted") })
                        return
                    }
                    requestPermissionForAlias("phone", call, "permissionCallback")
                }
                "sms" -> {
                    if (ContextCompat.checkSelfPermission(context, Manifest.permission.SEND_SMS) == PackageManager.PERMISSION_GRANTED) {
                        call.resolve(JSObject().apply { put("success", true); put("granted", true); put("state", "granted") })
                        return
                    }
                    requestPermissionForAlias("sms", call, "permissionCallback")
                }
                "battery" -> {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                        val pm = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
                        if (pm != null && pm.isIgnoringBatteryOptimizations(context.packageName)) {
                            call.resolve(JSObject().apply { put("success", true); put("granted", true); put("state", "granted") })
                            return
                        }
                        val intent = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS).apply {
                            flags = Intent.FLAG_ACTIVITY_NEW_TASK
                        }
                        context.startActivity(intent)
                    }
                    call.resolve(JSObject().apply { put("success", false); put("openedSettings", true) })
                }
                "notificationAccess" -> {
                    val notifPackages = NotificationManagerCompat.getEnabledListenerPackages(context)
                    if (notifPackages.contains(context.packageName)) {
                        call.resolve(JSObject().apply { put("success", true); put("granted", true) })
                        return
                    }
                    val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).apply {
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK
                    }
                    context.startActivity(intent)
                    call.resolve(JSObject().apply { put("success", false); put("openedSettings", true) })
                }
                "defaultAssistant" -> {
                    val isAssistant = checkDefaultAssistant()
                    if (isAssistant) {
                        call.resolve(JSObject().apply { put("success", true); put("granted", true) })
                        return
                    }
                    val intent = Intent(Settings.ACTION_VOICE_INPUT_SETTINGS).apply {
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK
                    }
                    context.startActivity(intent)
                    call.resolve(JSObject().apply { put("success", false); put("openedSettings", true) })
                }
                else -> {
                    openAppSettings(call)
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to request permission $permissionName: ${e.message}", e)
            call.reject("Permission request error: ${e.message}")
        }
    }

    @PluginMethod
    fun openAppSettings(call: PluginCall) {
        try {
            val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                data = Uri.fromParts("package", context.packageName, null)
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            context.startActivity(intent)
            call.resolve(JSObject().apply { put("success", true) })
        } catch (e: Exception) {
            Log.e(TAG, "Failed to open app settings: ${e.message}", e)
            call.reject("Failed to open app settings: ${e.message}")
        }
    }

    // -------------------------------------------------------------
    // ACCESSIBILITY & PHONE CONTROL METHODS
    // -------------------------------------------------------------
    @PluginMethod
    fun isAccessibilityEnabled(call: PluginCall) {
        val enabled = isAccessibilityServiceEnabled()
        call.resolve(JSObject().apply { put("enabled", enabled) })
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
        call.resolve(JSObject().apply { put("granted", granted) })
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
        val target = call.getString("packageName") ?: call.getString("appName") ?: call.getString("target") ?: ""
        if (target.isBlank()) {
            call.reject("Application name or package name is required")
            return
        }

        val pm = context.packageManager

        // Common aliases mapping for instant match
        val aliases = mapOf(
            "youtube" to "com.google.android.youtube",
            "yt" to "com.google.android.youtube",
            "whatsapp" to "com.whatsapp",
            "chrome" to "com.android.chrome",
            "browser" to "com.android.chrome",
            "instagram" to "com.instagram.android",
            "insta" to "com.instagram.android",
            "camera" to "com.android.camera",
            "settings" to "com.android.settings",
            "gallery" to "com.google.android.apps.photos",
            "photos" to "com.google.android.apps.photos",
            "gmail" to "com.google.android.gm",
            "email" to "com.google.android.gm",
            "maps" to "com.google.android.apps.maps",
            "play store" to "com.android.vending",
            "playstore" to "com.android.vending",
            "spotify" to "com.spotify.music",
            "clock" to "com.google.android.deskclock",
            "calculator" to "com.google.android.calculator",
            "contacts" to "com.google.android.contacts",
            "dialer" to "com.google.android.dialer",
            "phone" to "com.google.android.dialer",
            "messages" to "com.google.android.apps.messaging",
            "telegram" to "org.telegram.messenger",
            "facebook" to "com.facebook.katana",
            "snapchat" to "com.snapchat.android",
            "twitter" to "com.twitter.android",
            "x" to "com.twitter.android"
        )

        val normalized = target.trim().lowercase()
        var resolvedPackage = aliases[normalized] ?: target.trim()

        // 1. Direct package check
        var launchIntent = pm.getLaunchIntentForPackage(resolvedPackage)
        var resolvedAppName = ""

        // 2. If direct lookup failed, search installed launcher apps by title/label
        if (launchIntent == null) {
            val mainIntent = Intent(Intent.ACTION_MAIN, null).apply {
                addCategory(Intent.CATEGORY_LAUNCHER)
            }
            val appList = pm.queryIntentActivities(mainIntent, 0)
            
            // Exact label match
            var match = appList.firstOrNull {
                it.loadLabel(pm).toString().trim().equals(target, ignoreCase = true)
            }
            // Contains label match
            if (match == null) {
                match = appList.firstOrNull {
                    it.loadLabel(pm).toString().trim().lowercase().contains(normalized)
                }
            }
            // Package name contains match
            if (match == null) {
                match = appList.firstOrNull {
                    it.activityInfo.packageName.lowercase().contains(normalized)
                }
            }

            if (match != null) {
                resolvedPackage = match.activityInfo.packageName
                resolvedAppName = match.loadLabel(pm).toString()
                launchIntent = pm.getLaunchIntentForPackage(resolvedPackage)
            }
        }

        if (launchIntent != null) {
            launchIntent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
            context.startActivity(launchIntent)
            call.resolve(JSObject().apply {
                put("success", true)
                put("packageName", resolvedPackage)
                put("appName", resolvedAppName)
            })
        } else {
            call.reject("Application '$target' is not installed or cannot be opened")
        }
    }

    @PluginMethod
    fun controlMedia(call: PluginCall) {
        val command = call.getString("command")?.trim()?.lowercase() ?: "playpause"
        val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as? android.media.AudioManager
        if (audioManager == null) {
            call.reject("AudioManager not available")
            return
        }

        try {
            when (command) {
                "play" -> {
                    audioManager.dispatchMediaKeyEvent(android.view.KeyEvent(android.view.KeyEvent.ACTION_DOWN, android.view.KeyEvent.KEYCODE_MEDIA_PLAY))
                    audioManager.dispatchMediaKeyEvent(android.view.KeyEvent(android.view.KeyEvent.ACTION_UP, android.view.KeyEvent.KEYCODE_MEDIA_PLAY))
                }
                "pause" -> {
                    audioManager.dispatchMediaKeyEvent(android.view.KeyEvent(android.view.KeyEvent.ACTION_DOWN, android.view.KeyEvent.KEYCODE_MEDIA_PAUSE))
                    audioManager.dispatchMediaKeyEvent(android.view.KeyEvent(android.view.KeyEvent.ACTION_UP, android.view.KeyEvent.KEYCODE_MEDIA_PAUSE))
                }
                "playpause", "toggle" -> {
                    audioManager.dispatchMediaKeyEvent(android.view.KeyEvent(android.view.KeyEvent.ACTION_DOWN, android.view.KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE))
                    audioManager.dispatchMediaKeyEvent(android.view.KeyEvent(android.view.KeyEvent.ACTION_UP, android.view.KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE))
                }
                "next", "skip" -> {
                    audioManager.dispatchMediaKeyEvent(android.view.KeyEvent(android.view.KeyEvent.ACTION_DOWN, android.view.KeyEvent.KEYCODE_MEDIA_NEXT))
                    audioManager.dispatchMediaKeyEvent(android.view.KeyEvent(android.view.KeyEvent.ACTION_UP, android.view.KeyEvent.KEYCODE_MEDIA_NEXT))
                }
                "previous", "prev" -> {
                    audioManager.dispatchMediaKeyEvent(android.view.KeyEvent(android.view.KeyEvent.ACTION_DOWN, android.view.KeyEvent.KEYCODE_MEDIA_PREVIOUS))
                    audioManager.dispatchMediaKeyEvent(android.view.KeyEvent(android.view.KeyEvent.ACTION_UP, android.view.KeyEvent.KEYCODE_MEDIA_PREVIOUS))
                }
                "volumeup", "volume_up" -> {
                    audioManager.adjustStreamVolume(android.media.AudioManager.STREAM_MUSIC, android.media.AudioManager.ADJUST_RAISE, android.media.AudioManager.FLAG_SHOW_UI)
                }
                "volumedown", "volume_down" -> {
                    audioManager.adjustStreamVolume(android.media.AudioManager.STREAM_MUSIC, android.media.AudioManager.ADJUST_LOWER, android.media.AudioManager.FLAG_SHOW_UI)
                }
                "mute" -> {
                    audioManager.adjustStreamVolume(android.media.AudioManager.STREAM_MUSIC, android.media.AudioManager.ADJUST_MUTE, android.media.AudioManager.FLAG_SHOW_UI)
                }
                else -> {
                    call.reject("Unsupported media command: $command")
                    return
                }
            }
            call.resolve(JSObject().apply {
                put("success", true)
                put("command", command)
            })
        } catch (e: Exception) {
            call.reject("Media control failed: ${e.message}")
        }
    }

    @PluginMethod
    fun getScreenDetails(call: PluginCall) {
        val service = MayaAccessibilityService.instance
        if (service == null) {
            call.reject("Accessibility Service is not enabled")
            return
        }

        val contentList = service.readScreenContent()
        val pkg = service.getActiveAppPackage()
        val jsArray = JSArray()
        for (item in contentList) {
            jsArray.put(item)
        }
        call.resolve(JSObject().apply {
            put("success", true)
            put("packageName", pkg)
            put("elements", jsArray)
            put("summary", "Active app: $pkg. Visible elements count: ${contentList.size}")
        })
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

        call.resolve(JSObject().apply { put("apps", jsArray) })
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
    fun playYouTube(call: PluginCall) {
        val query = call.getString("query") ?: ""
        try {
            val encoded = java.net.URLEncoder.encode(query, "UTF-8")
            val ytUri = Uri.parse("https://www.youtube.com/results?search_query=$encoded")
            val intent = Intent(Intent.ACTION_VIEW, ytUri).apply {
                setPackage("com.google.android.youtube")
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }

            try {
                context.startActivity(intent)
            } catch (e: Exception) {
                // If YouTube app isn't installed, open default browser
                val browserIntent = Intent(Intent.ACTION_VIEW, ytUri).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                context.startActivity(browserIntent)
            }

            // After YouTube launches, automatically tap first video result to start playing
            android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
                MayaAccessibilityService.instance?.clickFirstYouTubeVideo()
            }, 2300)

            call.resolve(JSObject().apply { put("success", true) })
        } catch (e: Exception) {
            call.reject("Failed to open YouTube: ${e.message}")
        }
    }

    @PluginMethod
    fun autoSkipAd(call: PluginCall) {
        val skipped = MayaAccessibilityService.instance?.autoSkipYouTubeAds() ?: false
        call.resolve(JSObject().apply { put("skipped", skipped) })
    }

    @PluginMethod
    fun makePhoneCall(call: PluginCall) {
        val number = call.getString("number") ?: ""
        if (number.isBlank()) {
            call.reject("Phone number is required")
            return
        }
        try {
            if (ContextCompat.checkSelfPermission(context, Manifest.permission.CALL_PHONE) == PackageManager.PERMISSION_GRANTED) {
                val intent = Intent(Intent.ACTION_CALL, Uri.parse("tel:${Uri.encode(number)}")).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                context.startActivity(intent)
            } else {
                val intent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:${Uri.encode(number)}")).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                context.startActivity(intent)
            }
            call.resolve(JSObject().apply { put("success", true) })
        } catch (e: Exception) {
            call.reject("Call error: ${e.message}")
        }
    }

    @PluginMethod
    fun sendSms(call: PluginCall) {
        val number = call.getString("number") ?: ""
        val message = call.getString("message") ?: ""
        if (number.isBlank() || message.isBlank()) {
            call.reject("Phone number and message are required")
            return
        }
        try {
            if (ContextCompat.checkSelfPermission(context, Manifest.permission.SEND_SMS) == PackageManager.PERMISSION_GRANTED) {
                val smsManager = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    context.getSystemService(android.telephony.SmsManager::class.java)
                } else {
                    android.telephony.SmsManager.getDefault()
                }
                smsManager.sendTextMessage(number, null, message, null, null)
                call.resolve(JSObject().apply { put("success", true); put("sentDirectly", true) })
            } else {
                val intent = Intent(Intent.ACTION_SENDTO, Uri.parse("smsto:${Uri.encode(number)}")).apply {
                    putExtra("sms_body", message)
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                context.startActivity(intent)
                call.resolve(JSObject().apply { put("success", true); put("sentDirectly", false) })
            }
        } catch (e: Exception) {
            call.reject("SMS error: ${e.message}")
        }
    }

    @PluginMethod
    fun sendEmail(call: PluginCall) {
        val to = call.getString("to") ?: ""
        val subject = call.getString("subject") ?: ""
        val body = call.getString("body") ?: ""
        try {
            val mailUri = Uri.parse("mailto:" + Uri.encode(to))
            val intent = Intent(Intent.ACTION_SENDTO, mailUri).apply {
                if (subject.isNotBlank()) putExtra(Intent.EXTRA_SUBJECT, subject)
                if (body.isNotBlank()) putExtra(Intent.EXTRA_TEXT, body)
                setPackage("com.google.android.gm")
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            try {
                context.startActivity(intent)
            } catch (e: Exception) {
                val genericIntent = Intent(Intent.ACTION_SENDTO, mailUri).apply {
                    if (subject.isNotBlank()) putExtra(Intent.EXTRA_SUBJECT, subject)
                    if (body.isNotBlank()) putExtra(Intent.EXTRA_TEXT, body)
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                context.startActivity(genericIntent)
            }
            call.resolve(JSObject().apply { put("success", true) })
        } catch (e: Exception) {
            call.reject("Email error: ${e.message}")
        }
    }

    @PluginMethod
    fun getRecentNotifications(call: PluginCall) {
        val notifs = MayaNotificationListenerService.getRecentList()
        val jsArray = JSArray()
        for (n in notifs) {
            val obj = JSObject().apply {
                put("id", n.id)
                put("packageName", n.packageName)
                put("appName", n.appName)
                put("title", n.title)
                put("text", n.text)
                put("time", n.timeFormatted)
            }
            jsArray.put(obj)
        }
        call.resolve(JSObject().apply { put("notifications", jsArray) })
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
