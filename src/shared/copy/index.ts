/**
 * Every piece of text the user reads in the React Native screens, in one place, so the tone can be
 * dialled up or down by editing this folder alone (the native surfaces use res/values/strings.xml).
 *
 * Voice: playful and Gen-Z in headlines, buttons, empty and success states.
 * Rule: anything the user must ACT on or that explains a failure (permissions, errors, steps)
 * lives under a `plain` group and is written in ordinary words; a test keeps slang out of it.
 *
 * Add a section per screen. A value is a string, or a function when it needs filling in.
 */
export const copy = {
  break: {
    none: {
      headline: 'Nothing to see here',
      detail: 'When an app hits its limit, your quote and goals land here.',
    },
    session: {
      headline: 'Time’s up',
      detail: (appName: string) => `${appName} is on timeout.`,
    },
    daily: {
      headline: 'That’s a wrap for today',
      detail: (appName: string) => `${appName} is back tomorrow. No cap.`,
    },
    over: {
      headline: 'Break’s over',
      detail: (appName: string) =>
        `${appName} is open again. Use it on purpose, not on autopilot.`,
    },
    countdownLabel: 'until it’s back',
    countdownA11y: (time: string) => `Time left: ${time}`,
    quoteAuthor: (author: string) => `— ${author}`,
    goalsTitle: 'Main quests',
    goalsHint: 'Tap one to tick it off',
    goalsEmpty:
      'No quests yet. Add a few in Recess so they are waiting for you next time.',
    progress: (done: number, total: number) => `${done}/${total} done`,
    allDone: 'Every quest done. Go touch grass.',
    leave: 'Okay, I’m out',
    leaveA11y: 'Go to the home screen',
    close: 'Close',
    closeA11y: 'Close this screen',
  },
  common: {
    gotIt: 'Got it',
    cancel: 'Cancel',
    openSettings: 'Open settings',
    plain: {
      somethingWentWrong: 'Something went wrong. Please try again.',
    },
  },
} as const;
