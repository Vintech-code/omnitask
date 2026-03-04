/**
 * Centralized color tokens for the entire app.
 * Use these instead of hardcoded hex strings in screens/components.
 */

// ── Brand ────────────────────────────────────────────────────────────────────
export const BRAND_BLUE     = '#4A90D9';
export const BRAND_GREEN    = '#3DAE7C';
export const BRAND_ORANGE   = '#E09C52';
export const BRAND_RED      = '#E05252';
export const BRAND_PURPLE   = '#9B6DD4';

// ── Note card palette ────────────────────────────────────────────────────────
export const CARD_COLORS = [
  '#FFF9C4', '#FFFDE7', '#FFF3E0', '#F3E5F5',
  '#E8F5E9', '#E3F2FD', '#FCE4EC', '#E0F7FA', '#FFFFFF',
] as const;

// ── Tag / badge palette ──────────────────────────────────────────────────────
export const TAG_PALETTE = [
  '#7C5CBF', '#2196F3', '#4CAF50', '#F44336',
  '#FF9800', '#009688', '#E91E63', '#607D8B',
] as const;

// ── Neutral text ─────────────────────────────────────────────────────────────
export const TEXT_PRIMARY   = '#111111';
export const TEXT_SECONDARY = '#555555';
export const TEXT_MUTED     = '#888888';
export const TEXT_DISABLED  = '#C0C0C0';
export const TEXT_LIGHT     = '#aaa';

// ── Surface ──────────────────────────────────────────────────────────────────
export const SURFACE_WHITE  = '#FFFFFF';
export const SURFACE_LIGHT  = '#FAFAFA';
export const SURFACE_INPUT  = '#F8F8F8';
export const BORDER_DEFAULT = '#DDD';
export const BORDER_SUBTLE  = 'rgba(0,0,0,0.06)';
export const BORDER_TOOLBAR = 'rgba(0,0,0,0.07)';

// ── Overlay ──────────────────────────────────────────────────────────────────
export const OVERLAY_DARK   = 'rgba(0,0,0,0.45)';
export const OVERLAY_LIGHT  = 'rgba(255,255,255,0.6)';
