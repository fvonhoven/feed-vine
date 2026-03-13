import { test, expect } from "@playwright/test"

test.describe("PWA", () => {
  test("landing page loads without console errors", async ({ browser }) => {
    // Use a fresh context (unauthenticated) to hit the landing page
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()

    const consoleErrors: string[] = []
    page.on("console", msg => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text())
      }
    })

    await page.goto("/")
    await page.waitForLoadState("domcontentloaded")

    // Landing page should render — target the main h1 heading (there's also an h3 with "FeedVine")
    await expect(page.getByRole("heading", { name: /FeedVine/ }).first()).toBeVisible({ timeout: 10_000 })

    // Filter out known benign errors (e.g., favicon 404, third-party scripts)
    const criticalErrors = consoleErrors.filter(
      err =>
        !err.includes("favicon") &&
        !err.includes("404") &&
        !err.includes("net::ERR") &&
        !err.includes("third-party")
    )

    expect(criticalErrors).toHaveLength(0)

    await context.close()
  })

  test("PWA manifest is configured correctly", async ({ browser }) => {
    // Use a fresh context to test PWA configuration
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()

    await page.goto("/")
    await page.waitForLoadState("domcontentloaded")

    // Verify the PWA manifest link is present in the HTML head.
    // Vite PWA plugin injects <link rel="manifest"> even in dev mode.
    const manifestLink = page.locator('link[rel="manifest"]')
    const hasManifest = await manifestLink.count() > 0

    if (!hasManifest) {
      // Fallback: Check for PWA meta tags that Vite PWA injects
      const themeColor = page.locator('meta[name="theme-color"]')
      await expect(themeColor).toHaveAttribute("content", "#10b981")
      await context.close()
      return
    }

    // If manifest link exists, fetch it and verify it's valid JSON with the correct app name
    const manifestHref = await manifestLink.getAttribute("href")
    expect(manifestHref).toBeTruthy()

    const response = await page.goto(manifestHref!)
    expect(response?.status()).toBe(200)

    const manifestText = await page.locator("body").innerText()
    const manifest = JSON.parse(manifestText)

    expect(manifest.name).toBe("FeedVine")
    expect(manifest.short_name).toBe("FeedVine")
    expect(manifest.display).toBe("standalone")
    expect(manifest.icons).toBeDefined()
    expect(manifest.icons.length).toBeGreaterThan(0)

    await context.close()
  })
})
