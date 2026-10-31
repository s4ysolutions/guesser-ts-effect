import type { GuessStatus } from "@guess/guesser-application"
import { statusText } from "@guess/guesser-state"

export const StatusLine = (props: { readonly status: GuessStatus }) => <p role="status">{statusText(props.status)}</p>
