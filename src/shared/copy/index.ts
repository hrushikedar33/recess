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
  common: {
    gotIt: 'Got it',
    cancel: 'Cancel',
    openSettings: 'Open settings',
    plain: {
      somethingWentWrong: 'Something went wrong. Please try again.',
    },
  },
} as const;
