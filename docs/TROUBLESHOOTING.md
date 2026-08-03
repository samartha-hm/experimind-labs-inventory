# TROUBLESHOOTING AND DIAGNOSTICS GUIDE - NEXAINVENTORY ERP

This document contains diagnostic tools, common runtime error resolutions, and troubleshooting procedures for NexaInventory ERP.

---

## 1. COMMON ISSUES & RESOLUTIONS

### Issue A: `ConnectionNotFoundError: No connection "default" was found`
- **Cause**: TypeORM `AppDataSource` was invoked before `initialize()` completed or multiple connection pools were opened.
- **Solution**: Services use `AppDataSource` getter functions that verify `AppDataSource.isInitialized` before executing queries.

### Issue B: `Error [ERR_MODULE_NOT_FOUND]` or Import Resolution Errors
- **Cause**: Node.js ES Modules (`"type": "module"`) require explicit `.ts` or `.js` file extensions on relative imports in backend source code.
- **Solution**: Ensure all backend imports use explicit file extensions.

### Issue C: PostgreSQL Connection Failed
- **Cause**: PostgreSQL service is stopped or port 5432 is blocked.
- **Solution**:
  1. Verify PostgreSQL service status:
     ```powershell
     Get-Service -Name "postgresql*"
     ```
  2. Start service if stopped:
     ```powershell
     Start-Service -Name "postgresql-x64-18"
     ```

### Issue D: Build / TypeScript Verification Error
- **Solution**: Run TypeScript compiler verification to pinpoint syntax or prop mismatches:
  ```powershell
  npm run lint
  ```

---

## 2. DIAGNOSTIC UTILITIES

Run diagnostic scripts located in the codebase:
- `node check-deps.js` - Validates `node_modules` packages.
- `node check-env.js` - Validates `.env` database configuration parameters.
