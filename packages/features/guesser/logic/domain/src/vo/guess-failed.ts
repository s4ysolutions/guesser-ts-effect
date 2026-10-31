import { Data } from "effect"

export class Unavailable extends Data.TaggedError("Unavailable")<{ readonly message: string }> {}

export class BadAnswer extends Data.TaggedError("BadAnswer")<{ readonly message: string }> {}

export class Timeout extends Data.TaggedError("Timeout")<{}> {}

export type GuessFailed = Unavailable | BadAnswer | Timeout
