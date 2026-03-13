import { test, expect } from "@playwright/test"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

test.describe("Auth & Onboarding", () => {
  test("sign up with email/password redirects to onboarding wizard", async ({
    browser,
  }) => {
    // Explicitly clear storageState so we're unauthenticated
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()

    const email = `e2e-signup-${Date.now()}@feedvine-test.com`
    const password = "TestSignUp123!"

    // Create user via Admin API if available, otherwise sign up via UI
    if (serviceRoleKey) {
      const admin = createClient(supabaseUrl, serviceRoleKey)
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      })
    } else {
      await page.goto("/auth")
      await page.getByText("Don't have an account? Sign up").click()
      await page.getByPlaceholder("Email address").fill(email)
      await page.getByPlaceholder("Password").fill(password)
      await page.getByRole("button", { name: "Sign up" }).click()
      await expect(page.getByText(/Account created/i)).toBeVisible({ timeout: 15_000 })
    }

    // Sign in
    await page.goto("/auth")
    await expect(page.getByText("Sign in to your account")).toBeVisible({ timeout: 10_000 })
    await page.getByPlaceholder("Email address").fill(email)
    await page.getByPlaceholder("Password").fill(password)
    await page.getByRole("button", { name: "Sign in" }).click()

    // Should redirect to onboarding for a new user
    await expect(page).toHaveURL(/\/onboarding/, { timeout: 15_000 })
    await expect(page.getByText("Welcome to FeedVine")).toBeVisible()

    await context.close()
  })

  test("onboarding wizard has 4 steps: Welcome → Feeds → Collection → Done", async ({
    browser,
  }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()

    const email = `e2e-onboard-${Date.now()}@feedvine-test.com`
    const password = "TestOnboard123!"

    // Create and sign in
    if (serviceRoleKey) {
      const admin = createClient(supabaseUrl, serviceRoleKey)
      await admin.auth.admin.createUser({ email, password, email_confirm: true })
    } else {
      await page.goto("/auth")
      await page.getByText("Don't have an account? Sign up").click()
      await page.getByPlaceholder("Email address").fill(email)
      await page.getByPlaceholder("Password").fill(password)
      await page.getByRole("button", { name: "Sign up" }).click()
      await expect(page.getByText(/Account created/i)).toBeVisible({ timeout: 15_000 })
    }

    await page.goto("/auth")
    await page.getByPlaceholder("Email address").fill(email)
    await page.getByPlaceholder("Password").fill(password)
    await page.getByRole("button", { name: "Sign in" }).click()
    await expect(page).toHaveURL(/\/onboarding/, { timeout: 15_000 })

    // Step 1: Welcome
    await expect(page.getByText("Step 1 of 4")).toBeVisible()
    await expect(page.getByText("Welcome to FeedVine")).toBeVisible()
    await page.getByRole("button", { name: "Get Started" }).click()

    // Step 2: Feeds
    await expect(page.getByText("Step 2 of 4")).toBeVisible()
    await expect(page.getByText("Add your first feeds")).toBeVisible()
    // Select a popular feed
    await page.locator(".grid button:not([disabled])").first().click()
    await page.getByRole("button", { name: /Add \d+ feed/i }).click()

    // Step 3: Collection
    await expect(page.getByText("Step 3 of 4")).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText("Create a collection")).toBeVisible()
    await page.getByText("Skip").click()

    // Step 4: Done
    await expect(page.getByText("Step 4 of 4")).toBeVisible()
    await expect(page.getByText("You're all set!")).toBeVisible()
    await page.getByRole("button", { name: "Go to FeedVine" }).click()

    // Lands on dashboard
    await expect(page).toHaveURL("/", { timeout: 15_000 })

    await context.close()
  })

  test("sign in with existing account lands on dashboard", async ({ page }) => {
    // Uses the authenticated storageState from global-setup
    await page.goto("/")
    // Use the h1 heading to avoid matching sidebar links
    await expect(page.getByRole("heading", { name: "All Articles" })).toBeVisible({ timeout: 10_000 })
  })

  test("sign out redirects to landing page", async ({ browser }, testInfo) => {
    testInfo.setTimeout(90_000) // Extra time for onboarding flow
    // Use a dedicated user context to avoid revoking the global-setup user's tokens
    // (Supabase signOut revokes the refresh token server-side)
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()

    const email = `e2e-signout-${Date.now()}@feedvine-test.com`
    const password = "TestSignOut123!"

    // Create user via Admin API
    if (serviceRoleKey) {
      const admin = createClient(supabaseUrl, serviceRoleKey)
      await admin.auth.admin.createUser({ email, password, email_confirm: true })
    }

    // Sign in
    await page.goto("/auth")
    await page.getByPlaceholder("Email address").fill(email)
    await page.getByPlaceholder("Password").fill(password)
    await page.getByRole("button", { name: "Sign in" }).click()

    // Wait for navigation away from /auth (could go to / or /onboarding)
    await page.waitForURL(url => !url.toString().includes("/auth"), { timeout: 15_000 })
    await page.waitForLoadState("domcontentloaded")

    // If landed on onboarding, complete it quickly so we can sign out
    if (page.url().includes("/onboarding")) {
      // Step 1: Welcome
      await expect(page.getByText("Welcome to FeedVine")).toBeVisible({ timeout: 10_000 })
      await page.getByRole("button", { name: "Get Started" }).click()
      // Step 2: Feeds — skip by adding one feed
      await page.locator(".grid button:not([disabled])").first().click()
      await page.getByRole("button", { name: /Add \d+ feed/i }).click()
      // Step 3: Collection — skip
      await expect(page.getByText("Create a collection")).toBeVisible({ timeout: 30_000 })
      await page.getByText("Skip").click()
      // Step 4: Done
      await page.getByRole("button", { name: "Go to FeedVine" }).click()
      await expect(page).toHaveURL("/", { timeout: 15_000 })
    }

    await page.waitForLoadState("domcontentloaded")
    await page.waitForTimeout(2_000)

    // Click the user avatar button in the top-right to open the dropdown menu
    const avatarButton = page.locator("button").filter({
      has: page.locator(".rounded-full"),
    }).last()
    await avatarButton.click()

    // Click "Sign Out" in the dropdown
    await page.getByText("Sign Out").click()

    // After sign out, the app re-renders as unauthenticated — shows LandingPage at "/"
    const signedOut = await page.getByRole("heading", { name: /FeedVine/ }).isVisible({ timeout: 10_000 }).catch(() => false)
      || await page.getByText("Sign in to your account").isVisible({ timeout: 5_000 }).catch(() => false)
    expect(signedOut).toBeTruthy()
    // The dashboard heading should NOT be visible
    await expect(page.getByRole("heading", { name: "All Articles" })).not.toBeVisible()

    await context.close()
  })
})
