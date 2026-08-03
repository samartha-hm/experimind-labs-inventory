# SETUP AND DEPLOYMENT GUIDE - NEXAINVENTORY ERP

This guide provides step-by-step instructions for setting up PostgreSQL, running data migrations, starting the backend API server, and launching the frontend application.

---

## 1. PREREQUISITES

- **Node.js**: v20.x or higher (v24.x recommended)
- **PostgreSQL**: PostgreSQL 15+ (PostgreSQL 18 recommended)
- **npm**: v10+

---

## 2. ENVIRONMENT CONFIGURATION (`.env`)

Create a `.env` file in the root directory `e:\experimindlabs\inventory\.env` with the following variables:

```env
PORT=3000
NODE_ENV=development

# PostgreSQL Connection
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=@1s2s3s4s5S
DB_NAME=experimind

# Database Connection String
DATABASE_URL=postgres://postgres:@1s2s3s4s5S@localhost:5432/experimind

# JWT Secret
JWT_SECRET=super_secret_jwt_key_experimind_2026
```

---

## 3. DATABASE CREATION

If the `experimind` database does not exist yet:

### Option A: Using Node.js Helper Script (Recommended)
```powershell
node scripts/create-database.js
```

### Option B: Using pgAdmin GUI
1. Open pgAdmin 4.
2. Connect to localhost:5432 using user `postgres` and your password.
3. Right-click Databases -> Create -> Database: `experimind`.

---

## 4. RUNNING DATA MIGRATION & SEEDING

To populate PostgreSQL with initial inventory items, kits, vendors, purchase orders, and sales orders:

```powershell
npm run migrate
```

---

## 5. STARTING THE APPLICATION

### Start Development Server (Full Stack: Backend API + React Frontend)
```powershell
npm start
```
- Open your browser at `http://localhost:3000/`.
- Click **Continue as Guest Admin** or sign in with your credentials.

---

## 6. PRODUCTION BUILD

To build the production web bundle:
```powershell
npm run build
```
The compiled static assets will be emitted into `dist/`.
