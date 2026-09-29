package com.appblocker.notify

import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.util.Log
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import java.util.concurrent.Callable
import java.util.concurrent.FutureTask
import java.util.concurrent.TimeUnit

/**
 * The full-screen "time's up" screen: the quote and the goals drawn over everything, right after the
 * blocked app was sent home.
 *
 * It is a plain window added by the service (using the "Display over other apps" permission the
 * user already grants for Recess), not an activity. That matters: since Android 10 a background
 * service is often refused when it tries to *start an activity*, so a takeover built on the Break
 * screen could silently fail; adding a window has no such restriction.
 *
 * It never traps the user: there is always a "Go home" button, it goes away by itself after
 * [AUTO_DISMISS_MS] and when the block ends, and it is removed when the service stops.
 */
class TakeoverOverlay(context: Context) {
    private val context = context.applicationContext
    private val main = Handler(Looper.getMainLooper())
    private val windowManager = this.context.getSystemService(Context.WINDOW_SERVICE) as WindowManager
    private val expire = Runnable { removeNow() }

    // Only touched on the main thread.
    private var root: View? = null
    private var shownFor: String? = null

    /** Called from the monitor thread. True if the takeover is now on screen. */
    fun show(packageName: String, message: LimitMessage): Boolean {
        if (!Settings.canDrawOverlays(context)) {
            Log.w(TAG, "Takeover not shown: 'Display over other apps' is not allowed")
            return false
        }
        val shown = onMain { addNow(packageName, message) } ?: false
        Log.i(TAG, if (shown) "Takeover shown" else "Takeover could not be shown")
        return shown
    }

    /** Removes the takeover if it is showing for [packageName] (the block it announced has ended). */
    fun dismiss(packageName: String) {
        main.post { if (shownFor == packageName) removeNow() }
    }

    /** Removes whatever is showing; used when the service stops. */
    fun dismissAll() {
        main.post { removeNow() }
    }

    private fun <T> onMain(block: () -> T): T? {
        if (Looper.myLooper() == Looper.getMainLooper()) return block()
        val task = FutureTask(Callable { block() })
        main.post(task)
        return try {
            task.get(MAIN_THREAD_WAIT_MS, TimeUnit.MILLISECONDS)
        } catch (e: Exception) {
            Log.w(TAG, "Takeover did not run on the main thread", e)
            null
        }
    }

    private fun addNow(packageName: String, message: LimitMessage): Boolean {
        removeNow()
        val view = build(message)
        return try {
            windowManager.addView(view, layoutParams())
            root = view
            shownFor = packageName
            main.postDelayed(expire, AUTO_DISMISS_MS)
            true
        } catch (e: Exception) {
            Log.w(TAG, "Could not add the takeover window", e)
            false
        }
    }

    private fun removeNow() {
        main.removeCallbacks(expire)
        val view = root
        root = null
        shownFor = null
        if (view != null) runCatching { windowManager.removeViewImmediate(view) }
    }

    private fun layoutParams(): WindowManager.LayoutParams {
        val type =
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            } else {
                @Suppress("DEPRECATION")
                WindowManager.LayoutParams.TYPE_PHONE
            }
        return WindowManager.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT,
            type,
            // Not focusable, so it never steals the keyboard or the Back key; still receives touches.
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
                WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS or
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON,
            PixelFormat.OPAQUE,
        ).apply {
            gravity = Gravity.TOP or Gravity.START
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
            }
        }
    }

    private fun build(message: LimitMessage): View {
        val content =
            LinearLayout(context).apply {
                orientation = LinearLayout.VERTICAL
                gravity = Gravity.CENTER_HORIZONTAL
                setPadding(dp(28), dp(96), dp(28), dp(56))
                addView(label(message.title, 26f, Color.WHITE, bold = true))
                addView(label(message.status, 15f, MUTED, topMargin = 10))
                addView(label(message.quote, 21f, Color.WHITE, italic = true, topMargin = 36))
                addView(label(message.goals, 16f, SOFT_WHITE, topMargin = 32))
                addView(button("Go home", primary = true) { goHome() }, buttonParams(topMargin = 44))
                addView(button("Open Recess", primary = false) { openRecess() }, buttonParams(topMargin = 12))
            }
        return ScrollView(context).apply {
            setBackgroundColor(BACKGROUND)
            isFillViewport = true
            addView(content, ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT))
        }
    }

    private fun goHome() {
        removeNow()
        val home =
            Intent(Intent.ACTION_MAIN)
                .addCategory(Intent.CATEGORY_HOME)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        runCatching { context.startActivity(home) }
            .onFailure { Log.w(TAG, "Could not go home from the takeover", it) }
    }

    private fun openRecess() {
        removeNow()
        runCatching { context.startActivity(BreakIntents.intent(context)) }
            .onFailure { Log.w(TAG, "Could not open the Break screen from the takeover", it) }
    }

    private fun label(
        text: String,
        sizeSp: Float,
        color: Int,
        bold: Boolean = false,
        italic: Boolean = false,
        topMargin: Int = 0,
    ) = TextView(context).apply {
        this.text = text
        setTextSize(TypedValue.COMPLEX_UNIT_SP, sizeSp)
        setTextColor(color)
        gravity = Gravity.CENTER_HORIZONTAL
        setLineSpacing(0f, 1.15f)
        setTypeface(
            Typeface.DEFAULT,
            when {
                bold -> Typeface.BOLD
                italic -> Typeface.ITALIC
                else -> Typeface.NORMAL
            },
        )
        layoutParams =
            LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT)
                .apply { this.topMargin = dp(topMargin) }
    }

    private fun button(text: String, primary: Boolean, onClick: () -> Unit) =
        Button(context).apply {
            this.text = text
            isAllCaps = false
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 17f)
            setTextColor(if (primary) Color.BLACK else Color.WHITE)
            background =
                GradientDrawable().apply {
                    cornerRadius = dp(28).toFloat()
                    if (primary) setColor(ACCENT) else setStroke(dp(1), MUTED)
                    if (!primary) setColor(Color.TRANSPARENT)
                }
            setOnClickListener { onClick() }
        }

    private fun buttonParams(topMargin: Int) =
        LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(56)).apply { this.topMargin = dp(topMargin) }

    private fun dp(value: Int): Int = (value * context.resources.displayMetrics.density).toInt()

    private companion object {
        const val TAG = "Recess"
        const val AUTO_DISMISS_MS = 60_000L
        const val MAIN_THREAD_WAIT_MS = 2_000L
        val BACKGROUND = Color.parseColor("#101418")
        val ACCENT = Color.parseColor("#7BD3C3")
        val MUTED = Color.parseColor("#9AA5B1")
        val SOFT_WHITE = Color.parseColor("#E6E9ED")
    }
}
