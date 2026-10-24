import type { Round } from "@guess/interaction-application"
import { lastRoundText } from "../copy.ts"

export const LastRound = (props: { readonly round: Round | undefined }) =>
  props.round === undefined ? null : <p>{lastRoundText(props.round)}</p>
