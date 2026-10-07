/** Reject rollover dates (for example February 30) before calendar arithmetic. */
export function isDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

export function listingPage(value: string | null): number {
  const page = Number(value);
  return Number.isSafeInteger(page) && page >= 0 ? page : 0;
}
