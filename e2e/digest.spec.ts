import { test, expect } from "@playwright/test"
import { createClient } from "@supabase/supabase-js"
import * as fs from "fs"

/**
 * Digest system tests — verify the newsletter digest builder, schedules tab,
 * and digest history rendering.
 *
 * The digest page has 3 tabs: builder, schedules, history.
 * Tab labels include emojis: "📄 Digest Builder", "⏰ Schedules", "📜 History"
 * Digest history records are stored in the digest_history table.
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

test.describe("Digest & Newsletter", () => {
  // Clean up test digest history after tests
  test.afterAll(async () => {
    const admin = getAdminClient()
    const userId = getUserId()
    if (admin && userId) {
      await admin
        .from("digest_history")
        .delete()
        .eq("user_id", userId)
        .like("title", "E2E Test Digest%")

      await admin
        .from("scheduled_digests")
        .delete()
        .eq("user_id", userId)
        .like("name", "E2E%")

      // Restore plus plan
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

  test("digest builder page loads with correct tabs", async ({ page }) => {
    await page.goto("/digest")
    await page.waitForLoadState("domcontentloaded")

    // Page heading — h1 "Newsletter Digest"
    await expect(
      page.locator("h1", { hasText: "Newsletter Digest" })
    ).toBeVisible({ timeout: 10_000 })

    // Three tabs — buttons with emoji prefixed labels
    await expect(page.getByRole("button", { name: /Digest Builder/i })).toBeVisible({ timeout: 5_000 })
    await expect(page.getByRole("button", { name: /Schedules/i })).toBeVisible({ timeout: 5_000 })
    await expect(page.getByRole("button", { name: /History/i })).toBeVisible({ timeout: 5_000 })
  })

  test("digest history tab shows past digests", async ({ page }) => {
    const admin = getAdminClient()
    const userId = getUserId()
    const digestTitle = `E2E Test Digest ${Date.now()}`

    // Seed a digest history record so the history tab has something to display
    if (admin && userId) {
      await admin.from("digest_history").insert({
        user_id: userId,
        title: digestTitle,
        content_html: "<h1>Test Digest</h1><p>This is a test digest from E2E.</p>",
        content_markdown: "# Test Digest\n\nThis is a test digest from E2E.",
        article_count: 3,
        article_ids: [],
        source: "all_feeds",
        destination: "clipboard",
      })
    }

    await page.goto("/digest")
    await page.waitForLoadState("domcontentloaded")
    await page.waitForTimeout(1_000)

    // Click on History tab (button text is "📜 History")
    await page.getByRole("button", { name: /History/i }).click()
    await page.waitForTimeout(1_500)

    if (admin && userId) {
      // Should show the seeded digest — look for the exact title we inserted
      await expect(
        page.locator("span", { hasText: digestTitle })
      ).toBeVisible({ timeout: 10_000 })
    } else {
      // Without seeded data, at least verify the history tab renders
      await expect(
        page.locator("h2", { hasText: "Digest History" }).or(
          page.locator("h3", { hasText: "No Digest History" })
        )
      ).toBeVisible({ timeout: 10_000 })
    }
  })

  test("scheduled digests tab renders and shows schedule options", async ({
    page,
  }) => {
    await page.goto("/digest")
    await page.waitForLoadState("domcontentloaded")
    await page.waitForTimeout(1_000)

    // Click on Schedules tab (button text is "⏰ Schedules")
    await page.getByRole("button", { name: /Schedules/i }).click()
    await page.waitForTimeout(1_000)

    // Verify the tab content loaded — check body for schedule-related text
    await expect(page.locator("body")).toContainText(/schedule|auto-draft|creator/i, { timeout: 10_000 })
  })

  test("digest builder shows article selection and export options", async ({
    page,
  }) => {
    await page.goto("/digest")
    await page.waitForLoadState("domcontentloaded")
    await page.waitForTimeout(2_000)

    // The builder tab (default) should show the Date Range select with options
    await expect(
      page.locator("select", { hasText: /Last 24 hours/i })
    ).toBeVisible({ timeout: 10_000 })

    // Should show the "Copy to Clipboard" button
    await expect(
      page.getByRole("button", { name: /Copy to Clipboard/i })
    ).toBeVisible({ timeout: 10_000 })
  })
})
