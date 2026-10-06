package com.appblocker.notify

import android.content.Context
import android.os.Build
import android.text.SpannableStringBuilder
import android.text.Spanned
import android.text.style.ForegroundColorSpan
import android.view.View
import android.widget.RemoteViews
import androidx.core.content.ContextCompat
import com.appblocker.R

/**
 * Turns a [LimitNotificationModel] into the two layouts of the rich limit notification. All the
 * decisions (how many goals, whether there is a countdown) are already made in the model; this only
 * binds them to views.
 */
class LimitNotificationViews(private val context: Context) {
    /** The heads-up and collapsed look. */
    fun collapsed(model: LimitNotificationModel): RemoteViews =
        views(R.layout.notification_limit_collapsed).apply {
            setTextViewText(R.id.notif_title, model.title)
            setTextViewText(R.id.notif_quote, quoted(model))
            bindTimer(this, model)
        }

    /** The expanded look: quote card and the goals. */
    fun expanded(model: LimitNotificationModel): RemoteViews =
        views(R.layout.notification_limit_expanded).apply {
            setTextViewText(R.id.notif_title, model.title)
            setTextViewText(R.id.notif_status, model.status)
            setTextViewText(R.id.notif_quote, quoted(model))
            setTextViewText(R.id.notif_author, "— ${model.quoteAuthor}")
            bindTimer(this, model)
            bindGoals(this, model)
        }

    private fun views(layout: Int) = RemoteViews(context.packageName, layout)

    private fun quoted(model: LimitNotificationModel) = "“${model.quoteText}”"

    private fun bindTimer(views: RemoteViews, model: LimitNotificationModel) {
        val base = model.countdownBase
        if (base == null) {
            views.setViewVisibility(R.id.notif_timer, View.GONE)
            views.setViewVisibility(R.id.notif_tomorrow, View.VISIBLE)
            return
        }
        views.setViewVisibility(R.id.notif_timer, View.VISIBLE)
        views.setViewVisibility(R.id.notif_tomorrow, View.GONE)
        views.setChronometer(R.id.notif_timer, base, null, true)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            views.setChronometerCountDown(R.id.notif_timer, true)
        }
    }

    private fun bindGoals(views: RemoteViews, model: LimitNotificationModel) {
        val rowIds = intArrayOf(R.id.notif_goal_1, R.id.notif_goal_2, R.id.notif_goal_3)
        rowIds.forEachIndexed { index, id ->
            val title = model.goalRows.getOrNull(index)
            if (title == null) {
                views.setViewVisibility(id, View.GONE)
            } else {
                views.setViewVisibility(id, View.VISIBLE)
                views.setTextViewText(id, goalRow(title))
            }
        }
        if (model.moreGoals > 0) {
            views.setViewVisibility(R.id.notif_goals_more, View.VISIBLE)
            views.setTextViewText(R.id.notif_goals_more, context.getString(R.string.notif_goals_more, model.moreGoals))
        } else {
            views.setViewVisibility(R.id.notif_goals_more, View.GONE)
        }
        if (model.goalsToGo > 0) {
            views.setViewVisibility(R.id.notif_goals_count, View.VISIBLE)
            views.setTextViewText(R.id.notif_goals_count, context.getString(R.string.notif_goals_to_go, model.goalsToGo))
        } else {
            views.setViewVisibility(R.id.notif_goals_count, View.GONE)
        }
        val note = model.goalsNote
        if (note == null) {
            views.setViewVisibility(R.id.notif_goals_note, View.GONE)
        } else {
            views.setViewVisibility(R.id.notif_goals_note, View.VISIBLE)
            views.setTextViewText(R.id.notif_goals_note, note)
        }
    }

    /** "○  Goal title", the circle in the accent colour. */
    private fun goalRow(title: String): CharSequence =
        SpannableStringBuilder("○  $title").apply {
            setSpan(
                ForegroundColorSpan(ContextCompat.getColor(context, R.color.recess_primary)),
                0,
                1,
                Spanned.SPAN_EXCLUSIVE_EXCLUSIVE,
            )
        }
}
