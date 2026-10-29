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
        // Track state changes if needed
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
     * Tap element by visible text, content description, or view ID.
     * Climbs up to clickable parent if target node is not clickable directly.
     */
    fun tapElement(target: String): Boolean {
        if (isStopRequested) return false
        val root = rootInActiveWindow ?: return false

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
                    return success
                }
                curr = curr.parent
            }

            // Fallback: click by node screen coordinates
            val rect = Rect()
            node.getBoundsInScreen(rect)
            if (rect.width() > 0 && rect.height() > 0) {
                return clickCoordinates(rect.centerX().toFloat(), rect.centerY().toFloat())
            }
        }

        return false
    }

    /**
     * Scroll list or screen up or down
     */
    fun scrollScreen(direction: String): Boolean {
        if (isStopRequested) return false
        val root = rootInActiveWindow ?: return false

        val isDown = direction.equals("down", ignoreCase = true)
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

        return targetNode?.performAction(action) ?: run {
            // Fallback scroll gesture
            val displayMetrics = resources.displayMetrics
            val width = displayMetrics.widthPixels.toFloat()
            val height = displayMetrics.heightPixels.toFloat()
            val startY = if (isDown) height * 0.75f else height * 0.25f
            val endY = if (isDown) height * 0.25f else height * 0.75f
            swipeCoordinates(width / 2f, startY, width / 2f, endY)
        }
    }

    /**
     * Type text into an active or matching editable field
     */
    fun enterText(text: String, targetField: String? = null): Boolean {
        if (isStopRequested) return false
        val root = rootInActiveWindow ?: return false

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

        // Focus and set text
        node.performAction(AccessibilityNodeInfo.ACTION_FOCUS)
        val arguments = Bundle().apply {
            putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, text)
        }
        val success = node.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, arguments)
        Log.i(TAG, "Entered text: success=$success")
        return success
    }

    /**
     * Read all visible text and interactable element labels on screen
     */
    fun readScreenContent(): List<String> {
        val root = rootInActiveWindow ?: return emptyList()
        val content = mutableListOf<String>()

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
        val stroke = GestureDescription.StrokeDescription(path, 0, 300)
        val gesture = GestureDescription.Builder().addStroke(stroke).build()
        return dispatchGesture(gesture, null, null)
    }
}
