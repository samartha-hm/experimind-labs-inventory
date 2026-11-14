import type { EntityManager } from "typeorm";
import { DraftKitError } from "./ProductTemplateService";

export const executionBlocker = "Legacy production and packing controls are read-only. Use the separately authorized trusted workflow panels when available. Preserve existing claims; do not release or recreate them to bypass this block.";

/** Schema capability, never a client flag or a per-project absence-of-claims fallback. */
export async function executionReadiness(db: Pick<EntityManager, "query">) {
  const [scope]: { integrated: boolean }[] = await db.query(
    "SELECT to_regclass('commitment_accounts') IS NOT NULL integrated");
  const fixtureOnly = process.env.VITEST === "true" && !scope.integrated;
  return { execution_enabled: fixtureOnly, blocker: fixtureOnly ? null : executionBlocker };
}

export async function assertExecutionSupported(db: Pick<EntityManager, "query">): Promise<void> {
  const readiness = await executionReadiness(db);
  if (!readiness.execution_enabled) throw new DraftKitError(409, executionBlocker);
}
