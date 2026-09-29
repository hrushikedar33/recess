package com.appblocker.service

import com.appblocker.engine.EngineAction

/** What the monitor does in the real world when the engine decides something. */
interface ActionSink {
    fun ejectToHome(packageName: String)

    fun limitReached(event: EngineAction.NotifyLimitReached)

    fun blockEnded(event: EngineAction.BlockEnded)
}
