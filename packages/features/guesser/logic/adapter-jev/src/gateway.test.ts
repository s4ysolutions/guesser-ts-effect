import { test, expect } from "vitest"
import { Effect, Exit, Fiber } from "effect"
import { BadAnswer, Timeout, Unavailable } from "@guess/guesser-domain"
import { makeJevGateway } from "./gateway.ts"

type Fetch = typeof globalThis.fetch

const answerBody = (answer: unknown) => ({ model: "jev-1", answers: answer === undefined ? {} : { next: answer } })
const okFetch = (body: unknown): Fetch => async () => new Response(JSON.stringify(body), { status: 200 })
const run = (fetch: Fetch, bits: ReadonlyArray<0 | 1> = [0], timeoutMs?: number) =>
  Effect.runPromise(
    Effect.flip(makeJevGateway({ apiKey: "k", fetch, ...(timeoutMs === undefined ? {} : { timeoutMs }) }).guess(bits)),
  )
const runOk = (fetch: Fetch) => Effect.runPromise(makeJevGateway({ apiKey: "k", fetch }).guess([0]))

test("sends one Choice question", async () => {
  const calls: Array<{ url: string; init: RequestInit }> = []
  const fetch: Fetch = async (url, init) => {
    calls.push({ url: String(url), init: init! })
    return new Response(JSON.stringify(answerBody({ type: "choice", choice: "1" })), { status: 200 })
  }
  await Effect.runPromise(makeJevGateway({ apiKey: "secret", fetch }).guess([0, 1, 1, 0]))
  expect(calls).toHaveLength(1)
  expect(calls[0]!.url).toBe("https://api.typesafe.ai/v1/systemone")
  expect(calls[0]!.init.method).toBe("POST")
  const headers = new Headers(calls[0]!.init.headers)
  expect(headers.get("Authorization")).toBe("Bearer secret")
  const body = JSON.parse(String(calls[0]!.init.body))
  expect(body.model).toBe("jev-latest")
  expect(body.state).toBe("0110")
  const questions = Object.values(body.questions) as Array<any>
  expect(questions).toHaveLength(1)
  expect(questions[0].type).toBe("choice")
  expect(Object.keys(questions[0].criteria)).toEqual(["0", "1"])
})

test("uses baseUrl", async () => {
  let seen = ""
  const fetch: Fetch = async (url) => {
    seen = String(url)
    return new Response(JSON.stringify(answerBody({ type: "choice", choice: "0" })))
  }
  await Effect.runPromise(makeJevGateway({ apiKey: "k", baseUrl: "http://x.test", fetch }).guess([1]))
  expect(seen).toBe("http://x.test/v1/systemone")
})

test("maps choice and confidence", async () => {
  expect(await runOk(okFetch(answerBody({ type: "choice", choice: "1", confidence: 0.8 })))).toEqual({
    bit: 1,
    confidence: 0.8,
  })
})

test("no confidence key when absent", async () => {
  const guess = await runOk(okFetch(answerBody({ type: "choice", choice: "0" })))
  expect(guess).toEqual({ bit: 0 })
  expect("confidence" in guess).toBe(false)
})

test("HTTP 401 and 429 are Unavailable", async () => {
  for (const status of [401, 429]) {
    const error = await run(async () => new Response("no", { status }))
    expect(error).toBeInstanceOf(Unavailable)
  }
})

test("fetch rejects is Unavailable", async () => {
  const error = await run(async () => {
    throw new TypeError("Failed to fetch")
  })
  expect(error).toBeInstanceOf(Unavailable)
})

test("missing answer or bad choice is BadAnswer", async () => {
  for (const body of [
    answerBody(undefined),
    answerBody({ type: "choice", choice: "2" }),
    answerBody({ type: "choice" }),
    { nothing: true },
  ]) {
    expect(await run(okFetch(body))).toBeInstanceOf(BadAnswer)
  }
})

test("invalid JSON is BadAnswer", async () => {
  expect(await run(async () => new Response("<html>", { status: 200 }))).toBeInstanceOf(BadAnswer)
})

test("slower than timeoutMs is Timeout", async () => {
  const fetch: Fetch = (_url, init) =>
    new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new Error("aborted")))
    })
  expect(await run(fetch, [0], 20)).toBeInstanceOf(Timeout)
})

test("interrupt aborts fetch", async () => {
  let signal: AbortSignal | undefined
  const fetch: Fetch = (_url, init) => {
    signal = init?.signal ?? undefined
    return new Promise(() => {})
  }
  const fiber = Effect.runFork(makeJevGateway({ apiKey: "k", fetch }).guess([0]))
  await new Promise((r) => setTimeout(r, 10))
  expect(signal?.aborted).toBe(false)
  const exit = await Effect.runPromise(Fiber.interrupt(fiber).pipe(Effect.flatMap(() => Fiber.await(fiber))))
  expect(Exit.isFailure(exit)).toBe(true)
  expect(signal?.aborted).toBe(true)
})
