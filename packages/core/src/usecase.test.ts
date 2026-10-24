import { Data, Effect } from "effect"
import { expect, expectTypeOf, test } from "vitest"
import type { ResponseOf, UseCase } from "./usecase.ts"

class Ping extends Data.TaggedClass("Ping")<{ readonly n: number }> {
  declare readonly "~response"?: Effect.Effect<string>
}

test("ResponseOf reads the declared response", () => {
  expectTypeOf<ResponseOf<Ping>>().toEqualTypeOf<Effect.Effect<string>>()
  const ping: UseCase<Ping> = (c) => Effect.succeed(String(c.n))
  return Effect.runPromise(ping(new Ping({ n: 3 }))).then((s) => expect(s).toBe("3"))
})
