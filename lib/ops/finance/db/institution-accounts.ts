import "server-only";

import { inspectExecute, inspectQuery } from "@/lib/inspect/pg";

import { financeDbError } from "@/lib/ops/finance/db/ensure-schema";

export type InstitutionAccount = {
  id: number;
  slug: string;
  name: string;
  kind: string;
  ledgerSource: string | null;
  active: boolean;
  manualBalance: number | null;
  manualBalanceAsOf: string | null;
  setupStatus: string;
};

type InstitutionRow = {
  id: number;
  slug: string;
  name: string;
  kind: string;
  ledger_source: string | null;
  active: boolean;
  manual_balance: string | null;
  manual_balance_as_of: string | null;
  setup_status: string | null;
};

function mapInstitution(row: InstitutionRow): InstitutionAccount {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    kind: row.kind,
    ledgerSource: row.ledger_source,
    active: row.active,
    manualBalance: row.manual_balance != null ? Number(row.manual_balance) : null,
    manualBalanceAsOf: row.manual_balance_as_of ?? null,
    setupStatus: row.setup_status ?? "pending",
  };
}

const INSTITUTION_SELECT = `id, slug, name, kind, ledger_source, active,
  manual_balance::text, manual_balance_as_of::text, setup_status`;

export async function getInstitutionAccountBySlug(slug: string): Promise<InstitutionAccount | null> {
  try {
    const rows = await inspectQuery<InstitutionRow>(
      `SELECT ${INSTITUTION_SELECT}
       FROM finance_institution_accounts WHERE slug = $1 LIMIT 1`,
      [slug],
    );
    const row = rows[0];
    if (!row) return null;
    return mapInstitution(row);
  } catch (err) {
    financeDbError(err);
  }
}

export async function getInstitutionAccountForSource(
  source: string,
): Promise<InstitutionAccount | null> {
  try {
    const rows = await inspectQuery<InstitutionRow>(
      `SELECT ${INSTITUTION_SELECT}
       FROM finance_institution_accounts WHERE ledger_source = $1 AND active = true
       ORDER BY id LIMIT 1`,
      [source],
    );
    const row = rows[0];
    if (!row) return null;
    return mapInstitution(row);
  } catch (err) {
    financeDbError(err);
  }
}

export async function updateInstitutionAccountSetup(input: {
  slug: string;
  manualBalance?: number | null;
  manualBalanceAsOf?: string | null;
  setupStatus?: string;
}): Promise<InstitutionAccount | null> {
  try {
    const sets: string[] = [];
    const params: unknown[] = [];
    let i = 1;

    if (input.manualBalance !== undefined) {
      sets.push(`manual_balance = $${i++}`);
      params.push(input.manualBalance);
    }
    if (input.manualBalanceAsOf !== undefined) {
      sets.push(`manual_balance_as_of = $${i++}`);
      params.push(input.manualBalanceAsOf);
    }
    if (input.setupStatus !== undefined) {
      sets.push(`setup_status = $${i++}`);
      params.push(input.setupStatus);
    }

    if (!sets.length) return getInstitutionAccountBySlug(input.slug);

    params.push(input.slug);
    await inspectExecute(
      `UPDATE finance_institution_accounts SET ${sets.join(", ")} WHERE slug = $${i}`,
      params,
    );
    return getInstitutionAccountBySlug(input.slug);
  } catch (err) {
    financeDbError(err);
  }
}
