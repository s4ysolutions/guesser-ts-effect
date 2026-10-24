import { expect, test } from "vitest"
import { bitsToString, isBit, lastN } from "./bit.ts"

test("lastN takes the tail", () => { expect(lastN([0, 1, 1, 0, 1], 3)).toEqual([1, 0, 1]) })
test("lastN with n >= length returns all", () => { expect(lastN([0, 1], 5)).toEqual([0, 1]) })
test("lastN with n <= 0 returns empty", () => { expect(lastN([0, 1], 0)).toEqual([]) })
test("bitsToString", () => { expect(bitsToString([0, 1, 1])).toBe("011") })
test("isBit", () => { expect([0, 1, 2, "1", null].map(isBit)).toEqual([true, true, false, false, false]) })
