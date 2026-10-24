export type Bit = 0 | 1

export const isBit = (x: unknown): x is Bit => x === 0 || x === 1

export type Bits = ReadonlyArray<Bit>

export const lastN = (bits: Bits, n: number): Bits => (n <= 0 ? [] : bits.slice(-n))

export const bitsToString = (bits: Bits): string => bits.join("")
