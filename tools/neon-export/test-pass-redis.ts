/** Disposable Redis integration check with an isolated key prefix. */
import { redisCommand } from "@/lib/sunday-nights/redis-live-state";
import { PASS_KEYS } from "@/lib/retroverse-pass/redis-data";
import { claimPass, recordPassActivity, scanPass, updatePassVisitor } from "@/lib/retroverse-pass/store";
import { registerCollectorPass, listCollectorPassRegistrations } from "@/lib/collector-pass/registrations";
import { assignPass, listMembers, saveMember } from "@/lib/retroverse-pass/management";
import { deletePass, listPassActivity, resetPassClaim, updatePassSerial } from "@/lib/retroverse-pass/pass-management";

async function main() {
  if (!process.env.RETROVERSE_PASS_KEY_PREFIX?.startsWith("rv:test:pass:")) throw new Error("Isolated test prefix required");
  const serial = "MIGRATION_TEST_PASS";
  try {
    if (await scanPass(serial)) throw new Error("test key is already in use");
    const first = await claimPass({ serial, firstName: "Test", email: "test@example.invalid" });
    const again = await claimPass({ serial, firstName: "Ignored" });
    const scanned = await scanPass(serial);
    if (first.state !== "claimed" || again.visitor.id !== first.visitor.id || scanned?.state !== "claimed") {
      throw new Error("claim or idempotency failed");
    }
    const edited = await updatePassVisitor({ serial, firstName: "Updated", email: "updated@example.invalid" });
    if (edited.visitor.firstName !== "Updated") throw new Error("visitor update failed");
    await recordPassActivity({ visitorId: edited.visitor.id, passSerial: serial, eventType: "PASS_SCANNED" });
    const count = await redisCommand(["LLEN", PASS_KEYS.activity]);
    if (Number(count) !== 3) throw new Error("activity append failed");
    await registerCollectorPass({ passNumber: "TEST-1", firstName: "Test", lastName: "Person" });
    if ((await listCollectorPassRegistrations()).length !== 1) throw new Error("collector registration failed");
    const memberId = await saveMember({ firstName: "Joined" });
    if (!(await listMembers()).some((member) => member.id === memberId)) throw new Error("member join failed");
    await updatePassSerial(serial, "MIGRATION_TEST_RENAMED");
    await resetPassClaim("MIGRATION_TEST_RENAMED");
    await assignPass("MIGRATION_TEST_RENAMED", memberId);
    if (!(await listPassActivity("MIGRATION_TEST_RENAMED")).length) throw new Error("pass history failed");
    await deletePass("MIGRATION_TEST_RENAMED");
    if (await scanPass("MIGRATION_TEST_RENAMED")) throw new Error("pass delete failed");
    console.log("pass integration: claim, scan, edit, activity, registration, member and operator actions verified");
  } finally {
    await redisCommand(["DEL", ...Object.values(PASS_KEYS)]);
  }
}
void main().catch((error) => { console.error(error instanceof Error ? error.message : "pass test failed"); process.exitCode = 1; });
