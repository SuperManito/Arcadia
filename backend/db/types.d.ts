export {}
declare global {
  interface BigInt {
    // eslint-disable-next-line ts/method-signature-style
    toJSON(): string
  }
}
