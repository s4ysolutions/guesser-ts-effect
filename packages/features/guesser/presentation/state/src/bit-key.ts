import type { Bit } from "@guess/core"

/**
 * The bit a key press stands for, or null when the press must be ignored.
 * Keys 0 and 1 press a bit. Auto-repeat, Ctrl/Meta/Alt and typing in an input do not.
 */
export const bitForKey = (key: {
  readonly key: string
  readonly repeat: boolean
  readonly ctrlKey: boolean
  readonly metaKey: boolean
  readonly altKey: boolean
  readonly inInput: boolean
}): Bit | null => {
  if (key.repeat || key.ctrlKey || key.metaKey || key.altKey || key.inInput) return null
  if (key.key === "0") return 0
  if (key.key === "1") return 1
  return null
}
