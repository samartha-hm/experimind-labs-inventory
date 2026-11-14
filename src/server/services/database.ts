import { env } from "../../config/env.ts";
import { AppDataSource, IdentityDataSource, ReceiptLedgerDataSource, databaseSchema } from "../../db.ts";
import { TrustedLedgerAuthority } from "../../security/TrustedLedgerAuthority";
import { assertDatabaseBoundary } from "../../security/databaseBoundary";
// Initialize Postgres (with retry)
export async function connectDatabase(retries = 3): Promise<TrustedLedgerAuthority | undefined> {
  let receiptAuthority: TrustedLedgerAuthority | undefined;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await AppDataSource.initialize();
      if (!process.env.IDENTITY_DATABASE_URL) throw new Error("IDENTITY_DATABASE_URL required");
      const schema = databaseSchema;
      await assertDatabaseBoundary(AppDataSource, "runtime", schema);
      await IdentityDataSource.initialize();
      await assertDatabaseBoundary(IdentityDataSource, "identity", schema);
      if (ReceiptLedgerDataSource) {
        const target=new URL(process.env.RECEIPT_LEDGER_DATABASE_URL!);
        const runtime=new URL(process.env.DATABASE_URL!);
        if(target.hostname!=="127.0.0.1" || target.port!=="55432" || target.pathname!=="/experimind_kitbuilder_test" ||
          target.hostname!==runtime.hostname || target.port!==runtime.port || target.pathname!==runtime.pathname ||
          !/^requirement_test_[a-f0-9]{32}$/.test(schema)) throw new Error("Synthetic receipt activation only");
        await ReceiptLedgerDataSource.initialize();
        receiptAuthority=await TrustedLedgerAuthority.create(ReceiptLedgerDataSource,env.jwtSecret,schema);
        const [installed]=await ReceiptLedgerDataSource.query("SELECT to_regclass('commitment_receipts') IS NOT NULL installed");
        if(!installed.installed)throw new Error("Receipt migration required");
      }
      console.log("PostgreSQL connected");
      return receiptAuthority;
    } catch (err) {
      console.error(`DB startup validation failed (${attempt}/${retries}); verify restricted credentials and grants`);
      receiptAuthority=undefined;
      if (ReceiptLedgerDataSource?.isInitialized) await ReceiptLedgerDataSource.destroy();
      if (IdentityDataSource.isInitialized) await IdentityDataSource.destroy();
      if (AppDataSource.isInitialized) await AppDataSource.destroy();
      if (attempt === retries) {
        throw new Error("Database authority validation failed; connection details suppressed");
      }
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}
