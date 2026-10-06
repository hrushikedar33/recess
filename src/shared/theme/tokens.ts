/**
 * The design tokens every screen builds on. Screens use these names, never raw hex values or
 * ad-hoc spacing. The native surfaces (notification, cover) mirror the palette in
 * android/app/src/main/res/values/colors.xml: change a colour in both places.
 */
export const palette = {
  canvas: '#0A0A0C',
  surface: '#141418',
  raised: '#1C1C22',
  border: '#26262E',

  textPrimary: '#FFFFFF',
  textSecondary: '#9A9AA5',
  textDisabled: '#5A5A64',

  /** Focus, ON and progress. */
  primary: '#D4FF3A',
  onPrimary: '#0A0A0C',
  primaryMuted: '#D4FF3A1F',

  /** An app that is blocked right now, and limit-reached moments. */
  blocked: '#FF5C8A',
  onBlocked: '#0A0A0C',
  blockedMuted: '#FF5C8A24',

  /** Destructive actions and hard errors. */
  danger: '#FF4757',
  onDanger: '#0A0A0C',

  /** Something needs attention but nothing is broken. */
  warning: '#FFB84D',
  warningMuted: '#FFB84D1F',

  scrim: '#000000B3',
} as const;

/** 4-point spacing scale. */
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  huge: 48,
} as const;

export const radius = {
  sm: 12,
  md: 20,
  lg: 28,
  pill: 999,
} as const;

/** System font, heavy weights and tight tracking do the work a custom typeface would. */
export const typography = {
  display: { fontSize: 40, fontWeight: '800', letterSpacing: -1.2 },
  title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.6 },
  heading: { fontSize: 18, fontWeight: '700', letterSpacing: -0.2 },
  body: { fontSize: 15, fontWeight: '400', letterSpacing: 0 },
  label: { fontSize: 14, fontWeight: '700', letterSpacing: 0.1 },
  caption: { fontSize: 12, fontWeight: '500', letterSpacing: 0.2 },
} as const;

/** The smallest comfortable touch target, in dp. */
export const MIN_TOUCH = 48;
