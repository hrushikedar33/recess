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
import android.util.DisplayMetrics
import android.util.Log
import android.util.TypedValue
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.view.animation.DecelerateInterpolator
import android.widget.Button
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import androidx.core.content.ContextCompat
import androidx.core.graphics.ColorUtils
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import com.appblocker.R
import java.util.concurrent.Callable
import java.util.concurrent.FutureTask
import java.util.concurrent.TimeUnit

/**
 * The full-screen cover for a blocked app: the quote and the goals drawn over everything, so the
 * app cannot be used until its cooldown ends.
 *
 * It is a plain window added by the service (using the "Display over other apps" permission the
 * user already grants for Recess), not an activity. That matters: many phones refuse to let a
 * background service *start an activity* (including the home screen), so anything built on that
 * silently fails; adding a window has no such restriction.
 *
 * It is shown when the limit is hit and again whenever the blocked app comes to the front during the
 * block, and it lifts as soon as another app (the home screen, say) is in front, when the block
 * ends, and when the service stops. It never traps the user: the Home button always works, there is
 * a "Go home" button, and it drops itself after [AUTO_DISMISS_MS] (if the app is still blocked and
 * in front it simply comes back on the next tick).
 */
class TakeoverOverlay(context: Context) {
    private val context = context.applicationContext
    private val main = Handler(Looper.getMainLooper())
    private val windowManager = this.context.getSystemService(Context.WINDOW_SERVICE) as WindowManager
    private val expire = Runnable { removeNow() }

    // Only changed on the main thread; read from the monitor thread.
    private var root: View? = null

    @Volatile
    private var shownFor: String? = null

    fun isShowingFor(packageName: String): Boolean = shownFor == packageName

    /** The app in front changed: lift the cover once it is no longer the blocked app. */
    fun onForeground(packageName: String?) {
        val covered = shownFor ?: return
        if (packageName == covered) return
        main.post { if (shownFor == covered) removeNow() }
    }

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
        val built = build(message)
        return try {
            windowManager.addView(built.root, layoutParams())
            root = built.root
            shownFor = packageName
            main.postDelayed(expire, AUTO_DISMISS_MS)
            playEntrance(built)
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

    /**
     * Sized from the real display rather than "match parent": on some phones a match-parent overlay
     * stops short of the navigation/gesture area and the app shows through as a strip along the
     * bottom. No-limits layout lets the window run under the system bars and the display cutout.
     */
    private fun layoutParams(): WindowManager.LayoutParams {
        val type =
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            } else {
                @Suppress("DEPRECATION")
                WindowManager.LayoutParams.TYPE_PHONE
            }
        val (width, height) = displaySize()
        return WindowManager.LayoutParams(
            width,
            height,
            type,
            // Not focusable, so it never steals the keyboard or the Back key; still receives touches.
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
                WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS or
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON,
            PixelFormat.OPAQUE,
        ).apply {
            gravity = Gravity.TOP or Gravity.START
            x = 0
            y = 0
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_ALWAYS
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
            }
        }
    }

    /** The whole physical display in pixels, system bars and cutout included. */
    private fun displaySize(): Pair<Int, Int> {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            val bounds = windowManager.maximumWindowMetrics.bounds
            return bounds.width() to bounds.height()
        }
        val metrics = DisplayMetrics()
        @Suppress("DEPRECATION")
        windowManager.defaultDisplay.getRealMetrics(metrics)
        return metrics.widthPixels to metrics.heightPixels
    }

    private class Built(val root: FrameLayout, val content: View)

    private fun build(message: LimitMessage): Built {
        val content =
            LinearLayout(context).apply {
                orientation = LinearLayout.VERTICAL
                gravity = Gravity.CENTER_HORIZONTAL
                setPadding(dp(24), dp(72), dp(24), dp(40))
                addView(
                    label(context.getString(R.string.cover_emoji), 56f, R.color.recess_text_primary).apply {
                        importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO
                    },
                )
                addView(label(message.title, 30f, R.color.recess_text_primary, family = FAMILY_HEAVY, topMargin = 8))
                addView(label(message.status, 15f, R.color.recess_text_secondary, topMargin = 8))
                addView(
                    card(
                        label(message.quote, 21f, R.color.recess_text_primary, family = FAMILY_BODY, italic = true),
                    ),
                    cardParams(topMargin = 28),
                )
                addView(
                    card(label(message.goals, 16f, R.color.recess_text_primary, gravity = Gravity.START)),
                    cardParams(topMargin = 12),
                )
                addView(
                    button(context.getString(R.string.cover_go_home), primary = true) { goHome() },
                    buttonParams(topMargin = 28),
                )
                addView(
                    button(context.getString(R.string.cover_open_recess), primary = false) { openRecess() },
                    buttonParams(topMargin = 12),
                )
            }
        val scroll =
            ScrollView(context).apply {
                isFillViewport = true
                isVerticalScrollBarEnabled = false
                clipToPadding = false
                addView(
                    content,
                    ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT),
                )
            }
        val root =
            FrameLayout(context).apply {
                setBackgroundColor(color(R.color.recess_canvas))
                addView(glow(R.color.recess_blocked), glowParams(Gravity.TOP or Gravity.END))
                addView(glow(R.color.recess_primary), glowParams(Gravity.BOTTOM or Gravity.START))
                addView(scroll, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
            }
        // Keep the content clear of the status bar, display cutout and gesture area, while the
        // background still runs edge to edge.
        ViewCompat.setOnApplyWindowInsetsListener(root) { _, insets ->
            val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout())
            content.setPadding(dp(24) + bars.left, dp(48) + bars.top, dp(24) + bars.right, dp(32) + bars.bottom)
            insets
        }
        return Built(root, content)
    }

    /** A short fade-and-rise, skipped when the user has turned system animations off. */
    private fun playEntrance(built: Built) {
        val scale = Settings.Global.getFloat(context.contentResolver, Settings.Global.ANIMATOR_DURATION_SCALE, 1f)
        if (scale == 0f) return
        built.root.alpha = 0f
        built.content.translationY = dp(24).toFloat()
        built.root.animate().alpha(1f).setDuration(ENTRANCE_MS).start()
        built.content.animate().translationY(0f).setDuration(ENTRANCE_MS).setInterpolator(DecelerateInterpolator()).start()
        ViewCompat.requestApplyInsets(built.root)
    }

    private fun glow(colorRes: Int): View =
        View(context).apply {
            background =
                GradientDrawable().apply {
                    gradientType = GradientDrawable.RADIAL_GRADIENT
                    gradientRadius = dp(GLOW_DP / 2).toFloat()
                    colors = intArrayOf(ColorUtils.setAlphaComponent(color(colorRes), GLOW_ALPHA), Color.TRANSPARENT)
                }
            importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO
        }

    private fun glowParams(gravity: Int) =
        FrameLayout.LayoutParams(dp(GLOW_DP), dp(GLOW_DP), gravity).apply {
            val offset = -dp(GLOW_DP / 3)
            setMargins(offset, offset, offset, offset)
        }

    private fun card(child: View) =
        FrameLayout(context).apply {
            setPadding(dp(20), dp(18), dp(20), dp(18))
            background =
                GradientDrawable().apply {
                    cornerRadius = dp(20).toFloat()
                    setColor(color(R.color.recess_surface))
                    setStroke(dp(1), color(R.color.recess_border))
                }
            addView(child)
        }

    private fun cardParams(topMargin: Int) =
        LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT)
            .apply { this.topMargin = dp(topMargin) }

    /*
     * Both buttons start the launch BEFORE taking the window down. A background service may only
     * start an activity while it has a visible window (the system log says
     * BAL_ALLOW_NON_APP_VISIBLE_WINDOW when that is what let it through); removing the window first
     * made the launch get refused, so the app stayed in front and the cover popped straight back.
     */
    private fun goHome() {
        val home =
            Intent(Intent.ACTION_MAIN)
                .addCategory(Intent.CATEGORY_HOME)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        launchThenRemove(home, "go home")
    }

    private fun openRecess() = launchThenRemove(BreakIntents.intent(context), "open the Break screen")

    private fun launchThenRemove(intent: Intent, what: String) {
        runCatching { context.startActivity(intent) }
            .onFailure { Log.w(TAG, "Could not $what from the takeover", it) }
        removeNow()
    }

    private fun label(
        text: String,
        sizeSp: Float,
        colorRes: Int,
        family: String = FAMILY_BODY,
        italic: Boolean = false,
        gravity: Int = Gravity.CENTER_HORIZONTAL,
        topMargin: Int = 0,
    ) = TextView(context).apply {
        this.text = text
        setTextSize(TypedValue.COMPLEX_UNIT_SP, sizeSp)
        setTextColor(color(colorRes))
        this.gravity = gravity
        setLineSpacing(0f, 1.15f)
        typeface = Typeface.create(family, if (italic) Typeface.ITALIC else Typeface.NORMAL)
        layoutParams =
            LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT)
                .apply { this.topMargin = dp(topMargin) }
    }

    private fun button(text: String, primary: Boolean, onClick: () -> Unit) =
        Button(context).apply {
            this.text = text
            isAllCaps = false
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 17f)
            typeface = Typeface.create(FAMILY_HEAVY, Typeface.NORMAL)
            setTextColor(color(if (primary) R.color.recess_on_primary else R.color.recess_text_primary))
            stateListAnimator = null
            background =
                GradientDrawable().apply {
                    cornerRadius = dp(28).toFloat()
                    if (primary) {
                        setColor(color(R.color.recess_primary))
                    } else {
                        setColor(Color.TRANSPARENT)
                        setStroke(dp(1), color(R.color.recess_border))
                    }
                }
            setOnClickListener { onClick() }
            // A small squish while pressed, like the buttons inside the app.
            setOnTouchListener { view, event ->
                when (event.actionMasked) {
                    MotionEvent.ACTION_DOWN -> view.animate().scaleX(0.97f).scaleY(0.97f).setDuration(80).start()
                    MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL ->
                        view.animate().scaleX(1f).scaleY(1f).setDuration(120).start()
                }
                false
            }
        }

    private fun buttonParams(topMargin: Int) =
        LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(56)).apply { this.topMargin = dp(topMargin) }

    private fun color(res: Int): Int = ContextCompat.getColor(context, res)

    private fun dp(value: Int): Int = (value * context.resources.displayMetrics.density).toInt()

    private companion object {
        const val TAG = "Recess"
        const val AUTO_DISMISS_MS = 10 * 60_000L
        const val MAIN_THREAD_WAIT_MS = 2_000L
        const val ENTRANCE_MS = 260L
        const val GLOW_DP = 480
        const val GLOW_ALPHA = 56
        const val FAMILY_BODY = "sans-serif"
        const val FAMILY_HEAVY = "sans-serif-black"
    }
}
