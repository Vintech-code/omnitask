/** Consistent spacing scale (4-pt grid). */
export const spacing = {
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  20,
  xxl: 24,
  section: 32,
} as const;

export type SpacingKey = keyof typeof spacing;
