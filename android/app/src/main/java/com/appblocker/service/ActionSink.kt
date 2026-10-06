package com.appblocker.service

import com.appblocker.engine.EngineAction

/** What the monitor does in the real world when the engine decides something. */
interface ActionSink {
    /**
     * Asks the phone to show the home screen. Best effort: Android often refuses this from a
     * background service, so [blockedAppInFront] is what actually keeps the app unusable.
     */
    fun ejectToHome(packageName: String)

    /**
     * Called on every tick a blocked app is in front. Puts a full-screen cover over it (idempotent:
     * cheap if the cover is already up), because the app cannot be reliably sent away.
     */
    fun blockedAppInFront(packageName: String)

    /**
     * Starts the Break screen after [delayMs]. It is a real screen the user can use (tick goals, see
     * the countdown), and Android lets a background service start it while the cover is visible.
     */
    fun launchBreak(delayMs: Long)

    /** The app in front changed (null: nothing, e.g. screen off). Lets the cover lift once the blocked app is left. */
    fun foregroundChanged(packageName: String?)

    fun limitReached(event: EngineAction.NotifyLimitReached)

    fun blockEnded(event: EngineAction.BlockEnded)
}
