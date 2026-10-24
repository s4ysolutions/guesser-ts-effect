import { useEffect, useState } from "react"

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
    if (draft.trim() === "" || Number.isNaN(n)) {
      setDraft(text(size))
      return
    }
    onChange(n)
  }

  return (
    <label>
      Bits the guesser sees (N)
      <input
        type="number"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
      />
    </label>
  )
}
