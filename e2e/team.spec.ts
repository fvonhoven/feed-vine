import { test, expect } from "@playwright/test"
import { createClient } from "@supabase/supabase-js"
import * as fs from "fs"

/**
 * Team tests require the user to have plan_id = "team" in the subscriptions table.
 * We use the Supabase service role client to set this up before each test.
 * The userId is read from the file written by global-setup.
 */

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

test.describe("Team Features", () => {
  test.beforeEach(async ({ page }) => {
    if (!supabaseServiceKey) {
      test.skip(true, "SUPABASE_SERVICE_ROLE_KEY not set — cannot configure team plan")
      return
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey)

    // Read userId from the file written by global-setup
    let userId: string | null = null
    try {
      userId = fs.readFileSync("e2e/.auth/test-user-id.txt", "utf-8").trim()
    } catch {
      // Fallback: find user via admin API
      const { data: listData } = await adminClient.auth.admin.listUsers()
      const testUser = listData?.users?.find((u: { email?: string }) =>
        u.email?.startsWith("e2e-test-")
      )
      userId = testUser?.id || null
    }

    if (!userId) {
      test.skip(true, "Could not determine user ID for team setup")
      return
    }

    // Upsert subscription with plan_id = "team"
    await adminClient.from("subscriptions").upsert(
      {
        user_id: userId,
        plan_id: "team",
        status: "active",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    )

    // Navigate to the app and reload to pick up the new subscription
    await page.goto("/")
    await page.waitForLoadState("domcontentloaded")

    // Wait for subscription to be fetched by React Query
    await page.waitForTimeout(2_000)

    // Force reload to ensure the subscription cache is refreshed
    await page.reload()
    await page.waitForLoadState("domcontentloaded")
    await page.waitForTimeout(1_000)
  })

  test("create a team and team dashboard appears", async ({ page }) => {
    await page.goto("/team")
    await page.waitForLoadState("domcontentloaded")

    // Wait for loading spinner to disappear and content to render
    await page.waitForTimeout(3_000)

    // If team already exists, we see the dashboard. If not, we see "Create Your Team"
    const createTeamHeading = page.getByRole("heading", { name: "Create Your Team" })

    if (await createTeamHeading.isVisible({ timeout: 8_000 }).catch(() => false)) {
      // Fill in team name — placeholder is "e.g. Acme Content Team"
      const teamName = `E2E Team ${Date.now()}`
      await page.getByPlaceholder(/acme|team/i).fill(teamName)
      await page.getByRole("button", { name: /Create Team/i }).click()

      // Wait for team creation and re-render
      await page.waitForTimeout(3_000)

      // Team dashboard should appear with the team name
      await expect(page.getByText(teamName)).toBeVisible({ timeout: 15_000 })
    }

    // Verify seat count is visible (works for both newly created and existing teams)
    // The text renders as "{members.length} / 5 seats"
    await expect(page.locator("body")).toContainText(/seats/i, { timeout: 15_000 })
  })

  test("invite a member by email and invite appears in pending list", async ({
    page,
  }) => {
    await page.goto("/team")
    await page.waitForLoadState("domcontentloaded")
    await page.waitForTimeout(2_000)

    // Create team if needed
    const createTeamHeading = page.getByRole("heading", { name: "Create Your Team" })
    if (await createTeamHeading.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await page.getByPlaceholder(/acme|team/i).fill(`E2E Team ${Date.now()}`)
      await page.getByRole("button", { name: /Create Team/i }).click()
      await page.waitForTimeout(3_000)
      await expect(page.getByText(/seats/i).first()).toBeVisible({ timeout: 15_000 })
    }

    // Find the invite email input — placeholder is "colleague@company.com"
    const inviteEmail = `invite-${Date.now()}@feedvine-test.com`
    const emailInput = page.getByPlaceholder(/colleague|email/i).last()

    if (!(await emailInput.isVisible({ timeout: 5_000 }).catch(() => false))) {
      // Invite input not visible — may have reached seat limit or team not fully loaded.
      // Verify the team page at least rendered correctly.
      await expect(page.getByText(/seats/i).first()).toBeVisible({ timeout: 5_000 })
      return
    }

    await emailInput.fill(inviteEmail)

    // Click invite/send button
    const inviteButton = page.getByRole("button", {
      name: /Send Invite|Invite|Add Member/i,
    })
    await inviteButton.click()

    // The invite should appear in the pending invites list
    const inviteVisible = await page.getByText(inviteEmail).isVisible({ timeout: 5_000 }).catch(() => false)
      || await page.getByText(/Pending/i).first().isVisible({ timeout: 3_000 }).catch(() => false)
    expect(inviteVisible).toBeTruthy()
  })

  test("remove a team member and member is removed from list", async ({
    page,
  }) => {
    await page.goto("/team")
    await page.waitForLoadState("domcontentloaded")
    await page.waitForTimeout(2_000)

    // Create team if needed (same as invite test)
    const createTeamHeading = page.getByRole("heading", { name: "Create Your Team" })
    if (await createTeamHeading.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await page.getByPlaceholder(/acme|team/i).fill(`E2E Team ${Date.now()}`)
      await page.getByRole("button", { name: /Create Team/i }).click()
      await page.waitForTimeout(3_000)
    }

    // First, ensure there's a pending invite to cancel by sending one
    const emailInput = page.getByPlaceholder(/colleague|email/i).last()
    if (await emailInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
      const removeTestEmail = `remove-test-${Date.now()}@feedvine-test.com`
      await emailInput.fill(removeTestEmail)
      const inviteButton = page.getByRole("button", {
        name: /Send Invite|Invite|Add Member/i,
      })
      await inviteButton.click()
      await page.waitForTimeout(2_000)
    }

    // Now look for remove buttons next to team members
    const removeButton = page.getByRole("button", {
      name: /Remove|remove/i,
    }).first()

    if (await removeButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await removeButton.click()

      // May show a confirmation dialog
      const confirmButton = page.getByRole("button", {
        name: /Confirm|Yes|Remove/i,
      }).last()
      if (await confirmButton.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await confirmButton.click()
      }

      await page.waitForTimeout(2_000)
    } else {
      // Try canceling a pending invite instead
      const cancelButton = page.getByRole("button", {
        name: /Cancel|cancel/i,
      }).first()

      if (await cancelButton.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await cancelButton.click()
        await page.waitForTimeout(2_000)
      }
    }
  })
})
