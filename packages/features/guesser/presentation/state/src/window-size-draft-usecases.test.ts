import { Effect, Fiber, Stream, SubscriptionRef } from "effect"
import { expect, test } from "vitest"
import type { UseCase } from "@guess/core"
import { ObserveWindowSize, SetWindowSize } from "@guess/guesser-application"
import {
  CommitWindowSizeDraft,
  EditWindowSizeDraft,
  makeCommitWindowSizeDraft,
  makeEditWindowSizeDraft,
  makeObserveWindowSizeDraft,
  ObserveWindowSizeDraft,
  WindowSizeDraftState,
} from "./index.ts"

const settle = Effect.sleep("5 millis")

// A window size that is a plain ref, and a setWindowSize that records its calls and stores them.
// Clamping is not tested here: it is a rule of domain, so the fake stores the number as sent.
const setup = (initialSize: number) =>
  Effect.gen(function*() {
    const draftState = yield* WindowSizeDraftState
    const size = yield* SubscriptionRef.make(initialSize)
    const sent: Array<number> = []
    const observeWindowSize: UseCase<ObserveWindowSize> = () => SubscriptionRef.changes(size)
    const setWindowSize: UseCase<SetWindowSize> = (command) =>
      Effect.gen(function*() {
        sent.push(command.n)
        yield* SubscriptionRef.set(size, command.n)
      })
    return {
      size,
      sent,
      observe: makeObserveWindowSizeDraft({ draftState, observeWindowSize }),
      edit: makeEditWindowSizeDraft({ draftState }),
      commit: makeCommitWindowSizeDraft({ draftState, setWindowSize }),
    }
  })

const run = <A>(effect: Effect.Effect<A, never, WindowSizeDraftState>) =>
  Effect.runPromise(effect.pipe(Effect.scoped, Effect.provide(WindowSizeDraftState.layer())))

// Collects what the observer emits, in a background fiber.
const collect = (stream: Stream.Stream<string>) =>
  Effect.gen(function*() {
    const seen: Array<string> = []
    const fiber = yield* Effect.forkChild(Stream.runForEach(stream, (text) => Effect.sync(() => void seen.push(text))))
    yield* settle
    return { seen, stop: Fiber.interrupt(fiber) }
  })

test("with no draft, the field shows the current size as text", () =>
  run(Effect.gen(function*() {
    const t = yield* setup(8)
    const { seen, stop } = yield* collect(t.observe(new ObserveWindowSizeDraft()))
    expect(seen).toEqual(["8"])
    yield* SubscriptionRef.set(t.size, 12)
    yield* settle
    expect(seen).toEqual(["8", "12"])
    yield* stop
  })))

test("a draft replaces the size in the field, even when the size changes meanwhile", () =>
  run(Effect.gen(function*() {
    const t = yield* setup(8)
    const { seen, stop } = yield* collect(t.observe(new ObserveWindowSizeDraft()))
    yield* t.edit(new EditWindowSizeDraft({ text: "30" }))
    yield* SubscriptionRef.set(t.size, 9)
    yield* settle
    expect(seen.at(-1)).toBe("30")
    yield* stop
  })))

test("nothing is emitted until the size is known", () =>
  run(Effect.gen(function*() {
    const draftState = yield* WindowSizeDraftState
    const observe = makeObserveWindowSizeDraft({ draftState, observeWindowSize: () => Stream.never })
    const { seen, stop } = yield* collect(observe(new ObserveWindowSizeDraft()))
    expect(seen).toEqual([])
    yield* stop
  })))

test("commit sends the typed number as typed, out of range included", () =>
  run(Effect.gen(function*() {
    const t = yield* setup(8)
    const { seen, stop } = yield* collect(t.observe(new ObserveWindowSizeDraft()))
    yield* t.edit(new EditWindowSizeDraft({ text: "300" }))
    yield* t.commit(new CommitWindowSizeDraft())
    yield* settle
    expect(t.sent).toEqual([300])
    expect(seen.at(-1)).toBe("300")
    yield* stop
  })))

test("after a commit the draft is gone: the field follows the size again", () =>
  run(Effect.gen(function*() {
    const t = yield* setup(8)
    const { seen, stop } = yield* collect(t.observe(new ObserveWindowSizeDraft()))
    yield* t.edit(new EditWindowSizeDraft({ text: "12" }))
    yield* t.commit(new CommitWindowSizeDraft())
    yield* SubscriptionRef.set(t.size, 256)
    yield* settle
    expect(seen.at(-1)).toBe("256")
    yield* stop
  })))

test("an empty draft sends nothing and the field shows the current size", () =>
  run(Effect.gen(function*() {
    const t = yield* setup(8)
    const { seen, stop } = yield* collect(t.observe(new ObserveWindowSizeDraft()))
    yield* t.edit(new EditWindowSizeDraft({ text: "" }))
    yield* settle
    expect(seen.at(-1)).toBe("")
    yield* t.commit(new CommitWindowSizeDraft())
    yield* settle
    expect(t.sent).toEqual([])
    expect(seen.at(-1)).toBe("8")
    yield* stop
  })))

test("a draft that is not a number reaches setWindowSize as NaN, and the field is cleared", () =>
  run(Effect.gen(function*() {
    const t = yield* setup(8)
    const { seen, stop } = yield* collect(t.observe(new ObserveWindowSizeDraft()))
    yield* t.edit(new EditWindowSizeDraft({ text: "abc" }))
    yield* t.commit(new CommitWindowSizeDraft())
    yield* settle
    expect(t.sent).toHaveLength(1)
    expect(t.sent[0]).toBeNaN()
    yield* stop
  })))

test("blur with no edit does not call setWindowSize (no new guess when the user only tabs through)", () =>
  run(Effect.gen(function*() {
    const t = yield* setup(8)
    yield* t.commit(new CommitWindowSizeDraft())
    yield* t.commit(new CommitWindowSizeDraft())
    expect(t.sent).toEqual([])
  })))

test("commit with no edit in progress does nothing", () =>
  run(Effect.gen(function*() {
    const t = yield* setup(8)
    yield* t.commit(new CommitWindowSizeDraft())
    expect(t.sent).toEqual([])
  })))

test("a second commit after one edit sends only once", () =>
  run(Effect.gen(function*() {
    const t = yield* setup(8)
    yield* t.edit(new EditWindowSizeDraft({ text: "20" }))
    yield* t.commit(new CommitWindowSizeDraft())
    yield* t.commit(new CommitWindowSizeDraft())
    expect(t.sent).toEqual([20])
  })))
