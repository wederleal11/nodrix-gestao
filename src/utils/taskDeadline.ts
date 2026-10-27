/** A due date is a local calendar date, not a UTC instant. */
export function validLocalDeadline(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() + 1 === month && date.getUTCDate() === day;
}

/** The initial deadline is free to set; every subsequent change needs an explanation. */
export function validateDeadlineRevision(previous: string, next: string, reason: string): string | null {
  if (!validLocalDeadline(next)) return 'Escolha uma data válida para o novo prazo.';
  if (previous === next) return 'O novo prazo é igual ao atual.';
  if (previous && reason.trim().length < 5) return 'Explique brevemente por que o prazo original está sendo alterado (mínimo de 5 caracteres).';
  if (reason.trim().length > 200) return 'Resuma a justificativa em até 200 caracteres.';
  return null;
}
