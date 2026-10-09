import { expect, test } from "@playwright/test";

const PASSWORD = "Str0ng-pass-123";

function uniqueUser() {
  const id = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return { name: "Test Student", email: `e2e-${id}@example.com`, phone: "9812345678" };
}

test.beforeEach(async ({ context }) => {
  // Never hit the real WhatsApp during tests.
  await context.route("https://wa.me/**", (route) =>
    route.fulfill({ contentType: "text/html", body: "<title>WhatsApp (test double)</title>" }),
  );
});

test("home page shows the hero, the departure board and the disclaimer", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("IELTS booking in Nepal");
  await expect(page.getByRole("heading", { name: "Next open dates" })).toBeVisible();
  await expect(page.getByText("independent service").first()).toBeVisible();
});

test("student registers, filters dates and books via WhatsApp", async ({ page }) => {
  await page.goto("/ielts-test-dates");
  const toggle = page.getByRole("button", { name: /^Filters/ });
  if (await toggle.isVisible()) await toggle.click(); // filters are collapsed on phones
  await page.getByLabel("City").selectOption("pokhara");
  await expect(page).toHaveURL(/city=pokhara/);
  await expect(page.getByText(/\d+ dates?/).first()).toBeVisible();

  // Anonymous students are sent to log in, then returned to the same date.
  const book = page.getByRole("link", { name: /^Book via WhatsApp/ }).first();
  await book.click();
  await expect(page).toHaveURL(/\/login\?next=(%2F|\/)book(%2F|\/)\d+/);
  await page.getByRole("link", { name: "Create a free account" }).click();
  const u = uniqueUser();
  await page.getByLabel(/Full name/).fill(u.name);
  await page.getByLabel(/Mobile/).fill(u.phone);
  await page.getByLabel("Email *").fill(u.email);
  await page.getByLabel(/^Password/).fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/book\/\d+/);
  await expect(page.getByText("Pokhara").first()).toBeVisible();

  const popupPromise = page.context().waitForEvent("page");
  await page.getByRole("button", { name: "Book via WhatsApp" }).click();
  const popup = await popupPromise;
  await popup.waitForURL(/wa\.me/);
  const text = new URL(popup.url()).searchParams.get("text") ?? "";
  expect(text).toContain("Hi, my name is Test Student. I want to book IELTS.");
  expect(text).toContain("City: Pokhara");
  expect(text).toMatch(/Reference: BYI-\d{4}-\d{6}/);

  await expect(page.getByText(/Booking request BYI-/)).toBeVisible();
  await page.getByRole("link", { name: "Go to my bookings" }).click();
  await expect(page.getByText(/BYI-\d{4}-\d{6}/).first()).toBeVisible();
  await expect(page.getByText("Initiated")).toBeVisible();
});

test("no matching dates shows an empty state that leads to an inquiry", async ({ page }) => {
  await page.goto("/ielts-test-dates?city=nepalgunj&test_type=life-skills");
  await expect(
    page.getByRole("heading", { name: /No dates match these filters yet/ }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Inquire about upcoming dates" }).click();
  await expect(page).toHaveURL(/\/inquire\?.*city=nepalgunj/);
  await expect(page.getByLabel("Preferred city")).toHaveValue("nepalgunj");

  await page.getByLabel(/Your name/).fill("Guest Student");
  await page.getByLabel(/Phone/).fill("+977 9801234567");
  await page.getByRole("button", { name: "Send inquiry" }).click();
  const wa = page.getByRole("link", { name: "Continue on WhatsApp" });
  await expect(wa).toBeVisible();
  const href = (await wa.getAttribute("href")) ?? "";
  expect(decodeURIComponent(href)).toContain(
    "Hi, my name is Guest Student. I want to book IELTS but I can't see dates for Nepalgunj/IELTS Life Skills.",
  );
});

test("inquiry form explains phone mistakes", async ({ page }) => {
  await page.goto("/inquire");
  await page.getByLabel(/Your name/).fill("A Student");
  await page.getByLabel(/Phone/).fill("12345");
  await page.getByRole("button", { name: "Send inquiry" }).click();
  await expect(page.getByText(/Enter a Nepali mobile number/)).toBeVisible();
});

test("city page has its own heading and metadata", async ({ page }) => {
  await page.goto("/ielts-test-dates/kathmandu");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("IELTS test dates in Kathmandu");
  await expect(page).toHaveTitle(/IELTS Test Dates in Kathmandu/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    /\/ielts-test-dates\/kathmandu$/,
  );
  await page.goto("/ielts-test-dates/atlantis");
  await expect(page.getByRole("heading", { name: "We could not find that page" })).toBeVisible();
});

test("dashboard sends logged-out visitors to log in", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login\?next=(%2F|\/)dashboard/);
});

test("registration shows field errors", async ({ page }) => {
  await page.goto("/register");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Use at least 8 characters.")).toBeVisible();
});
