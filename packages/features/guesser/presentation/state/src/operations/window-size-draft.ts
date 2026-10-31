/**
 * The number typed in the size field, or null for empty text.
 * Text that is not a number gives NaN: domain `windowSizeFor` is the only place that rejects it.
 * The number is not clamped or rounded: that is a rule of the game, so it belongs to domain.
 */
export const parseWindowSizeDraft = (text: string): number | null =>
  text.trim() === "" ? null : Number(text)

/** The number to send when the user leaves the field, or null when there is nothing to send. */
export const windowSizeToCommit = (draft: string | null): number | null =>
  draft === null ? null : parseWindowSizeDraft(draft)

/** The draft if there is one, otherwise the current size as text. */
export const windowSizeFieldText = (draft: string | null, size: number): string =>
  draft ?? String(size)
