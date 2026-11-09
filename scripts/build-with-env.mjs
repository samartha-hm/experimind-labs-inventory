import { loadEnvFile } from 'node:process';
import { spawnSync } from 'node:child_process';

// Vite flags must be loaded before compilation; server runtime flags are too late.
const [envFile, ...extra] = process.argv.slice(2);
if (!envFile || extra.length || !process.env.npm_execpath) {
  console.error('Usage: npm run build:with-env -- <environment-file>');
  process.exit(1);
}
try {
  loadEnvFile(envFile);
  const result = spawnSync(process.execPath, [process.env.npm_execpath, 'run', 'build'], {
    stdio: 'inherit',
    env: process.env,
  });
  if (result.error) throw result.error;
  process.exit(result.status ?? 1);
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Environment build failed');
  process.exit(1);
}
