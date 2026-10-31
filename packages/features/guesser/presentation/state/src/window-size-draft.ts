/**
 * The number typed in the size field, or null for empty text.
 * Text that is not a number gives NaN: domain `windowSizeFor` is the only place that rejects it.
 * The number is not clamped or rounded: that is a rule of the game, so it belongs to domain.
 */
export const parseWindowSizeDraft = (text: string): number | null =>
  text.trim() === "" ? null : Number(text)
