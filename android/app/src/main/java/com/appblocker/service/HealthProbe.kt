package com.appblocker.service

import com.appblocker.store.HealthIssue

/** Checks the things the OS can take away from the monitor without telling it. */
interface HealthProbe {
    fun issues(): Set<HealthIssue>
}
