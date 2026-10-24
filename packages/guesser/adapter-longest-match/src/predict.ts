import type { Bits } from "@guess/core"
import type { Guess } from "@guess/guesser-domain"

// True when the k bits at `start` equal the k bits at `from`.
const sameRun = (bits: Bits, start: number, from: number, k: number): boolean => {
  for (let i = 0; i < k; i++) {
    if (bits[start + i] !== bits[from + i]) return false
  }
  return true
}

export const predictNext = (bits: Bits): Guess => {
  const length = bits.length
  if (length === 0) return { bit: 0 }

  // Try the longest suffix first. For each length, scan start positions
  // from the most recent one backwards.
  for (let k = length - 1; k >= 1; k--) {
    const suffixStart = length - k
    for (let s = suffixStart - 1; s >= 0; s--) {
      if (sameRun(bits, s, suffixStart, k)) {
        return { bit: bits[s + k]!, confidence: k / (length - 1) }
      }
    }
  }

  // No match: majority bit, or the opposite of the last bit on a tie.
  const ones = bits.filter((bit) => bit === 1).length
  const zeros = length - ones
  if (ones > zeros) return { bit: 1 }
  if (zeros > ones) return { bit: 0 }
  return { bit: bits[length - 1] === 1 ? 0 : 1 }
}
