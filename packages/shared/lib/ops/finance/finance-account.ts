export type FinanceAccount = {
  id: number;
  name: string;
  slug: string;
  active: boolean;
  mergedIntoId: number | null;
  workbookTxnCount: number;
  txnCount: number;
  totalSpend: number;
};

export function sortFinanceAccountsByName(accounts: FinanceAccount[]): FinanceAccount[] {
  return [...accounts].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
}
