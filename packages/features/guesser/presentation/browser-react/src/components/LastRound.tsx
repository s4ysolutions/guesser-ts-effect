import type { Round } from "@guess/guesser-application"
import { lastRoundText } from "@guess/guesser-state"

export const LastRound = (props: { readonly round: Round | undefined }) =>
  props.round === undefined ? null : <p>{lastRoundText(props.round)}</p>
