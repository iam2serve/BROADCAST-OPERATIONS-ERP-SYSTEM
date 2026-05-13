const expenseStatusClass: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  SUBMITTED: 'bg-sky-100 text-sky-700',
  UNDER_REVIEW: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-emerald-100 text-emerald-700',
  REJECTED: 'bg-rose-100 text-rose-700',
  REIMBURSED: 'bg-indigo-100 text-indigo-700',
};

export function ExpenseStatusBadge({ status }: { status: string }) {
  return <span className={`rounded-full px-2 py-1 text-xs font-medium ${expenseStatusClass[status] ?? expenseStatusClass.DRAFT}`}>{status}</span>;
}

export function Money({ amount, currency = 'EGP' }: { amount: string | number; currency?: string }) {
  return <span>{Number(amount).toLocaleString(undefined, { style: 'currency', currency })}</span>;
}
