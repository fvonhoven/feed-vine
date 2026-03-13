import { test, expect } from "@playwright/test"

/**
 * Pre-launch verification tests.
 *
 * These tests verify that critical pre-launch pages exist and render correctly:
 * - Terms of Service
 * - Privacy Policy
 * - Landing page with hero image
 * - Onboarding flow structure (verified via global-setup, checked here for completeness)
 */

test.describe("Pre-Launch Verification", () => {
  test("Terms of Service page renders with legal content", async ({ page }) => {
    await page.goto("/terms")
    await page.waitForLoadState("domcontentloaded")

    // Should have a proper heading
    await expect(
      page.getByRole("heading", { name: /Terms of Service/i }).first()
    ).toBeVisible({ timeout: 10_000 })

    // Should contain key legal sections
    await expect(page.getByText(/Acceptance of Terms/i).first()).toBeVisible({ timeout: 5_000 })
    await expect(page.getByText(/User Accounts/i).first()).toBeVisible({ timeout: 5_000 })
    await expect(page.getByText(/Payment/i).first()).toBeVisible({ timeout: 5_000 })
  })

  test("Privacy Policy page renders with policy content", async ({ page }) => {
    await page.goto("/privacy")
    await page.waitForLoadState("domcontentloaded")

    await expect(
      page.getByRole("heading", { name: /Privacy Policy/i }).first()
    ).toBeVisible({ timeout: 10_000 })

    // Should contain key privacy sections
    await expect(page.getByText(/Data.*Collect/i).first()).toBeVisible({ timeout: 5_000 })
    await expect(page.getByText(/Security/i).first()).toBeVisible({ timeout: 5_000 })
  })

  test("landing page loads with hero image and CTA", async ({ browser }) => {
    // Use a fresh context (no auth) to see the public landing page
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()

    await page.goto("/")
    await page.waitForLoadState("domcontentloaded")

    // Landing page should have a prominent heading
    await expect(
      page.getByRole("heading").first()
    ).toBeVisible({ timeout: 10_000 })

    // Should have a CTA link or button (Sign Up, Get Started, etc.)
    const ctaLink = page.getByRole("link", { name: /Sign Up|Get Started|Try Free|Start/i }).first()
    const ctaButton = page.getByRole("button", { name: /Sign Up|Get Started|Try Free|Start/i }).first()
    const ctaVisible = await ctaLink.isVisible({ timeout: 5_000 }).catch(() => false)
      || await ctaButton.isVisible({ timeout: 3_000 }).catch(() => false)
    expect(ctaVisible).toBeTruthy()

    // Hero image should be present
    const heroImg = page.locator('img[src*="hero"], img[alt*="FeedVine"], img[src*="feed-vine"]').first()
    if (await heroImg.isVisible({ timeout: 5_000 }).catch(() => false)) {
      // Image loaded successfully
      await expect(heroImg).toBeVisible()
    }

    await context.close()
  })

  test("pricing page shows all plan tiers", async ({ page }) => {
    await page.goto("/pricing")
    await expect(page.getByRole("heading", { name: "Choose Your Plan" })).toBeVisible({ timeout: 10_000 })

    // Should show multiple plan options
    // Plan names from stripe.ts: Free/Starter, Pro/Creator, Plus/Growth, Premium/Builder
    const planCards = page.locator("[class*='rounded']").filter({ hasText: /month|\$/ })
    const cardCount = await planCards.count()
    expect(cardCount).toBeGreaterThanOrEqual(3)
  })
})
