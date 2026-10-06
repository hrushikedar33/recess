package com.appblocker.modules.systemui

import android.content.Intent
import android.util.Log
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * Two things the Break screen needs from Android: hiding the system bars so it can fill the whole
 * display, and showing the home screen. Both run from the foreground activity, which is what makes
 * Android let the home screen start (a background service is often refused).
 */
class SystemUiModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    override fun getName() = "SystemUiModule"

    /** Hides (true) or shows (false) the status and navigation bars. A swipe from the edge shows them briefly. */
    @ReactMethod
    fun setImmersive(enabled: Boolean, promise: Promise) {
        val activity = currentActivity
        if (activity == null) {
            // Nothing on screen to change; not an error worth reporting.
            promise.resolve(null)
            return
        }
        activity.runOnUiThread {
            try {
                val window = activity.window
                val controller = WindowCompat.getInsetsController(window, window.decorView)
                if (enabled) {
                    controller.systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
                    controller.hide(WindowInsetsCompat.Type.systemBars())
                } else {
                    controller.show(WindowInsetsCompat.Type.systemBars())
                }
                promise.resolve(null)
            } catch (e: Exception) {
                Log.w(TAG, "Could not change the system bars", e)
                promise.reject(ERROR_SYSTEM_UI, e.message, e)
            }
        }
    }

    @ReactMethod
    fun goHome(promise: Promise) {
        val activity = currentActivity
        if (activity == null) {
            promise.reject(ERROR_NO_ACTIVITY, "There is no screen to start the home screen from.")
            return
        }
        try {
            val home =
                Intent(Intent.ACTION_MAIN)
                    .addCategory(Intent.CATEGORY_HOME)
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            activity.startActivity(home)
            promise.resolve(null)
        } catch (e: Exception) {
            Log.w(TAG, "Could not go home", e)
            promise.reject(ERROR_SYSTEM_UI, e.message, e)
        }
    }

    private companion object {
        const val TAG = "Recess"
        const val ERROR_NO_ACTIVITY = "NO_ACTIVITY"
        const val ERROR_SYSTEM_UI = "SYSTEM_UI_ERROR"
    }
}
