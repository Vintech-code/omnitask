/** Consistent font sizes and weights. */
export const fontSize = {
  xs:   11,
  sm:   12,
  base: 13,
  md:   14,
  lg:   15,
  xl:   16,
  xxl:  18,
  h3:   19,
  h2:   22,
  h1:   26,
  display: 32,
} as const;

export const fontWeight = {
  regular:   '400' as const,
  medium:    '500' as const,
  semibold:  '600' as const,
  bold:      '700' as const,
  extrabold: '800' as const,
  black:     '900' as const,
};

/** Font families available in the note editor. */
export const FONT_FAMILIES: { label: string; value: string | undefined }[] = [
  { label: 'Default',   value: undefined },
  { label: 'Serif',     value: 'serif' },
  { label: 'Mono',      value: 'monospace' },
  { label: 'Light',     value: 'sans-serif-light' },
  { label: 'Condensed', value: 'sans-serif-condensed' },
  { label: 'Cursive',   value: 'cursive' },
];
