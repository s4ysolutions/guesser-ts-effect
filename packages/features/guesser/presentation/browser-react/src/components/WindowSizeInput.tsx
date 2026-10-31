import { useEffect, useRef } from "react"
import { WINDOW_SIZE_MAX, WINDOW_SIZE_MIN } from "@guess/guesser-application"

/**
 * Shows the draft text and sends events: typing edits the draft, blur commits it (Enter also leaves the field).
 * The input is not controlled: the text comes back from a Stream, later than the keystroke,
 * and a controlled input would put the old text back in between.
 * Parsing, clamping and rounding are not done here.
 */
export const WindowSizeInput = (props: {
  readonly text: string | undefined
  readonly onEdit: (text: string) => void
  readonly onCommit: () => void
}) => {
  const { text, onEdit, onCommit } = props
  const input = useRef<HTMLInputElement>(null)
  // Skip the write when the text is already there, so typing is not disturbed.
  useEffect(() => {
    if (input.current !== null && text !== undefined && input.current.value !== text) input.current.value = text
  }, [text])

  return (
    <label>
      Bits the guesser sees (N)
      <input
        ref={input}
        type="number"
        min={WINDOW_SIZE_MIN}
        max={WINDOW_SIZE_MAX}
        defaultValue={text ?? ""}
        onChange={(event) => onEdit(event.target.value)}
        onBlur={onCommit}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur()
        }}
      />
    </label>
  )
}
