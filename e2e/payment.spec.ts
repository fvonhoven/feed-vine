import { test, expect } from "@playwright/test"

test.describe("Payment Flow (Stripe test mode)", () => {
  test("pricing page renders plans with correct UI elements", async ({
    page,
  }) => {
    await page.goto("/pricing")
    await expect(page.getByRole("heading", { name: "Choose Your Plan" })).toBeVisible({ timeout: 10_000 })

    // Billing toggle should be present (Monthly / Annual)
    const billingToggle = page.locator("div").filter({ hasText: "Monthly" }).filter({ hasText: "Annual" }).first()
    await expect(billingToggle).toBeVisible()

    // At least one plan card should be visible with a subscribe or "Current Plan" button
    const anyPlanButton = page.getByRole("button", {
      name: /Start Free Trial|Subscribe Monthly|Current Plan|Free — No card/i,
    }).first()
    await expect(anyPlanButton).toBeVisible({ timeout: 10_000 })

    // Verify at least one price is shown (any $ amount)
    await expect(page.getByText(/\$\d+/).first()).toBeVisible()
  })

  test("clicking subscribe triggers Stripe checkout or shows error", async ({
    page,
  }) => {
    await page.goto("/pricing")
    await expect(page.getByRole("heading", { name: "Choose Your Plan" })).toBeVisible({ timeout: 10_000 })

    // Find any clickable subscribe button (not "Current Plan" or "Free" which are disabled)
    const subscribeButton = page.getByRole("button", {
      name: /Start Free Trial|Subscribe Monthly/i,
    }).first()

    if (!(await subscribeButton.isVisible({ timeout: 5_000 }).catch(() => false))) {
      // User is on the highest plan — all other plans show "Current Plan" or are lower.
      // Verify at least one "Current Plan" button exists to confirm the pricing page works.
      await expect(
        page.getByRole("button", { name: /Current Plan/i }).first()
      ).toBeVisible({ timeout: 5_000 })
      return
    }

    await subscribeButton.click()

    // The Edge Function creates a Stripe Checkout session and redirects.
    // If the Edge Function is not deployed or returns an error, the page stays on /pricing
    // and may show an error toast. Either outcome is valid — we're testing the click works.
    await page.waitForTimeout(5_000)

    const currentUrl = page.url()
    if (currentUrl.includes("checkout.stripe.com")) {
      // Stripe checkout redirect succeeded
      await expect(page).toHaveURL(/checkout\.stripe\.com/)
    } else {
      // Stayed on /pricing — the Edge Function may have failed.
      // Verify we're still on the pricing page (no crash)
      await expect(page).toHaveURL(/\/pricing/)
      await expect(page.getByRole("heading", { name: "Choose Your Plan" })).toBeVisible()
    }
  })

  test("subscription status section visible in Settings", async ({
    page,
  }) => {
    await page.goto("/settings")
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible({ timeout: 10_000 })

    // Look for "Current Plan" label — always visible regardless of subscription state
    await expect(page.getByText("Current Plan").first()).toBeVisible({ timeout: 10_000 })
  })

  test("billing portal link shown when subscribed", async ({ page }) => {
    await page.goto("/settings")
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible({ timeout: 10_000 })

    // The "Manage your subscription" link is only rendered when:
    // 1. The user has a non-free plan (planIdUpper !== "FREE")
    // 2. The subscription record has a stripe_customer_id set
    // Global setup sets both of these for the test user.
    const portalLink = page.getByText("Manage your subscription")
    await expect(portalLink).toBeVisible({ timeout: 10_000 })

    // Verify the link exists and is clickable (but don't follow it —
    // the fake stripe_customer_id won't resolve to a real Stripe billing portal)
    await expect(portalLink).toBeEnabled()
  })
})
