/** Local calendar days (no toISOString, which may shift dates by timezone). */
export function localDateKey(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function monthGrid(anchor: Date): Date[] {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1, 12);
  const startWeekOffset = (first.getDay() + 6) % 7; // Monday first
  const last = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0, 12);
  const length = Math.ceil((startWeekOffset + last.getDate()) / 7) * 7;
  return Array.from({ length }, (_, index) =>
    new Date(first.getFullYear(), first.getMonth(), 1 - startWeekOffset + index, 12));
}

export function monthAtOffset(offset: number, today = new Date()): Date {
  return new Date(today.getFullYear(), today.getMonth() + offset, 1, 12);
}

export function monthHeading(date: Date): string {
  const label = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}
