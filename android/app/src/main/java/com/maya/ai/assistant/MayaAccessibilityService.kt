package com.maya.ai.assistant

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.GestureDescription
import android.graphics.Path
import android.graphics.Rect
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo

class MayaAccessibilityService : AccessibilityService() {

    companion object {
        private const val TAG = "MayaAccessibility"
        var instance: MayaAccessibilityService? = null
            private set

        val isServiceRunning: Boolean
            get() = instance != null
    }

    private var isStopRequested = false

    override fun onServiceConnected() {
        super.onServiceConnected()
        instance = this
        isStopRequested = false
        Log.i(TAG, "Maya Accessibility Service Connected")
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        // Passive accessibility event listener.
        // Unsolicited automated background clicking (including automatic ad-skipping) is strictly removed.
        // Maya only executes user-requested, explicitly confirmed actions.
    }

    /**
     * Tap first video result in YouTube to automatically start playing the requested song
     */
    fun clickFirstYouTubeVideo(): Boolean {
        val root = rootInActiveWindow ?: return false
        var clicked = false

        fun searchVideoNode(node: AccessibilityNodeInfo?): Boolean {
            if (node == null || clicked) return false
            val viewId = node.viewIdResourceName?.lowercase() ?: ""
            val desc = node.contentDescription?.toString()?.lowercase() ?: ""

            val isVideoItem = (viewId.contains("thumbnail") || viewId.contains("video_info") ||
                    viewId.contains("metadata") || desc.contains("views") || desc.contains("ago") ||
                    desc.contains("duration")) &&
                    (node.isClickable || node.parent?.isClickable == true)

            if (isVideoItem) {
                val targetNode = if (node.isClickable) node else node.parent
                clicked = targetNode?.performAction(AccessibilityNodeInfo.ACTION_CLICK) == true
                if (clicked) {
                    Log.i(TAG, "⚡ Maya clicked first YouTube video to start playing!")
                    return true
                }
            }

            for (i in 0 until node.childCount) {
                if (searchVideoNode(node.getChild(i))) return true
            }
            return false
        }

        searchVideoNode(root)

        if (!clicked) {
            // Coordinate fallback for standard screen top search result
            val displayMetrics = resources.displayMetrics
            val x = displayMetrics.widthPixels * 0.5f
            val y = displayMetrics.heightPixels * 0.38f
            clicked = clickCoordinates(x, y)
        }
        return clicked
    }

    override fun onInterrupt() {
        Log.w(TAG, "Maya Accessibility Service Interrupted")
    }

    override fun onDestroy() {
        super.onDestroy()
        instance = null
        Log.i(TAG, "Maya Accessibility Service Destroyed")
    }

    fun requestStop() {
        isStopRequested = true
    }

    /**
     * Safely obtain the root AccessibilityNodeInfo, checking active window or windows list
     */
    private fun getRootNodeSafe(): AccessibilityNodeInfo? {
        rootInActiveWindow?.let { return it }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            try {
                for (window in windows) {
                    if (window.isFocused || window.type == android.view.accessibility.AccessibilityWindowInfo.TYPE_APPLICATION) {
                        window.root?.let { return it }
                    }
                }
                for (window in windows) {
                    window.root?.let { return it }
                }
            } catch (e: Exception) {
                Log.w(TAG, "Error querying windows: ${e.message}")
            }
        }
        return null
    }

    /**
     * Tap element by visible text, content description, or view ID.
     * Climbs up to clickable parent if target node is not clickable directly.
     */
    fun tapElement(target: String): Boolean {
        if (isStopRequested) return false
        val root = getRootNodeSafe() ?: return false

        val targetLower = target.lowercase().trim()
        val matchingNodes = mutableListOf<AccessibilityNodeInfo>()

        fun findNodes(node: AccessibilityNodeInfo?) {
            if (node == null || isStopRequested) return

            val text = node.text?.toString()?.lowercase() ?: ""
            val desc = node.contentDescription?.toString()?.lowercase() ?: ""
            val viewId = node.viewIdResourceName?.lowercase() ?: ""

            if (text.contains(targetLower) || desc.contains(targetLower) || viewId.contains(targetLower)) {
                matchingNodes.add(node)
            }

            for (i in 0 until node.childCount) {
                findNodes(node.getChild(i))
            }
        }

        findNodes(root)

        for (node in matchingNodes) {
            var curr: AccessibilityNodeInfo? = node
            while (curr != null) {
                if (curr.isClickable) {
                    val success = curr.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                    Log.i(TAG, "Clicked node: target=$target, success=$success")
                    if (success) return true
                }
                curr = curr.parent
            }

            // Fallback: click by node screen coordinates
            val rect = Rect()
            node.getBoundsInScreen(rect)
            val dm = resources.displayMetrics
            if (rect.width() > 0 && rect.height() > 0 &&
                rect.centerX() in 0..dm.widthPixels && rect.centerY() in 0..dm.heightPixels) {
                val clicked = clickCoordinates(rect.centerX().toFloat(), rect.centerY().toFloat())
                if (clicked) {
                    Log.i(TAG, "Clicked coordinates: x=${rect.centerX()}, y=${rect.centerY()}")
                    return true
                }
            }
        }

        return false
    }

    /**
     * Scroll list or screen: supports "down", "up", "left", and "right"
     */
    fun scrollScreen(direction: String): Boolean {
        if (isStopRequested) return false
        val root = getRootNodeSafe()
        val dir = direction.lowercase().trim()

        val isDown = dir == "down"
        val isUp = dir == "up"
        val isLeft = dir == "left"
        val isRight = dir == "right"

        // For vertical scrolling, try node action first
        if (root != null && (isDown || isUp)) {
            val action = if (isDown) AccessibilityNodeInfo.ACTION_SCROLL_FORWARD else AccessibilityNodeInfo.ACTION_SCROLL_BACKWARD
            var targetNode: AccessibilityNodeInfo? = null

            fun findScrollable(node: AccessibilityNodeInfo?) {
                if (node == null || targetNode != null) return
                if (node.isScrollable) {
                    targetNode = node
                    return
                }
                for (i in 0 until node.childCount) {
                    findScrollable(node.getChild(i))
                }
            }

            findScrollable(root)
            val scrolled = targetNode?.performAction(action) ?: false
            if (scrolled) {
                Log.i(TAG, "Scrolled via AccessibilityNodeInfo action: dir=$dir")
                return true
            }
        }

        // Gesture-based scroll fallback (handles down, up, left, right)
        val displayMetrics = resources.displayMetrics
        val width = displayMetrics.widthPixels.toFloat()
        val height = displayMetrics.heightPixels.toFloat()

        return when {
            isDown -> swipeCoordinates(width / 2f, height * 0.75f, width / 2f, height * 0.25f)
            isUp -> swipeCoordinates(width / 2f, height * 0.25f, width / 2f, height * 0.75f)
            isLeft -> swipeCoordinates(width * 0.8f, height / 2f, width * 0.2f, height / 2f)
            isRight -> swipeCoordinates(width * 0.2f, height / 2f, width * 0.8f, height / 2f)
            else -> swipeCoordinates(width / 2f, height * 0.75f, width / 2f, height * 0.25f)
        }
    }

    /**
     * Type text into an active or matching editable field and verify
     */
    fun enterText(text: String, targetField: String? = null): Boolean {
        if (isStopRequested) return false
        val root = getRootNodeSafe() ?: return false

        var targetNode: AccessibilityNodeInfo? = null

        fun findEditable(node: AccessibilityNodeInfo?) {
            if (node == null || targetNode != null) return

            if (node.isEditable) {
                if (targetField.isNullOrBlank()) {
                    targetNode = node
                    return
                } else {
                    val nodeText = node.text?.toString() ?: ""
                    val desc = node.contentDescription?.toString() ?: ""
                    val hint = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) node.hintText?.toString() ?: "" else ""
                    if (nodeText.contains(targetField, true) || desc.contains(targetField, true) || hint.contains(targetField, true)) {
                        targetNode = node
                        return
                    }
                }
            }

            for (i in 0 until node.childCount) {
                findEditable(node.getChild(i))
            }
        }

        findEditable(root)

        // If no specifically focused field was found, find currently focused input
        if (targetNode == null) {
            targetNode = root.findFocus(AccessibilityNodeInfo.FOCUS_INPUT)
        }

        val node = targetNode ?: return false

        // Focus field
        node.performAction(AccessibilityNodeInfo.ACTION_FOCUS)
        val arguments = Bundle().apply {
            putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, text)
        }
        val success = node.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, arguments)
        Log.i(TAG, "Entered text via ACTION_SET_TEXT: success=$success")
        return success
    }

    /**
     * Read all visible text and interactable element labels on screen
     */
    fun readScreenContent(): List<String> {
        val root = getRootNodeSafe() ?: return emptyList()
        val content = mutableListOf<String>()
        val pkg = root.packageName?.toString() ?: ""
        if (pkg.isNotBlank()) {
            content.add("[Active App: $pkg]")
        }

        fun extractText(node: AccessibilityNodeInfo?) {
            if (node == null) return

            val text = node.text?.toString()?.trim()
            val desc = node.contentDescription?.toString()?.trim()

            if (!text.isNullOrBlank()) {
                val type = if (node.isClickable) "[Button/Link]" else if (node.isEditable) "[Input Field]" else ""
                content.add("$type $text".trim())
            } else if (!desc.isNullOrBlank()) {
                val type = if (node.isClickable) "[Button]" else ""
                content.add("$type $desc".trim())
            }

            for (i in 0 until node.childCount) {
                extractText(node.getChild(i))
            }
        }

        extractText(root)
        return content.distinct()
    }

    /**
     * Get active application package name
     */
    fun getActiveAppPackage(): String {
        return getRootNodeSafe()?.packageName?.toString() ?: ""
    }

    private fun clickCoordinates(x: Float, y: Float): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.N) return false
        val path = Path().apply { moveTo(x, y) }
        val stroke = GestureDescription.StrokeDescription(path, 0, 80)
        val gesture = GestureDescription.Builder().addStroke(stroke).build()
        return dispatchGesture(gesture, null, null)
    }

    private fun swipeCoordinates(startX: Float, startY: Float, endX: Float, endY: Float): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.N) return false
        val path = Path().apply {
            moveTo(startX, startY)
            lineTo(endX, endY)
        }
        val stroke = GestureDescription.StrokeDescription(path, 0, 250)
        val gesture = GestureDescription.Builder().addStroke(stroke).build()
        return dispatchGesture(gesture, null, null)
    }
}
