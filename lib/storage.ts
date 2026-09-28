export const FREE_STORAGE_BYTES = 10_000_000_000;
// Uploads stop 1 GB short of R2's free 10 GB so a large batch can never tip the bill over.
export const STORAGE_LIMIT_BYTES = 9_000_000_000;

export function canStore(usedBytes: number, incomingBytes: number, limit = STORAGE_LIMIT_BYTES): boolean {
  return usedBytes + incomingBytes <= limit;
}

export function formatGB(bytes: number): string {
  return `${(bytes / 1e9).toFixed(2)} GB`;
}
