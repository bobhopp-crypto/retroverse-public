export type AccountBalanceKind = "asset" | "liability";

export type ReconcileStatus = "reconciled" | "needs_review" | "needs_import" | "not_set";

export type GroundTruthAccount = {
  slug: string;
  name: string;
  kind: AccountBalanceKind;
  balance: number | null;
  balanceLabel: string;
  asOfDate: string | null;
  note: string | null;
  reconcileStatus: ReconcileStatus;
  reconcileDetail: string;
};

export type GroundTruthBillDue = {
  label: string;
  amount: number | null;
  dueDate: string | null;
};

export type GroundTruthSubscription = {
  vendor: string;
  monthly: number;
  lastCharge: string;
};

export type FinanceGroundTruthData = {
  generatedAt: string;
  dataThrough: string;
  accounts: GroundTruthAccount[];
  netWorth: {
    assets: number;
    liabilities: number;
    total: number | null;
    complete: boolean;
    missingAccounts: string[];
    note: string;
  };
  importsNeedingAttention: number;
  currentMonth: {
    label: string;
    income: number;
    spending: number;
    net: number;
  };
  billsDue: GroundTruthBillDue[];
  subscriptions: GroundTruthSubscription[];
  subscriptionsMonthlyTotal: number;
};
