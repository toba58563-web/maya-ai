package com.maya.ai.assistant

import android.os.Bundle
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        registerPlugin(MayaPhoneControlPlugin::class.java)
        super.onCreate(savedInstanceState)
    }
}
