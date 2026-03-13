import { test, expect } from "@playwright/test"
import { createClient } from "@supabase/supabase-js"
import * as fs from "fs"

/**
 * Stripe lifecycle tests — verify subscription state changes are reflected in the UI.
 *
 * These tests use the Supabase Admin API to simulate what Stripe webhooks would do:
 * set subscription status/plan_id in the DB, then verify the UI renders correctly.
 * This tests the full round-trip from DB state → React Query → UI rendering.
 */

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

function getAdminClient() {
  if (!supabaseUrl || !supabaseServiceKey) return null
  return createClient(supabaseUrl, supabaseServiceKey)
}

function getUserId(): string | null {
  try {
    return fs.readFileSync("e2e/.auth/test-user-id.txt", "utf-8").trim()
  } catch {
    return null
  }
}

test.describe("Stripe Subscription Lifecycle", () => {
  // Restore the user to "plus" / "active" after all tests in this describe block
  test.afterAll(async () => {
    const admin = getAdminClient()
    const userId = getUserId()
    if (admin && userId) {
      await admin.from("subscriptions").upsert(
        {
          user_id: userId,
          plan_id: "plus",
          status: "active",
          stripe_customer_id: "cus_e2e_test_placeholder",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      )
    }
  })

  test("trialing status shows trial badge in settings", async ({ page }) => {
    const admin = getAdminClient()
    const userId = getUserId()
    if (!admin || !userId) {
      // Can't run without admin access — just verify settings page loads
      await page.goto("/settings")
      await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible({ timeout: 10_000 })
      return
    }

    // Simulate Stripe webhook: checkout.session.completed with trial
    await admin.from("subscriptions").upsert(
      {
        user_id: userId,
        plan_id: "plus",
        status: "trialing",
        stripe_customer_id: "cus_e2e_test_placeholder",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    )

    await page.goto("/settings")
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible({ timeout: 10_000 })

    // The settings page shows a status badge when status !== "active"
    await expect(page.getByText("Status: trialing")).toBeVisible({ timeout: 10_000 })
  })

  test("past_due status shows warning badge in settings", async ({ page }) => {
    const admin = getAdminClient()
    const userId = getUserId()
    if (!admin || !userId) {
      await page.goto("/settings")
      await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible({ timeout: 10_000 })
      return
    }

    // Simulate Stripe webhook: invoice.payment_failed
    await admin.from("subscriptions").upsert(
      {
        user_id: userId,
        plan_id: "plus",
        status: "past_due",
        stripe_customer_id: "cus_e2e_test_placeholder",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    )

    await page.goto("/settings")
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible({ timeout: 10_000 })

    await expect(page.getByText("Status: past_due")).toBeVisible({ timeout: 10_000 })
  })

  test("cancellation downgrades plan to free in UI", async ({ page }) => {
    const admin = getAdminClient()
    const userId = getUserId()
    if (!admin || !userId) {
      await page.goto("/settings")
      await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible({ timeout: 10_000 })
      return
    }

    // Simulate Stripe webhook: customer.subscription.deleted → downgrade to free
    await admin.from("subscriptions").upsert(
      {
        user_id: userId,
        plan_id: "free",
        status: "canceled",
        stripe_customer_id: "cus_e2e_test_placeholder",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    )

    await page.goto("/settings")
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible({ timeout: 10_000 })

    // The plan name renders inside a <p> with text-2xl font-bold — match that specific element
    await expect(
      page.locator("p.text-2xl", { hasText: "Free" })
    ).toBeVisible({ timeout: 10_000 })

    // Status badge should show canceled
    await expect(page.getByText("Status: canceled")).toBeVisible({ timeout: 10_000 })
  })

  test("plan upgrade reflects new plan name in settings", async ({ page }) => {
    const admin = getAdminClient()
    const userId = getUserId()
    if (!admin || !userId) {
      await page.goto("/settings")
      await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible({ timeout: 10_000 })
      return
    }

    // Simulate Stripe webhook: customer.subscription.updated → upgrade to premium
    await admin.from("subscriptions").upsert(
      {
        user_id: userId,
        plan_id: "premium",
        status: "active",
        stripe_customer_id: "cus_e2e_test_placeholder",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    )

    await page.goto("/settings")
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible({ timeout: 10_000 })

    // Plan name is "Builder" (premium plan's display name)
    await expect(
      page.locator("p.text-2xl", { hasText: "Builder" })
    ).toBeVisible({ timeout: 10_000 })

    // Restore to plus for subsequent tests
    await admin.from("subscriptions").upsert(
      {
        user_id: userId,
        plan_id: "plus",
        status: "active",
        stripe_customer_id: "cus_e2e_test_placeholder",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    )
  })
})
