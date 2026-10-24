// TypeSafe Jev API, Choice primitive. Docs: https://docs.typesafe.ai/introduction/quickstart
//
// Request: POST {baseUrl}/v1/systemone
//   Headers: Authorization: Bearer <apiKey>, Content-Type: application/json
//   Body: {
//     "model": "jev-latest",
//     "state": "<text to judge>",
//     "questions": {
//       "<id>": { "type": "choice", "instructions": "<text>", "criteria": { "<option>": "<description>", ... } }
//     }
//   }
// Response (200): {
//   "model": "jev-1.13.0",
//   "answers": { "<id>": { "type": "choice", "choice": "<option>", "confidence": 0.9,
//                          "probabilities": { "<option>": 0.9, ... } } },
//   "usage": { ... }
// }
// Jev's API rejects browser CORS calls, so this adapter is a reference. No product uses it.
import { Effect } from "effect"
import { bitsToString, isBit } from "@guess/core"
import type { Bits } from "@guess/core"
import { BadAnswer, Timeout, Unavailable } from "@guess/guesser-domain"
import type { Guess, GuessFailed, GuessGateway } from "@guess/guesser-domain"

export interface JevConfig {
  readonly apiKey: string
  readonly baseUrl?: string
  readonly timeoutMs?: number
  readonly fetch?: typeof globalThis.fetch
}

const QUESTION_ID = "next"

const buildBody = (bits: Bits) => ({
  model: "jev-latest",
  state: bitsToString(bits),
  questions: {
    [QUESTION_ID]: {
      type: "choice",
      instructions:
        "The state is a sequence of bits typed by a person. Predict the next bit the person will type.",
      criteria: { "0": "The next bit is 0", "1": "The next bit is 1" },
    },
  },
})

const parseGuess = (json: unknown): Guess | BadAnswer => {
  const answers = (json as { answers?: Record<string, unknown> } | null)?.answers
  const answer = answers?.[QUESTION_ID] as { choice?: unknown; confidence?: unknown } | undefined
  if (answer === undefined || answer === null) return new BadAnswer({ message: "No answer in response" })
  const bit = answer.choice === "0" ? 0 : answer.choice === "1" ? 1 : undefined
  if (bit === undefined || !isBit(bit)) return new BadAnswer({ message: "Choice is not 0 or 1" })
  return typeof answer.confidence === "number" ? { bit, confidence: answer.confidence } : { bit }
}

export const makeJevGateway = (config: JevConfig): GuessGateway => {
  const baseUrl = config.baseUrl ?? "https://api.typesafe.ai"
  const timeoutMs = config.timeoutMs ?? 10_000
  const doFetch = config.fetch ?? globalThis.fetch
  const unavailable = (cause: unknown) =>
    new Unavailable({ message: cause instanceof Error ? cause.message : String(cause) })

  return {
    guess: (lastBits) => {
      const call: Effect.Effect<Guess, GuessFailed> = Effect.gen(function* () {
        const response = yield* Effect.tryPromise({
          try: (signal) =>
            doFetch(`${baseUrl}/v1/systemone`, {
              method: "POST",
              headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
              body: JSON.stringify(buildBody(lastBits)),
              signal,
            }),
          catch: unavailable,
        })
        if (!response.ok) return yield* Effect.fail(new Unavailable({ message: `HTTP ${response.status}` }))
        const json = yield* Effect.tryPromise({
          try: () => response.json() as Promise<unknown>,
          catch: () => new BadAnswer({ message: "Response is not valid JSON" }),
        })
        const parsed = parseGuess(json)
        return parsed instanceof BadAnswer ? yield* Effect.fail(parsed) : parsed
      })
      return call.pipe(Effect.timeoutOrElse({ duration: timeoutMs, orElse: () => Effect.fail(new Timeout()) }))
    },
  }
}
