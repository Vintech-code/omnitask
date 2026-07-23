/**
 * Centralized color tokens for OmniTask.
 *
 * Reference-derived teal, pearl, and icon-circle palette.
 */
export const OMNITASK_PALETTE = {
  pearlIce: '#EDEDEF',
  frostWhite: '#FFFFFF',
  skyTint: '#C4E0E1',
  mistBlue: '#79C6CA',
  headerTeal: '#33AFAD',
  lightGradientEnd: '#EDEDEF',
  actionBlue: '#12B9A9',
  actionBluePressed: '#0E9489',
  warmCoral: '#F26841',
  warmCoralSoft: '#FCE5DE',
  brightCyan: '#34C7D9',
  infoBlue: '#20A6EB',
  iconForeground: '#EDEDEF',
  slateBlue: '#397E80',
  smokedNavy: '#101A1B',
  darkGradientTop: '#15383A',
  darkGradientEnd: '#0B1415',
} as const;

export const ICON_TILE_COLORS = [
  OMNITASK_PALETTE.warmCoral,
  OMNITASK_PALETTE.brightCyan,
  OMNITASK_PALETTE.actionBlue,
  OMNITASK_PALETTE.infoBlue,
] as const;

/** Compatibility name used by screens that have not migrated to ThemeContext. */
export const BRAND_BLUE = OMNITASK_PALETTE.actionBlue;

/** New notes use one calm neutral tint; existing stored note colors are preserved. */
export const CARD_COLORS = [OMNITASK_PALETTE.frostWhite] as const;
