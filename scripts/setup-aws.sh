#!/usr/bin/env bash
set -e

echo "=== 1. Setting up 2GB Swapfile (Preventing OOM on 512MB RAM) ==="
if [ ! -f /swapfile ]; then
  sudo fallocate -l 2G /swapfile || sudo dd if=/dev/zero of=/swapfile bs=1M count=2048
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
  echo "Swapfile successfully created and activated."
else
  echo "Swapfile already exists."
fi

echo "=== 2. Updating OS packages and installing prerequisites ==="
sudo apt-get update -y
sudo apt-get install -y curl wget git nginx postgresql postgresql-contrib build-essential

echo "=== 3. Installing Node.js 20 LTS ==="
if ! command -v node &> /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
node -v
npm -v

echo "=== 4. Installing PM2 Process Manager ==="
sudo npm install -g pm2
sudo pm2 startup systemd -u admin --hp /home/admin || true

echo "=== 5. Setting up PostgreSQL database & user ==="
sudo systemctl enable postgresql
sudo systemctl start postgresql

sudo -u postgres psql -c "DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'experimind') THEN
    CREATE ROLE experimind WITH LOGIN PASSWORD 'ExperimindPass2026!';
  ELSE
    ALTER ROLE experimind WITH PASSWORD 'ExperimindPass2026!';
  END IF;
END
\$\$;"

sudo -u postgres psql -c "SELECT 1 FROM pg_database WHERE datname = 'experimind_inventory'" | grep -q 1 || sudo -u postgres createdb -O experimind experimind_inventory

echo "=== 6. Configuring Nginx Reverse Proxy ==="
sudo tee /etc/nginx/sites-available/experimind > /dev/null <<'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    client_max_body_size 100M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -sf /etc/nginx/sites-available/experimind /etc/nginx/sites-enabled/experimind
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx

echo "=== AWS SERVER ENVIRONMENT SETUP COMPLETE! ==="
