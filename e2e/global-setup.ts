import { test as setup, expect } from "@playwright/test"
import { createClient } from "@supabase/supabase-js"
import * as fs from "fs"

const TEST_EMAIL = `e2e-test-${Date.now()}@feedvine-test.com`
const TEST_PASSWORD = "TestPassword123!"

/**
 * Global setup: creates a fresh test user via the Supabase Admin API,
 * signs in through the UI, completes onboarding, upgrades to "plus" plan,
 * and saves the authenticated storageState so all subsequent tests start logged-in.
 *
 * Using the Admin API to create the user avoids flaky signUp-then-confirm flows.
 * Upgrading to "plus" ensures feature-gated tests (save, collections, AI) can run.
 */
setup.setTimeout(120_000) // Allow extra time for user creation + onboarding + plan upgrade

setup("authenticate and complete onboarding", async ({ page }) => {
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  let createdUserId: string | null = null

  // If we have the service role key, create the user via Admin API (fast & reliable)
  if (supabaseUrl && serviceRoleKey) {
    const admin = createClient(supabaseUrl, serviceRoleKey)
    const { data, error } = await admin.auth.admin.createUser({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
    })
    if (error && !error.message.includes("already been registered")) {
      throw new Error(`Failed to create test user: ${error.message}`)
    }
    createdUserId = data?.user?.id || null
  } else {
    // Fallback: sign up via the UI
    await page.goto("/auth")
    await page.getByText("Don't have an account? Sign up").click()
    await page.getByPlaceholder("Email address").fill(TEST_EMAIL)
    await page.getByPlaceholder("Password").fill(TEST_PASSWORD)
    await page.getByRole("button", { name: "Sign up" }).click()
    await expect(page.getByText(/Account created/i)).toBeVisible({ timeout: 15_000 })
  }

  // 1. Sign in through the UI
  await page.goto("/auth")
  await expect(page.getByText("Sign in to your account")).toBeVisible({ timeout: 10_000 })

  await page.getByPlaceholder("Email address").fill(TEST_EMAIL)
  await page.getByPlaceholder("Password").fill(TEST_PASSWORD)
  await page.getByRole("button", { name: "Sign in" }).click()

  // 2. Should land on onboarding since onboarding_complete is false
  await expect(page).toHaveURL(/\/onboarding/, { timeout: 15_000 })

  // Step 1: Welcome — click Get Started
  await expect(page.getByText("Welcome to FeedVine")).toBeVisible()
  await page.getByRole("button", { name: "Get Started" }).click()

  // Step 2: Feeds — pick a popular feed, then add
  await expect(page.getByText("Add your first feeds")).toBeVisible()
  // Click the first feed button (each popular feed is a <button> with a title span)
  const feedButtons = page.locator(
    ".grid button:not([disabled])"
  )
  await feedButtons.first().click()
  // Click "Add N feed(s)"
  await page.getByRole("button", { name: /Add \d+ feed/i }).click()

  // Step 3: Collection — skip it
  await expect(page.getByText("Create a collection")).toBeVisible({ timeout: 30_000 })
  await page.getByText("Skip").click()

  // Step 4: Done — finish onboarding
  await expect(page.getByText("You're all set!")).toBeVisible()
  await page.getByRole("button", { name: "Go to FeedVine" }).click()

  // 3. Should land on the authenticated home page
  await expect(page).toHaveURL("/", { timeout: 15_000 })
  await page.waitForLoadState("domcontentloaded")

  // 4. Upgrade test user to "plus" plan via Admin API
  //    This unlocks collections, saved articles, AI summaries, webhooks, etc.
  if (supabaseUrl && serviceRoleKey) {
    const admin = createClient(supabaseUrl, serviceRoleKey)

    // Get user ID — from create response or by listing users
    if (!createdUserId) {
      const { data: listData } = await admin.auth.admin.listUsers()
      const testUser = listData?.users?.find((u: { email?: string }) =>
        u.email === TEST_EMAIL
      )
      createdUserId = testUser?.id || null
    }

    if (createdUserId) {
      await admin.from("subscriptions").upsert(
        {
          user_id: createdUserId,
          plan_id: "plus",
          status: "active",
          stripe_customer_id: "cus_e2e_test_placeholder",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      )

      // Write userId to a file so other test files (team.spec.ts) can use it
      fs.mkdirSync("e2e/.auth", { recursive: true })
      fs.writeFileSync("e2e/.auth/test-user-id.txt", createdUserId)
    }
  }

  // Try to trigger the fetch-rss Edge Function to populate articles.
  // This is best-effort — if the function isn't deployed, reader tests will gracefully skip.
  if (supabaseUrl) {
    const anonKey = process.env.VITE_SUPABASE_ANON_KEY
    if (anonKey) {
      try {
        const controller = new AbortController()
        const timeoutId = globalThis.setTimeout(() => controller.abort(), 10_000)
        await fetch(`${supabaseUrl}/functions/v1/fetch-rss`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${anonKey}`,
            "Content-Type": "application/json",
          },
          signal: controller.signal,
        })
        clearTimeout(timeoutId)
        // Give articles time to be stored
        await new Promise(resolve => setTimeout(resolve, 3_000))
      } catch {
        // Edge Function not available — reader tests will skip gracefully
      }
    }
  }

  // Reload page to pick up the new subscription and any new articles
  await page.reload()
  await page.waitForLoadState("domcontentloaded")

  // Wait for feeds and articles to render
  await page.waitForTimeout(3_000)

  // 5. Save authenticated state
  await page.context().storageState({ path: "e2e/.auth/user.json" })
})
