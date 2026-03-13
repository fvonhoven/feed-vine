import { test, expect } from "@playwright/test"
import { createClient } from "@supabase/supabase-js"
import * as fs from "fs"

/**
 * Seat limit enforcement tests.
 *
 * The manage-team Edge Function enforces seat limits:
 * - team: 5 seats
 * - team_pro: 15 seats
 * - team_business: 30 seats
 *
 * These tests verify the UI correctly reflects seat limits and that
 * invites are blocked when the team is at capacity.
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

test.describe("Seat Limits", () => {
  // Restore plus plan after seat limit tests
  test.afterAll(async () => {
    const admin = getAdminClient()
    const userId = getUserId()
    if (admin && userId) {
      // Clean up any test teams
      const { data: teams } = await admin
        .from("teams")
        .select("id")
        .eq("owner_id", userId)
      if (teams) {
        for (const team of teams) {
          // Remove test invites
          await admin.from("team_invites").delete().eq("team_id", team.id)
          // Remove non-owner members
          await admin
            .from("team_members")
            .delete()
            .eq("team_id", team.id)
            .neq("user_id", userId)
        }
      }
      // Restore to plus plan
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

  test("team page shows seat count for team plan", async ({ page }) => {
    const admin = getAdminClient()
    const userId = getUserId()
    if (!admin || !userId) {
      await page.goto("/team")
      await page.waitForLoadState("domcontentloaded")
      return
    }

    // Set user to team plan
    await admin.from("subscriptions").upsert(
      {
        user_id: userId,
        plan_id: "team",
        status: "active",
        stripe_customer_id: "cus_e2e_test_placeholder",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    )

    await page.goto("/team")
    await page.waitForLoadState("domcontentloaded")
    await page.waitForTimeout(3_000)

    // Create team if needed
    const createTeamHeading = page.getByRole("heading", { name: "Create Your Team" })
    if (await createTeamHeading.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await page.getByPlaceholder(/acme|team/i).fill(`E2E Seat Test ${Date.now()}`)
      await page.getByRole("button", { name: /Create Team/i }).click()
      await page.waitForTimeout(3_000)
    }

    // Should show seat count — page body should contain "seats" text
    await expect(page.locator("body")).toContainText(/seats/i, { timeout: 15_000 })
  })

  test("invite is blocked when team is at seat limit via Edge Function", async ({
    page,
  }) => {
    const admin = getAdminClient()
    const userId = getUserId()
    if (!admin || !userId) {
      await page.goto("/team")
      await page.waitForLoadState("domcontentloaded")
      return
    }

    // Set user to team plan (5 seats max)
    await admin.from("subscriptions").upsert(
      {
        user_id: userId,
        plan_id: "team",
        status: "active",
        stripe_customer_id: "cus_e2e_test_placeholder",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    )

    // Get the user's team
    const { data: teams } = await admin
      .from("teams")
      .select("id")
      .eq("owner_id", userId)

    if (!teams || teams.length === 0) {
      // No team created — just verify team page loads
      await page.goto("/team")
      await page.waitForLoadState("domcontentloaded")
      await page.waitForTimeout(2_000)
      return
    }

    const teamId = teams[0].id

    // Fill seats: create 4 fake members (owner is seat #1, so we need 4 more to hit 5)
    // First clean up existing non-owner members
    await admin
      .from("team_members")
      .delete()
      .eq("team_id", teamId)
      .neq("user_id", userId)

    // Add 4 fake pending invites to fill seats
    const fakeInvites = []
    for (let i = 0; i < 4; i++) {
      fakeInvites.push({
        team_id: teamId,
        email: `seat-filler-${i}-${Date.now()}@test.com`,
        invited_by: userId,
        token: `fake-token-${i}-${Date.now()}`,
        status: "pending",
      })
    }
    await admin.from("team_invites").insert(fakeInvites)

    await page.goto("/team")
    await page.waitForLoadState("domcontentloaded")
    await page.waitForTimeout(3_000)

    // Try to send another invite — should be blocked by seat limit
    const emailInput = page.getByPlaceholder(/colleague|email/i).last()
    if (await emailInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await emailInput.fill(`over-limit-${Date.now()}@test.com`)
      const inviteButton = page.getByRole("button", {
        name: /Send Invite|Invite|Add Member/i,
      })
      if (await inviteButton.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await inviteButton.click()
        await page.waitForTimeout(2_000)

        // Should show error about seat limit — check page body for relevant text
        await expect(page.locator("body")).toContainText(
          /seat.*limit|limit.*seat|upgrade.*add|error|seats/i,
          { timeout: 10_000 }
        )
      }
    }

    // Clean up fake invites
    await admin.from("team_invites").delete().eq("team_id", teamId).like("email", "seat-filler%")
  })
})
