package com.appblocker.notify

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri

/**
 * How the "take a break" screen is opened: a deep link into this app. It carries no parameters and
 * changes nothing; the screen reads the last limit event from storage, so a link from anywhere
 * else can do no harm.
 */
object BreakIntents {
    const val BREAK_URI = "recess://break"

    fun intent(context: Context): Intent =
        Intent(Intent.ACTION_VIEW, Uri.parse(BREAK_URI))
            .setPackage(context.packageName)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)

    fun pending(context: Context): PendingIntent =
        PendingIntent.getActivity(
            context.applicationContext,
            0,
            intent(context),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
}
