package com.appblocker.service

import android.os.Handler

/** Runs [TickLoop] work on a Handler's thread. */
class HandlerPoster(private val handler: Handler) : Poster {
    override fun post(task: Runnable) {
        handler.post(task)
    }

    override fun postDelayed(task: Runnable, delayMs: Long) {
        handler.postDelayed(task, delayMs)
    }

    override fun removeCallbacks(task: Runnable) {
        handler.removeCallbacks(task)
    }
}
