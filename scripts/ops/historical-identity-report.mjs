import { migrationManifest } from '../../src/migrations/manifest.mjs';
import { diagnoseHistoricalIdentity, inspectMigrationSources } from './migration-integrity.mjs';

// Offline source-only report. Absence of a journal is explicit, never an empty history.
try {
  const sources = await inspectMigrationSources();
  console.log(JSON.stringify({ sources, historicalIdentity: diagnoseHistoricalIdentity(migrationManifest, undefined) }, null, 2));
  process.exitCode = 1; // No genuine historical evidence was supplied.
} catch {
  console.error('Historical identity report failed; inspect source availability locally.');
  process.exitCode = 1;
}
