import { expect, test, type Page } from "@playwright/test";
import { CreateBucketCommand, S3Client } from "@aws-sdk/client-s3";

type Problem = {
  kind: "console" | "pageerror" | "request";
  message: string;
};

const staticRoutes = [
  { path: "/", heading: /See what changes/i },
  { path: "/app", heading: /Dashboard/i },
  { path: "/app/patients", heading: /Patients/i },
  { path: "/app/patients/new", heading: /New patient/i },
  { path: "/app/settings/org", heading: /Organization/i },
  { path: "/app/settings/profile", heading: /Profile/i },
  { path: "/app/settings/members", heading: /Members/i },
  { path: "/app/settings/devices", heading: /Devices/i },
  { path: "/accept-invite", heading: /Dashboard/i },
  { path: "/onboarding/create-org", heading: /Dashboard/i },
  { path: "/onboarding/invite", heading: /Members/i },
  { path: "/login", heading: /Dashboard/i },
  { path: "/signup", heading: /Dashboard/i },
] as const;

const onePixelWebp = Buffer.from(
  "UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAgA0JaQAA3AA/vuUAAA=",
  "base64",
);

function monitorPage(page: Page) {
  const problems: Problem[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      problems.push({ kind: "console", message: message.text() });
    }
  });

  page.on("pageerror", (error) => {
    problems.push({ kind: "pageerror", message: error.message });
  });

  page.on("requestfailed", (request) => {
    const failure = request.failure();
    const url = request.url();
    if (url.startsWith("data:") || failure?.errorText === "net::ERR_ABORTED") {
      return;
    }
    problems.push({
      kind: "request",
      message: `${request.method()} ${url} ${failure?.errorText ?? ""}`.trim(),
    });
  });

  return {
    async assertClean() {
      expect(problems).toEqual([]);
    },
  };
}

async function expectHealthyPage(page: Page, path: string, heading: RegExp) {
  const response = await page.goto(path, { waitUntil: "load" });
  expect(response?.status(), `${path} should return a successful status`).toBeLessThan(
    400,
  );
  await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible();
  await expect(page.locator("body")).not.toContainText(
    /Application error|Unhandled Runtime Error|This page could not be found/i,
  );
}

async function expectNoDocumentOverflow(page: Page) {
  const overflow = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
    scrollXBefore: window.scrollX,
    scrollXAfter: (() => {
      const y = window.scrollY;
      window.scrollTo(9999, y);
      const x = window.scrollX;
      window.scrollTo(0, y);
      return x;
    })(),
    height: document.documentElement.clientHeight,
    scrollHeight: document.documentElement.scrollHeight,
  }));
  expect(
    overflow.scrollXAfter,
    `document should not be horizontally pannable (${JSON.stringify(overflow)})`,
  ).toBeLessThanOrEqual(1);
}

async function expectAccessibleControls(page: Page) {
  const violations = await page.evaluate(() => {
    const controlName = (element: Element) =>
      element.getAttribute("aria-label") ??
      element.getAttribute("title") ??
      element.textContent?.trim() ??
      "";

    return {
      unnamedButtons: Array.from(document.querySelectorAll("button")).filter(
        (button) => controlName(button).length === 0,
      ).length,
      emptyLinks: Array.from(document.querySelectorAll("a[href]")).filter(
        (link) => controlName(link).length === 0,
      ).length,
      imagesWithoutAlt: Array.from(document.querySelectorAll("img")).filter(
        (image) => !image.hasAttribute("alt"),
      ).length,
    };
  });

  expect(violations).toEqual({
    unnamedButtons: 0,
    emptyLinks: 0,
    imagesWithoutAlt: 0,
  });
}

async function collectInternalLinks(page: Page) {
  return page.evaluate(() => {
    const origin = window.location.origin;
    return Array.from(document.querySelectorAll<HTMLAnchorElement>("a[href]"))
      .map((link) => link.href)
      .filter((href) => href.startsWith(origin))
      .map((href) => new URL(href).pathname)
      .filter((pathname) => !pathname.startsWith("/api/"))
      .filter((pathname, index, all) => all.indexOf(pathname) === index)
      .sort();
  });
}

async function ensureStorageBucket() {
  const client = new S3Client({
    region: process.env.S3_REGION ?? "us-east-1",
    endpoint: process.env.S3_ENDPOINT ?? "http://localhost:9000",
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "minioadmin",
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "minioadmin",
    },
  });

  try {
    await client.send(
      new CreateBucketCommand({
        Bucket: process.env.S3_BUCKET ?? "lumiscan-dev",
      }),
    );
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    if (!["BucketAlreadyExists", "BucketAlreadyOwnedByYou"].includes(name)) {
      throw error;
    }
  } finally {
    client.destroy();
  }
}

test.beforeAll(async () => {
  await ensureStorageBucket();
});

test.describe("page health and responsive rendering", () => {
  for (const route of staticRoutes) {
    test(`${route.path} renders without browser errors`, async ({ page }, testInfo) => {
      const monitor = monitorPage(page);
      await expectHealthyPage(page, route.path, route.heading);
      await expectNoDocumentOverflow(page);
      await expectAccessibleControls(page);
      await page.screenshot({
        caret: "initial",
        fullPage: true,
        path: testInfo.outputPath(
          `screenshots/${testInfo.project.name}${route.path.replaceAll("/", "_") || "_root"}.png`,
        ),
      });
      await monitor.assertClean();
    });
  }
});

test("visible internal links resolve", async ({ page }) => {
  const monitor = monitorPage(page);
  const visited = new Set<string>();

  for (const route of staticRoutes.filter(
    (item) => item.path.startsWith("/app") || item.path === "/",
  )) {
    await expectHealthyPage(page, route.path, route.heading);
    for (const link of await collectInternalLinks(page)) {
      visited.add(link);
    }
  }

  for (const link of Array.from(visited).sort()) {
    const response = await page.goto(link, { waitUntil: "domcontentloaded" });
    expect(response?.status(), `${link} should resolve`).toBeLessThan(400);
    await expect(page.locator("body")).not.toContainText(
      /This page could not be found|Application error/i,
    );
  }

  await monitor.assertClean();
});

test("patient, lesion, scan, management, and device workflows work", async ({
  page,
}, testInfo) => {
  const monitor = monitorPage(page);
  const suffix = `${testInfo.project.name}-${Date.now()}`.replaceAll(
    /[^a-zA-Z0-9-]/g,
    "",
  );

  await expectHealthyPage(page, "/app/patients/new", /New patient/i);
  await page.getByLabel("First name").fill("Audit");
  await page.getByLabel("Last name").fill(`Patient ${testInfo.project.name}`);
  await page.getByLabel("Date of birth").fill("1988-02-13");
  await page.getByLabel("MRN").fill(`AUD-${suffix}`);
  await page.getByLabel("Email").fill(`audit-${suffix}@example.invalid`);
  await page.getByLabel("Phone").fill("+15550101010");
  await page.getByLabel("Address").fill("1 Audit Way");
  await page.getByLabel("Notes").fill("Created by the browser audit.");
  await Promise.all([
    page.waitForURL(
      (url) =>
        /^\/app\/patients\/[^/]+$/.test(url.pathname) && !url.pathname.endsWith("/new"),
    ),
    page.getByRole("button", { name: "Create patient" }).click(),
  ]);
  await expect(
    page.getByRole("heading", { name: /Audit Patient/i }).first(),
  ).toBeVisible();

  await page
    .getByRole("link", { name: /New lesion/i })
    .first()
    .click();
  await expect(page.getByRole("heading", { name: /New lesion/i })).toBeVisible();
  await page.getByLabel("Body region").selectOption("UPPER_BACK");
  await page.getByLabel("Side").selectOption("LEFT");
  await page.getByLabel("Precise location").fill("2 cm superior to left scapula");
  await page
    .getByLabel("Clinical description")
    .fill("Small asymmetric macule for audit flow.");
  await Promise.all([
    page.waitForURL(
      (url) =>
        /^\/app\/patients\/[^/]+\/lesions\/[^/]+$/.test(url.pathname) &&
        !url.pathname.endsWith("/lesions/new"),
    ),
    page.getByRole("button", { name: "Create lesion" }).click(),
  ]);
  await expect(
    page.getByRole("heading", { name: /Left upper back/i }).first(),
  ).toBeVisible();

  await page.getByRole("link", { name: /Record scan/i }).click();
  await expect(page.getByRole("heading", { name: /Record scan/i })).toBeVisible();
  await page.locator('input[name="image"]').setInputFiles({
    name: "audit-scan.webp",
    mimeType: "image/webp",
    buffer: onePixelWebp,
  });
  await expect(page.getByAltText("Selected dermoscopic capture")).toBeVisible();
  await page.getByLabel("Captured at").fill("2026-07-06T12:30");
  await page.locator('input[name="label"][value="SUSPICIOUS"]').check({
    force: true,
  });
  await page.getByLabel("Confidence label").selectOption("SUSPICIOUS");
  await page.locator('input[name="confidence"]').fill("0.84");
  await page.getByLabel("Diameter").fill("5.4");
  await page.getByLabel("Asymmetry").fill("6.2");
  await page.getByLabel("Border irregularity").fill("4.8");
  await page.getByLabel("Color variation").fill("3.7");
  await page.getByLabel("Area").fill("19.4");
  await page.getByLabel("Metrics scale").selectOption("CLINICIAN_MEASURED");
  await Promise.all([
    page.waitForURL(/\/app\/patients\/[^/]+\/lesions\/[^/]+$/),
    page.getByRole("button", { name: "Record scan" }).click(),
  ]);
  await expect(
    page.getByRole("heading", { name: /Left upper back/i }).first(),
  ).toBeVisible();
  await expect(page.getByText(/SUSPICIOUS/i).first()).toBeVisible();

  await page.getByRole("link", { name: /Management/i }).click();
  await expect(page.getByRole("heading", { name: /Management plan/i })).toBeVisible();
  await page.getByLabel("Add a follow-up note").fill(`Audit note ${suffix}`);
  await page.getByRole("button", { name: "Add note" }).click();
  await expect(page.getByText(`Audit note ${suffix}`)).toBeVisible();

  await expectHealthyPage(page, "/app/settings/devices", /Devices/i);
  await page.getByLabel("Name").fill(`Audit scope ${testInfo.project.name}`);
  await page.getByLabel("Serial").fill(`AUD-${suffix}`);
  await Promise.all([
    page.waitForURL(/\/app\/settings\/devices\?newKey=/),
    page.getByRole("button", { name: "Register" }).click(),
  ]);
  await expect(page.getByText("Device key — copy it now")).toBeVisible();
  await expect(page.getByText(`AUD-${suffix}`)).toBeVisible();

  await expectNoDocumentOverflow(page);
  await expectAccessibleControls(page);
  await monitor.assertClean();
});

test("main app pages meet basic client performance budgets", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "chromium-desktop",
    "performance budgets run once on desktop",
  );

  const monitor = monitorPage(page);
  const routes = ["/", "/app", "/app/patients", "/app/settings/devices"];

  for (const route of routes) {
    await page.goto(route, { waitUntil: "load" });
    const timing = await page.evaluate(() => {
      const [nav] = performance.getEntriesByType(
        "navigation",
      ) as PerformanceNavigationTiming[];
      if (!nav) return null;
      const paint = performance.getEntriesByName("first-contentful-paint")[0];
      return {
        load: Math.round(nav.loadEventEnd - nav.startTime),
        domContentLoaded: Math.round(nav.domContentLoadedEventEnd - nav.startTime),
        firstContentfulPaint: paint ? Math.round(paint.startTime) : null,
        transferSize: nav.transferSize,
        encodedBodySize: nav.encodedBodySize,
      };
    });

    expect(timing, `${route} should expose navigation timing`).not.toBeNull();
    if (!timing) continue;
    expect(timing.load, `${route} load time`).toBeLessThan(5_000);
    expect(timing.domContentLoaded, `${route} DOMContentLoaded`).toBeLessThan(3_000);
  }

  await monitor.assertClean();
});
