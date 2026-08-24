import { test, expect } from "@playwright/test"

test.describe("Twitter 2014 alien layout - root domain", () => {
  test.beforeEach(async ({ page }) => {
    // mock session as authenticated for layout tests
    await page.route("**/api/frontend/session", route => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ authenticated: true, viewer: { username: "naya1115", actorIri: "https://testtest.exekey.net/users/naya1115", roles: [] }, csrf: { headerName: "X-CSRF-Token", requestToken: "test" } })
    }))
    await page.route("**/api/notes/timeline", route => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) }))
    await page.route("**/api/notes/local-timeline", route => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) }))
    await page.route("**/api/notes/global-timeline", route => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) }))
    await page.goto("/")
    await page.waitForLoadState("networkidle")
  })

  test("TopNav is visible and not transparent", async ({ page }) => {
    const nav = page.locator("header").first()
    await expect(nav).toBeVisible()
    const bg = await nav.evaluate(el => getComputedStyle(el).backgroundColor)
    expect(bg).not.toBe("rgba(0, 0, 0, 0)")
    const alpha = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/)
    if (alpha && alpha[4]) expect(parseFloat(alpha[4])).toBeGreaterThan(0.9)
  })

  test("3-col layout does not collapse at 1280px", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await expect(page.getByTestId("left-sidebar")).toBeVisible()
    await expect(page.getByTestId("center-feed")).toBeVisible()
    await expect(page.getByTestId("right-sidebar")).toBeVisible()
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2)
  })

  test("center feed has correct max-width ~590px at desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    const center = page.getByTestId("center-feed")
    const box = await center.boundingBox()
    expect(box).not.toBeNull()
    expect(box!.width).toBeGreaterThan(560)
    expect(box!.width).toBeLessThan(620)
  })

  test("mobile collapses to single column < 1024px", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 })
    await expect(page.getByTestId("left-sidebar")).toBeHidden()
    await expect(page.getByTestId("right-sidebar")).toBeHidden()
    await expect(page.getByTestId("center-feed")).toBeVisible()
  })

  test("Composer and TweetCard no overflow", async ({ page }) => {
    const composer = page.locator("textarea").first()
    await expect(composer).toBeVisible()
    await composer.fill("a".repeat(200) + " https://example.com/very/long/url/that/should/wrap/and/not/overflow/layout")
    const center = page.getByTestId("center-feed")
    const overflow = await center.evaluate(el => el.scrollWidth > el.clientWidth)
    expect(overflow).toBeFalsy()
  })

  test("background not transparent for html/body/center", async ({ page }) => {
    for (const sel of ["html", "body", "[data-testid=\"center-feed\"]"]) {
      const bg = await page.locator(sel).first().evaluate(el => getComputedStyle(el).backgroundColor)
      expect(bg).not.toBe("rgba(0, 0, 0, 0)")
      expect(bg).not.toBe("transparent")
    }
  })

  test("profile header clip-path alien deformation visible", async ({ page }) => {
    await page.goto("/profile")
    const header = page.getByTestId("profile-header")
    await expect(header).toBeVisible()
    const clip = await header.evaluate(el => getComputedStyle(el).clipPath)
    expect(clip).not.toBe("none")
  })

  test("root domain serves app - no /app redirect", async ({ page }) => {
    await page.goto("/")
    await expect(page.getByTestId("center-feed")).toBeVisible()
    await expect(page.getByPlaceholder("What")).toBeVisible()
  })
})

test.describe("Auth gate", () => {
  test("unauthenticated shows SigninForm", async ({ page }) => {
    await page.route("**/api/frontend/session", route => route.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify({ authenticated: false, csrf: { headerName: "X-CSRF-Token", requestToken: "tok" } })
    }))
    await page.goto("/")
    await expect(page.getByTestId("signin-form")).toBeVisible()
    await expect(page.getByTestId("center-feed")).toBeHidden()
  })
  test("signin identifies the saved password field", async ({ page }) => {
    await page.route("**/api/frontend/session", route => route.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify({ authenticated: false, csrf: { headerName: "X-CSRF-Token", requestToken: "tok" } })
    }))
    await page.goto("/")

    await expect(page.getByLabel("Password")).toHaveAttribute("autocomplete", "current-password")
  })
  test("guest view shows timeline without auth", async ({ page }) => {
    await page.goto("/guest")
    await expect(page.getByTestId("center-feed")).toBeVisible()
  })
})

test.describe("Accessible presentation primitives", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/frontend/session", route => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ authenticated: true, viewer: { username: "naya1115", actorIri: "https://testtest.exekey.net/users/naya1115", roles: [] }, csrf: { headerName: "X-CSRF-Token", requestToken: "test" } })
    }))
    await page.route("**/api/emojis", route => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ emojis: [{ name: "party", url: "https://remote.example/party.png" }] })
    }))
    await page.route("**/api/notes/timeline", route => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([{
        id: "emoji-note",
        text: "hello :party:",
        createdAt: "2026-08-23T00:00:00.000Z",
        user: { username: "naya1115", name: "Naya", avatarUrl: "https://remote.example/avatar.png" }
      }])
    }))
    await page.route("**/api/notes/local-timeline", route => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) }))
    await page.route("**/api/notes/global-timeline", route => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) }))
    await page.goto("/")
    await page.waitForLoadState("networkidle")
  })

  test("composer icon-only actions expose names and decorative icons", async ({ page }) => {
    for (const label of ["Attach media", "Emoji picker", "Location"]) {
      const action = page.getByRole("button", { name: label })
      await expect(action).toBeVisible()
      await expect(action.locator("svg")).toHaveAttribute("aria-hidden", "true")
    }
  })

  test("blocked custom emoji and avatar sources render textual fallbacks", async ({ page }) => {
    await expect(page.getByTestId("custom-emoji-fallback").first()).toHaveText(":party:")
    await expect(page.getByTestId("custom-emoji")).toHaveCount(0)
    await expect(page.getByTestId("user-avatar-fallback").filter({ hasText: "N" }).first()).toBeVisible()
  })
})
