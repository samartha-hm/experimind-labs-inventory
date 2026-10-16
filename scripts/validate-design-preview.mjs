// Run against the DEV-only preview. AXE_SCRIPT points to a local axe-core/axe.min.js.
import { chromium, expect } from "@playwright/test";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
const output = ".local-dev/ux-13c";
const base = process.env.PREVIEW_URL || "http://127.0.0.1:5175";
const axe = await readFile(
  process.env.AXE_SCRIPT ||
    `${output}/tooling/node_modules/axe-core/axe.min.js`,
  "utf8",
);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  channel: "msedge",
  headless: true,
  ignoreDefaultArgs: ["--no-sandbox"],
});
const page = await browser.newPage({
  viewport: { width: 1440, height: 1000 },
  reducedMotion: "reduce",
});
// Remote font availability is outside this local interaction/a11y check.
await page.route(/https:\/\/fonts\.(googleapis|gstatic)\.com\//, (route) =>
  route.abort(),
);
const report = { checks: [], audits: [], layouts: [], errors: [] };
page.on("pageerror", (error) => report.errors.push(error.message));
const record = (name) => {
  report.checks.push(name);
  console.log(`PASS ${name}`);
};
const shot = (name) =>
  page.screenshot({ path: `${output}/${name}.png`, fullPage: true });
async function open(view) {
  await page.goto(`${base}/__design/13b#${view}`, {
    waitUntil: "domcontentloaded",
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page
    .getByRole("heading", {
      name: view === "kit" ? "1 · Education" : "Reviewer decision",
      exact: true,
    })
    .waitFor();
}
async function audit(name) {
  await page.addScriptTag({ content: axe });
  const result = await page.evaluate(async () => {
    const results = await window.axe.run(document, {
      runOnly: {
        type: "tag",
        values: ["wcag2a", "wcag2aa", "wcag21aa", "best-practice"],
      },
    });
    return {
      violations: results.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        description: v.description,
        nodes: v.nodes.map((n) => ({
          target: n.target,
          summary: n.failureSummary,
        })),
      })),
      incomplete: results.incomplete.map((v) => ({
        id: v.id,
        count: v.nodes.length,
        nodes: v.nodes.map((n) => ({
          target: n.target,
          summary: n.failureSummary,
        })),
      })),
      passes: results.passes.length,
    };
  });
  report.audits.push({ name, ...result });
  console.log(`AUDIT ${name}: ${result.violations.length} violations`);
}
async function layout(name) {
  const result = await page.evaluate(() => ({
    viewport: innerWidth,
    width: document.documentElement.scrollWidth,
    height: document.documentElement.scrollHeight,
  }));
  report.layouts.push({ name, ...result });
  assert.ok(
    result.width <= result.viewport + 1,
    `${name} horizontal overflow: ${JSON.stringify(result)}`,
  );
}
try {
  await open("kit");
  await shot("after-kit-desktop");
  await audit("kit-light-desktop");
  await layout("kit-desktop");
  const compare = page.getByRole("button", {
    name: "Compare revisions",
    exact: true,
  });
  await compare.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", {
    name: "Revision comparison",
    exact: true,
  });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("No differences");
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press("Tab");
    assert.equal(
      await dialog.evaluate((el) => el.contains(document.activeElement)),
      true,
    );
  }
  await page.keyboard.press("Escape");
  await expect(compare).toBeFocused();
  record("keyboard dialog containment, Escape and focus restoration");
  await page.getByLabel("Activity location", { exact: true }).selectOption("");
  await page.getByRole("button", { name: "Review", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Review in memory", exact: true }),
  ).toBeDisabled();
  await page.getByLabel("Grade", { exact: true }).selectOption("s9");
  await expect(
    page.getByRole("button", { name: "Review in memory", exact: true }),
  ).toBeDisabled();
  record("missing mapping blocks review across grade navigation");
  await page
    .getByRole("button", {
      name: "Show revision conflict example",
      exact: true,
    })
    .click();
  await expect(page.getByRole("alert")).toContainText("draft editing paused");
  await page
    .getByRole("button", { name: "Inspect retained changes", exact: true })
    .click();
  await expect(dialog).toContainText("Unassigned");
  await shot("after-kit-conflict");
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "End simulation · retain draft", exact: true })
    .click();
  await page.getByLabel("Grade", { exact: true }).selectOption("s8");
  await expect(
    page.getByLabel("Activity location", { exact: true }),
  ).toHaveValue("");
  await page
    .getByLabel("Revision view", { exact: true })
    .selectOption("approved");
  await expect(
    page.getByLabel("Activity location", { exact: true }),
  ).toHaveValue("Pouch A");
  await expect(
    page.getByLabel("Activity location", { exact: true }),
  ).toBeDisabled();
  await page.getByLabel("Revision view", { exact: true }).selectOption("draft");
  await page
    .getByLabel("Activity location", { exact: true })
    .selectOption("Pouch A");
  record(
    "revision differences, retained conflict draft and immutable approved baseline",
  );
  await page
    .getByRole("button", { name: "Set allocations", exact: true })
    .click();
  await page
    .getByLabel("Explicit complete Science sets", { exact: true })
    .fill("3");
  await expect(page.getByRole("alert")).toContainText(
    "Quantity preview unavailable",
  );
  await page.getByRole("button", { name: "Review", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Review in memory", exact: true }),
  ).toBeDisabled();
  await audit("kit-invalid-allocation");
  await shot("after-kit-validation");
  await page
    .getByLabel("Explicit complete Science sets", { exact: true })
    .fill("1");
  await page.getByLabel("Mathematics 8 sets", { exact: true }).fill("0");
  await page.getByRole("button", { name: "Quantities", exact: true }).click();
  await expect(
    page.getByText("1 explicitly allocated complete sets × 1 = 1", {
      exact: true,
    }),
  ).toBeVisible();
  record(
    "explicit complete allocation validation and independent Mathematics inputs",
  );
  await page
    .getByLabel("Find activity", { exact: true })
    .fill("no-such-activity");
  await expect(
    page.getByText("No activities match", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Clear activity search", exact: true })
    .click();
  await page
    .getByLabel("Dense fixture · 24 activities", { exact: true })
    .check();
  await expect(
    page
      .getByRole("navigation", { name: "Educational activities" })
      .getByRole("button"),
  ).toHaveCount(24);
  await page
    .getByRole("button", { name: "Materials & mapping", exact: true })
    .click();
  await page.getByRole("button", { name: "Packing", exact: true }).click();
  await page
    .getByText("Inspect 12 additional partitions", { exact: true })
    .click();
  await page.setViewportSize({ width: 1024, height: 768 });
  await layout("kit-dense-tablet-landscape");
  await shot("after-kit-dense-tablet");
  await audit("kit-dense-tablet");
  record("empty search, 24 long activities and dense package tree");
  await open("kit");
  await shot("after-kit-tablet-landscape");
  await layout("kit-tablet-landscape");
  await page.setViewportSize({ width: 768, height: 1024 });
  await layout("kit-tablet-portrait");
  await shot("after-kit-tablet-portrait");
  await page.setViewportSize({ width: 512, height: 384 });
  await layout("kit-200-percent-equivalent");
  await page.setViewportSize({ width: 375, height: 812 });
  await layout("kit-narrow");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page
    .getByRole("button", { name: "Switch to dark theme", exact: true })
    .click();
  await audit("kit-dark-desktop");
  await shot("after-kit-dark-desktop");
  record("light/dark, tablet portrait/landscape and 200% equivalent reflow");
  await open("packing");
  await page.setViewportSize({ width: 1024, height: 768 });
  await shot("after-packing-tablet");
  await audit("packing-light-tablet");
  await layout("packing-tablet");
  const targets = await page
    .locator(
      ".p-floor-refined .p-button, .p-floor-refined select, .p-floor-refined .p-check-row",
    )
    .evaluateAll((els) =>
      els.map((el) => ({
        text: el.textContent?.trim().slice(0, 40),
        height: el.getBoundingClientRect().height,
      })),
    );
  assert.ok(
    targets.filter((t) => t.height > 0).every((t) => t.height >= 56),
    JSON.stringify(targets),
  );
  report.targets = targets;
  const role = page.getByLabel("Sample role", { exact: true });
  const approve = page.getByRole("button", {
    name: "Approve sample QC",
    exact: true,
  });
  await expect(approve).toBeDisabled();
  for (const box of await page
    .locator(".p-floor-refined .p-check-row input")
    .all())
    await box.check();
  await expect(approve).toBeDisabled();
  await page.getByRole("button", { name: "Send to sample QC review" }).click();
  await expect(approve).toBeDisabled();
  await role.selectOption("reviewer");
  await page
    .getByRole("button", { name: "Reject with reason", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Record the failed check",
  );
  await page.locator("textarea").fill("Seal damaged during final inspection");
  await page
    .getByRole("button", { name: "Reject with reason", exact: true })
    .click();
  await expect(approve).toBeDisabled();
  await shot("after-packing-rejected");
  await role.selectOption("operator");
  await page.locator("textarea").fill("Replaced pouch and protective wrap");
  await page
    .getByRole("button", { name: "Record correction", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Open exception · approval held" }),
  ).toBeVisible();
  await role.selectOption("reviewer");
  await page
    .getByRole("button", { name: "Open reinspection", exact: true })
    .click();
  await expect(
    page.locator(".p-floor-refined .p-check-row input:checked"),
  ).toHaveCount(0);
  await role.selectOption("operator");
  for (const box of await page
    .locator(".p-floor-refined .p-check-row input")
    .all())
    await box.check();
  await page.getByRole("button", { name: "Send to sample QC review" }).click();
  await role.selectOption("reviewer");
  await approve.click();
  await expect(
    page.getByRole("heading", {
      name: "Resolved exception · retained history",
    }),
  ).toBeVisible();
  await expect(page.locator(".p-exception")).toContainText("Seal damaged");
  await expect(page.locator(".p-exception")).toContainText("Replaced pouch");
  await shot("after-packing-resolved");
  record(
    "56px targets and separate reject/correct/reinspect/approve preserving exception",
  );
  for (const state of ["loading", "error", "offline", "denied"]) {
    await page
      .getByLabel("Connection scenario", { exact: true })
      .selectOption(state);
    await expect(approve).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Look up package", exact: true }),
    ).toBeDisabled();
  }
  await shot("after-packing-denied");
  await page
    .getByRole("button", { name: "Restore sample connection", exact: true })
    .click();
  const lookup = page.getByLabel("Scan or enter a sample package reference", {
    exact: true,
  });
  await lookup.fill("UNKNOWN");
  await lookup.press("Enter");
  await expect(
    page.getByRole("heading", { name: "No matching package" }),
  ).toBeVisible();
  await expect(approve).toBeDisabled();
  await page
    .getByRole("button", { name: "Use sample package", exact: true })
    .click();
  await lookup.fill(" demo-pkg-018 ");
  await lookup.press("Enter");
  await expect(page.locator("#scan-feedback")).toContainText("Package found");
  record(
    "loading/error/offline/permission denial, unknown lookup and scanner-style Enter feedback",
  );
  await page
    .getByRole("button", { name: "Switch to dark theme", exact: true })
    .click();
  await audit("packing-dark-tablet");
  await shot("after-packing-dark-tablet");
  await page.setViewportSize({ width: 768, height: 1024 });
  await layout("packing-portrait");
  await page.setViewportSize({ width: 512, height: 384 });
  await layout("packing-200-percent-equivalent");
  const motion = await page
    .locator(".p-button")
    .first()
    .evaluate((el) => ({
      matches: matchMedia("(prefers-reduced-motion: reduce)").matches,
      duration: getComputedStyle(el).transitionDuration,
    }));
  assert.ok(motion.matches);
  assert.equal(motion.duration, "0s");
  report.motion = motion;
  record("reduced-motion preference and action transitions");
  await open("kit");
  await page.keyboard.press("Control+k");
  const command = page.getByRole("dialog", {
    name: "Jump to a workspace",
    exact: true,
  });
  await expect(command).toBeVisible();
  await page
    .getByLabel("Search workspaces", { exact: true })
    .fill("not-a-workspace");
  await expect(command).toContainText("No workspace found");
  await page.getByLabel("Search workspaces", { exact: true }).fill("packing");
  await command
    .getByRole("button", { name: "Packing & QC", exact: true })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
  record(
    "command search empty state, keyboard activation and destination focus",
  );
  assert.deepEqual(report.errors, []);
} finally {
  await writeFile(
    `${output}/browser-report.json`,
    JSON.stringify(report, null, 2),
  );
  await browser.close();
}
assert.equal(
  report.audits.reduce((n, a) => n + a.violations.length, 0),
  0,
  "Review axe violations in browser-report.json",
);
