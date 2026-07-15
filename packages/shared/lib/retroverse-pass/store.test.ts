import assert from "node:assert/strict";
import test from "node:test";

import { claimPassWithClient, PassRegistrationInputError, scanPass, updateVisitorWithClient } from "./store";

test("exact scan preserves an existing registered pass", async () => {
  const rows = new Map<string, Record<string, unknown>[]>([
    ["pass", [{ serial: "RVSN000001", claimed: true, visitor_id: 9, claimed_at: new Date(0) }]],
    ["visitor", [{ id: 9, first_name: "Existing", email: "existing@example.com", phone: null, created_at: new Date(0) }]],
  ]);
  const result = await scanPass("RVSN000001", async (sql) =>
    (sql.includes("FROM retroverse_passes") ? rows.get("pass") : rows.get("visitor")) as never,
  );
  assert.equal(result?.state, "claimed");
  assert.equal(result?.pass.serial, "RVSN000001");
});

test("unknown credential is provisioned once and repeat registration returns existing state", async () => {
  let pass: { serial: string; claimed: boolean; visitor_id: number | null; claimed_at: Date | null } | null = null;
  let visitor: Record<string, unknown> | null = null;
  let visitorInsertCount = 0;
  const client = {
    async query<T extends Record<string, unknown>>(sql: string, params: unknown[] = []) {
      if (sql.startsWith("INSERT INTO retroverse_passes")) {
        pass ??= { serial: String(params[0]), claimed: false, visitor_id: null, claimed_at: null };
        return { rows: [] as T[] };
      }
      if (sql.startsWith("SELECT serial")) return { rows: [pass as T] };
      if (sql.startsWith("INSERT INTO retroverse_visitors")) {
        visitorInsertCount += 1;
        visitor = { id: 12, first_name: params[0], email: params[1], phone: params[2], created_at: new Date(0) };
        return { rows: [visitor as T] };
      }
      if (sql.startsWith("UPDATE retroverse_passes")) {
        pass = { ...pass!, claimed: true, visitor_id: 12, claimed_at: new Date(0) };
        return { rows: [pass as T] };
      }
      if (sql.startsWith("SELECT id")) return { rows: [visitor as T] };
      return { rows: [] as T[] };
    },
  };

  const input = { credential: "EVENT-2026-0001", firstName: "Pat", email: "pat@example.com", phone: null };
  const first = await claimPassWithClient(client, input);
  const repeated = await claimPassWithClient(client, input);
  assert.equal(first.pass.serial, "EVENT-2026-0001");
  assert.equal(repeated.visitor.id, first.visitor.id);
  assert.equal(visitorInsertCount, 1);
});

test("claiming with first name only stores null email and phone", async () => {
  const client = {
    async query<T extends Record<string, unknown>>(sql: string, params: unknown[] = []) {
      if (sql.startsWith("INSERT INTO retroverse_passes")) return { rows: [] as T[] };
      if (sql.startsWith("SELECT serial")) {
        return { rows: [{ serial: "RVSN00427", claimed: false, visitor_id: null, claimed_at: null } as T] };
      }
      if (sql.startsWith("INSERT INTO retroverse_visitors")) {
        assert.equal(params[1], null);
        assert.equal(params[2], null);
        return {
          rows: [{ id: 5, first_name: params[0], email: null, phone: null, created_at: new Date(0) } as T],
        };
      }
      if (sql.startsWith("UPDATE retroverse_passes")) {
        return { rows: [{ serial: "RVSN00427", claimed: true, visitor_id: 5, claimed_at: new Date(0) } as T] };
      }
      return { rows: [] as T[] };
    },
  };
  const result = await claimPassWithClient(client, {
    credential: "RVSN00427",
    firstName: "Testy",
    email: null,
    phone: null,
  });
  assert.equal(result.visitor.email, null);
  assert.equal(result.visitor.phone, null);
});

test("editing an already-claimed pass updates the visitor and logs PASS_EDITED", async () => {
  let activityEventType: string | null = null;
  const client = {
    async query<T extends Record<string, unknown>>(sql: string, params: unknown[] = []) {
      if (sql.startsWith("SELECT serial")) {
        return { rows: [{ serial: "RVSN00001", claimed: true, visitor_id: 1, claimed_at: new Date(0) } as T] };
      }
      if (sql.startsWith("UPDATE retroverse_visitors")) {
        return {
          rows: [
            { id: 1, first_name: params[1], email: params[2], phone: params[3], created_at: new Date(0) } as T,
          ],
        };
      }
      if (sql.startsWith("INSERT INTO retroverse_pass_activity")) {
        activityEventType = sql.includes("'PASS_EDITED'") ? "PASS_EDITED" : "OTHER";
        return { rows: [] as T[] };
      }
      return { rows: [] as T[] };
    },
  };
  const result = await updateVisitorWithClient(client, {
    credential: "RVSN00001",
    firstName: "Bobby",
    email: "bobby@example.com",
    phone: null,
  });
  assert.equal(result.visitor.firstName, "Bobby");
  assert.equal(result.visitor.email, "bobby@example.com");
  assert.equal(activityEventType, "PASS_EDITED");
});

test("editing an unclaimed pass fails cleanly instead of creating a registration", async () => {
  const client = {
    async query<T extends Record<string, unknown>>(sql: string) {
      if (sql.startsWith("SELECT serial")) {
        return { rows: [{ serial: "RVSN00427", claimed: false, visitor_id: null, claimed_at: null } as T] };
      }
      return { rows: [] as T[] };
    },
  };
  await assert.rejects(
    () => updateVisitorWithClient(client, { credential: "RVSN00427", firstName: "Nobody", email: null, phone: null }),
    PassRegistrationInputError,
  );
});

test("editing an unknown serial fails cleanly", async () => {
  const client = {
    async query<T extends Record<string, unknown>>() {
      return { rows: [] as T[] };
    },
  };
  await assert.rejects(
    () => updateVisitorWithClient(client, { credential: "RVSN99999", firstName: "Nobody", email: null, phone: null }),
    PassRegistrationInputError,
  );
});
