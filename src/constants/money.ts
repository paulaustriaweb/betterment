/** Money categories are free text in the DB — this is just the quick-pick list. */
export const EXPENSE_CATEGORIES = [
  { label: 'Groceries', color: '#5271C4' },
  { label: 'Transport', color: '#4C9A96' },
  { label: 'Food', color: '#CE9440' },
  { label: 'Subscriptions', color: '#8663C4' },
  { label: 'Bills', color: '#C97361' },
  { label: 'Other', color: '#93858A' },
] as const;

export const INCOME_SOURCES = [
  { label: 'Freelance', color: '#4E9B77' },
  { label: 'Salary', color: '#5E6BA8' },
  { label: 'Gift', color: '#C97361' },
  { label: 'Other', color: '#93858A' },
] as const;

export function moneyColor(label: string): string {
  const all = [...EXPENSE_CATEGORIES, ...INCOME_SOURCES];
  return all.find((c) => c.label === label)?.color ?? '#93858A';
}
