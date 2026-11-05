export class CommerceError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message)
    this.name = "CommerceError"
  }
}

export function publicError(error: unknown) {
  if (error instanceof CommerceError) return error.message
  console.error(error)
  return "We couldn't complete that request. Please try again."
}
