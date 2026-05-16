export function cleanPayload<T extends Record<string, unknown>>(values: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => value !== '' && value !== null && value !== undefined),
  ) as Partial<T>;
}

export const textInputClass = 'rounded-md border border-border bg-background px-3 py-2 text-sm';

export const buttonClass = 'rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60';

export const secondaryButtonClass = 'rounded-md border border-border px-3 py-2 text-sm font-medium';
