import type { Bit } from "@guess/core"

export const BitButtons = (props: { readonly onPress: (bit: Bit) => void }) => (
  <div className="bit-buttons">
    <button type="button" className="bit-button" onClick={() => props.onPress(0)}>
      0
    </button>
    <button type="button" className="bit-button" onClick={() => props.onPress(1)}>
      1
    </button>
  </div>
)
