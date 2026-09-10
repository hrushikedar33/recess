package com.appblocker.modules.applist

import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.drawable.Drawable
import android.util.Base64
import com.facebook.react.bridge.*
import java.io.ByteArrayOutputStream

class AppListModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "AppListModule"

    private fun drawableToBase64(drawable: Drawable): String? {
        return try {
            val width = if (drawable.intrinsicWidth > 0) Math.min(drawable.intrinsicWidth, 96) else 96
            val height = if (drawable.intrinsicHeight > 0) Math.min(drawable.intrinsicHeight, 96) else 96
            val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
            val canvas = Canvas(bitmap)
            drawable.setBounds(0, 0, canvas.width, canvas.height)
            drawable.draw(canvas)

            val outputStream = ByteArrayOutputStream()
            bitmap.compress(Bitmap.CompressFormat.PNG, 85, outputStream)
            val byteArray = outputStream.toByteArray()
            "data:image/png;base64," + Base64.encodeToString(byteArray, Base64.NO_WRAP)
        } catch (e: Exception) {
            null
        }
    }

    /**
     * Get base64 icon for a specific package name.
     */
    @ReactMethod
    fun getAppIcon(packageName: String, promise: Promise) {
        Thread {
            try {
                val pm = reactContext.packageManager
                val drawable = pm.getApplicationIcon(packageName)
                val base64 = drawableToBase64(drawable)
                promise.resolve(base64)
            } catch (e: Exception) {
                promise.resolve(null)
            }
        }.start()
    }

    /**
     * Returns a list of all installed apps that have a launcher icon
     * (i.e. apps the user can open). Each entry has:
     *   - packageName: String
     *   - appName: String
     *   - iconBase64: String
     */
    @ReactMethod
    fun getInstalledApps(promise: Promise) {
        Thread {
            try {
                val pm = reactContext.packageManager
                val launcherIntent = Intent(Intent.ACTION_MAIN, null).apply {
                    addCategory(Intent.CATEGORY_LAUNCHER)
                }

                val activities = pm.queryIntentActivities(launcherIntent, 0)
                val result = Arguments.createArray()

                // Exclude our own app
                val ownPackage = reactContext.packageName

                activities
                    .filter { it.activityInfo.packageName != ownPackage }
                    .sortedBy { it.loadLabel(pm).toString().lowercase() }
                    .forEach { resolveInfo ->
                        val app = Arguments.createMap().apply {
                            putString("packageName", resolveInfo.activityInfo.packageName)
                            putString("appName", resolveInfo.loadLabel(pm).toString())
                            val iconStr = drawableToBase64(resolveInfo.loadIcon(pm))
                            if (iconStr != null) {
                                putString("iconBase64", iconStr)
                            }
                        }
                        result.pushMap(app)
                    }

                promise.resolve(result)
            } catch (e: Exception) {
                promise.reject("APP_LIST_ERROR", e.message)
            }
        }.start()
    }
}