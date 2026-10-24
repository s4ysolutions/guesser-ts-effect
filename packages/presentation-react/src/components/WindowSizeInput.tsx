import { useEffect, useState } from "react"
import { WINDOW_SIZE_MAX, WINDOW_SIZE_MIN } from "@guess/guesser-application"

const text = (size: number | undefined): string => (size === undefined ? "" : String(size))

/**
 * Edits N in a local draft. The value is sent when the field loses focus.
 * Clamping and rounding belong to SetWindowSize, so any number is sent as typed.
 * An empty or non-numeric draft is dropped and the field goes back to the current size.
 */
export const WindowSizeInput = (props: {
  readonly size: number | undefined
  readonly onChange: (n: number) => void
}) => {
  const { size, onChange } = props
  const [draft, setDraft] = useState(text(size))
  useEffect(() => setDraft(text(size)), [size])

  const commit = () => {
    const n = Number(draft)
    if (draft.trim() !== "" && !Number.isNaN(n)) onChange(n)
    // Show the current size again. If the clamped value differs, ObserveWindowSize emits it and the sync above shows it.
    setDraft(text(size))
  }

  return (
    <label>
      Bits the guesser sees (N)
      <input
        type="number"
        min={WINDOW_SIZE_MIN}
        max={WINDOW_SIZE_MAX}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
      />
    </label>
  )
}
