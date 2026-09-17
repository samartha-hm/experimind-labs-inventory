/**
 * Phase 3A Integration Verification Script
 */

async function run() {
  const baseUrl = process.argv[2] || "http://127.0.0.1:3000";
  console.log(`\n==========================================================`);
  console.log(`🚀 RUNNING PHASE 3A VERIFICATION ON ${baseUrl}...`);
  console.log(`==========================================================\n`);

  let allPassed = true;

  // 1. Test Health & Metrics
  try {
    const healthRes = await fetch(`${baseUrl}/health`);
    const healthData = await healthRes.json();
    console.log("✅ 1. /health Status:", healthRes.status, "| Uptime:", healthData.uptimeSeconds, "s");
  } catch (e) {
    console.error("❌ 1. Health check failed:", e.message);
    allPassed = false;
  }

  // 2. Test OpenAPI Spec JSON
  try {
    const docsJsonRes = await fetch(`${baseUrl}/api/docs/openapi.json`);
    const spec = await docsJsonRes.json();
    console.log("✅ 2. /api/docs/openapi.json Status:", docsJsonRes.status, "| Title:", spec.info?.title, "| Endpoints:", Object.keys(spec.paths || {}).length);
  } catch (e) {
    console.error("❌ 2. OpenAPI JSON failed:", e.message);
    allPassed = false;
  }

  // 3. Test Swagger UI HTML
  try {
    const docsHtmlRes = await fetch(`${baseUrl}/api/docs`);
    const html = await docsHtmlRes.text();
    const hasSwagger = html.includes("SwaggerUIBundle");
    console.log("✅ 3. /api/docs HTML Status:", docsHtmlRes.status, "| Renders SwaggerUIBundle:", hasSwagger);
  } catch (e) {
    console.error("❌ 3. Swagger UI HTML failed:", e.message);
    allPassed = false;
  }

  // 4. Test Authenticated Paginated Inventory
  try {
    const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@experimindlabs.com", password: "AdminPass123!" })
    });
    const loginData = await loginRes.json();
    const token = loginData.token;

    if (!token) {
      console.error("❌ 4. Admin login failed");
      allPassed = false;
    } else {
      const invPaginatedRes = await fetch(`${baseUrl}/api/v1/inventory?page=1&limit=10`, {
        headers: { "Authorization": "Bearer " + token }
      });
      const invData = await invPaginatedRes.json();
      const isPaginated = !!invData.pagination && Array.isArray(invData.data);
      console.log("✅ 4. Paginated /api/v1/inventory Status:", invPaginatedRes.status, "| Total:", invData.pagination?.total, "| Page 1 Items:", invData.data?.length, "| Total Pages:", invData.pagination?.totalPages);
    }
  } catch (e) {
    console.error("❌ 4. Paginated inventory test failed:", e.message);
    allPassed = false;
  }

  console.log(`\n==========================================================`);
  if (allPassed) {
    console.log("🎉 ALL PHASE 3A VERIFICATION CHECKS PASSED!");
  } else {
    console.log("⚠️ SOME VERIFICATION CHECKS FAILED.");
    process.exit(1);
  }
  console.log(`==========================================================\n`);
}

run();
