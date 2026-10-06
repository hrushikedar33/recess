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
  home: {
    title: 'Recess',
    tagline: 'touch grass, not feeds',
    switchLabel: 'Monitoring',
    on: {
      title: 'Locked in',
      detail: (count: number) =>
        count === 0
          ? 'Nothing to watch yet. Add an app.'
          : count === 1
          ? 'Watching 1 app'
          : `Watching ${count} apps`,
    },
    off: {
      title: 'Off the grid',
      detail: 'Flip it on and Recess starts watching.',
    },
    busy: 'One sec…',
    goals: {
      title: 'Main quests',
      empty: 'No quests yet. Tap to add one.',
      progress: (done: number, total: number) => `${done}/${total} done`,
      allDone: 'All done. Absolute legend.',
      a11y: (summary: string) => `Main quests. ${summary}`,
    },
    apps: { title: 'On the clock' },
    empty: {
      title: 'Nothing on the clock yet',
      body: 'Add the apps that eat your day and we’ll put them on a timer.',
    },
    add: 'Add an app',
    addA11y: 'Add an app to limit',
    appSwitch: (appName: string) => `Limit ${appName}`,
    remove: (appName: string) => `Stop limiting ${appName}`,
    settings: 'Open settings',
    settingsA11y: 'Open Recess settings',
    gotIt: 'Got it',
    fixIt: 'Fix it',
    dismissNote: 'Dismiss this note',
    dismissGuidance: 'Dismiss this guidance',
  },
  goals: {
    title: 'Main quests',
    intro: 'Your quests show up with a quote whenever a limit hits.',
    placeholder: 'Add a quest: a goal or a to-do',
    add: 'Add',
    addA11y: 'Add goal',
    inputA11y: 'New goal',
    progress: (done: number, total: number) => `${done}/${total} done`,
    allDone: 'All done. Absolute legend.',
    empty: {
      title: 'No quests yet',
      body: 'Add what you would rather be doing. They show up, with a quote, when it is time to put the phone down.',
    },
    quotes: {
      title: 'Fresh quotes from the internet',
      switchLabel: 'Fresh quotes from the internet',
      attribution: 'Inspirational quotes provided by ZenQuotes API',
      plain: {
        body: 'Once a day Recess can fetch new quotes. Off by default. Only the request goes out; your goals never leave this phone.',
      },
    },
  },
  addApp: {
    pickTitle: 'Pick an app',
    searchPlaceholder: 'Search your apps',
    searchA11y: 'Search apps',
    loading: 'Finding your apps…',
    noMatch: (query: string) => `No apps match "${query}"`,
    rowA11y: (appName: string) => `Set limits for ${appName}`,
    configTitle: 'Set the rules',
    session: {
      title: 'How long per sesh',
      desc: (minutes: number) =>
        `Time's up after ${minutes} minutes in one go.`,
    },
    cooldown: {
      title: 'Touch-grass break',
      desc: (minutes: number) =>
        `Then you wait ${minutes} minutes before it opens again.`,
    },
    daily: {
      title: 'Daily budget',
      noCap: 'No cap',
      noCapA11y: 'No daily budget',
      desc: (minutes: number) =>
        `After ${minutes} minutes in a day it stays closed until midnight.`,
      descNoCap: 'No total for the day: only the session limit applies.',
    },
    minutesA11y: (minutes: number) =>
      minutes === 1 ? '1 minute' : `${minutes} minutes`,
    summary: (session: number, cooldown: number, daily: number | null) =>
      `${session} min per sesh · ${cooldown} min break · ${
        daily === null ? 'no cap' : `${daily} min a day`
      }`,
    save: 'Lock it in',
    saving: 'Locking it in…',
    saveA11y: 'Save these limits',
    back: 'Go back to the app list',
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
