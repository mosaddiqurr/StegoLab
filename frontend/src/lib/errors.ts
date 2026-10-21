export class ProductError extends Error {
  constructor(message: string) { super(message); this.name = "ProductError"; }
}

export const DAMAGED = "The file appears to be damaged.";
export const NO_PAYLOAD = "No StegoLab payload was found.";
export const AUTH_FAILED = "The password is incorrect or the hidden data is damaged.";
export const CAPACITY = "This carrier does not have enough capacity for that payload.";
export function fail(message: string): never { throw new ProductError(message); }
export function messageFor(error: unknown): string {
  return error instanceof ProductError ? error.message : "The file could not be processed.";
}
