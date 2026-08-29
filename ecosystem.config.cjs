module.exports = {
  apps: [
    {
      name: 'experimind-inventory',
      script: './dist/server.cjs',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '400M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        DATABASE_URL: 'postgres://experimind:ExperimindPass2026!@127.0.0.1:5432/experimind_inventory',
        JWT_SECRET: 'experimind_jwt_super_secret_production_key_2026_x89',
        ALLOW_GUEST: 'false',
        GUEST_ROLE: 'viewer'
      }
    },
    {
      name: 'experimind-storefront',
      script: 'npm',
      args: 'start',
      cwd: './apps/storefront',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '200M',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      }
    }
  ]
};
