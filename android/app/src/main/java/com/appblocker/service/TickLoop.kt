package com.appblocker.service

/** Schedules work on the loop's single thread. On Android this wraps a Handler. */
interface Poster {
    fun post(task: Runnable)

    fun postDelayed(task: Runnable, delayMs: Long)

    fun removeCallbacks(task: Runnable)
}

/**
 * Runs [tick] repeatedly on the [poster]'s thread. Every control action ([pause], [resume],
 * [cancel]) is itself posted to that thread, so it can never interleave with a tick that is
 * running: calling removeCallbacks from another thread while a tick is mid-flight would let that
 * tick schedule itself again, leaving two loops (or one that will not stop).
 */
class TickLoop(
    private val poster: Poster,
    private val tick: () -> TickOutcome,
    private val onStop: () -> Unit,
) {
    private val run =
        object : Runnable {
            override fun run() {
                val outcome = tick()
                if (outcome.stop) {
                    onStop()
                } else {
                    poster.postDelayed(this, outcome.nextDelayMs)
                }
            }
        }

    fun start() = poster.post(run)

    /**
     * Stops ticking after one last tick. That tick runs with the screen off, which tells the
     * engine nobody is in an app, so the time away is not credited to whatever was in front.
     */
    fun pause() =
        poster.post {
            poster.removeCallbacks(run)
            tick()
        }

    fun resume() =
        poster.post {
            poster.removeCallbacks(run)
            poster.post(run)
        }

    fun cancel() = poster.post { poster.removeCallbacks(run) }
}
