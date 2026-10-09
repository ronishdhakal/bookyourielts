import { expect, test, type Page } from "@playwright/test";

const ADMIN = { email: "admin@example.com", password: "admin12345" }; // created by `seed_demo --admin` (dev only)

const PASSWORD = "Str0ng-pass-123";

function uniqueUser() {
  const id = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return { name: "Test Student", email: `e2e-${id}@example.com`, phone: "9812345678" };
}

async function fillRegistration(page: Page, u: ReturnType<typeof uniqueUser>) {
  await page.waitForLoadState("networkidle"); // let React hydrate before typing
  await page.getByLabel(/Full name/).fill(u.name);
  await page.getByLabel(/Mobile/).fill(u.phone);
  await page.getByLabel("Email *").fill(u.email);
  await page.getByLabel(/^Password/).fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
}

async function fillDetails(
  page: Page,
  place: { province: string; district: string; city: string },
) {
  await page.getByLabel(/City \/ municipality/).fill(place.city);
  await page.getByLabel(/Province/).selectOption(place.province);
  await page.getByLabel(/District/).selectOption(place.district);
  await page.getByLabel(/Date of birth/).fill("2001-04-05");
  await page.getByLabel(/I confirm these details/).check();
}

/** Open an admin section. On phones the navigation is behind a Menu button. */
async function adminNav(page: Page, name: RegExp | string) {
  const menu = page.getByRole("button", { name: "Menu" });
  if (await menu.isVisible()) await menu.click();
  await page.getByRole("navigation", { name: "Admin" }).getByRole("link", { name }).click();
}

test.beforeEach(async ({ context }) => {
  // Never hit the real WhatsApp during tests.
  await context.route("https://wa.me/**", (route) =>
    route.fulfill({ contentType: "text/html", body: "<title>WhatsApp (test double)</title>" }),
  );
});

test("home page leads with the booking, not with WhatsApp", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("IELTS test date in Nepal");
  await expect(page.getByRole("heading", { level: 1 })).not.toContainText(/whatsapp/i);
  await expect(page.getByRole("heading", { name: "Upcoming test dates" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Find your test date" })).toBeVisible();
  await expect(page.getByText("independent service").first()).toBeVisible();
  await expect(page.getByRole("link", { name: /^Book this date/ }).first()).toBeVisible();
  await expect(page.locator("section").first()).not.toContainText(/whatsapp/i);
});

test("filter dates, log in, and book with WhatsApp only at the last step", async ({ page }) => {
  await page.goto("/ielts-test-dates");
  const toggle = page.getByRole("button", { name: /^Filters/ });
  if (await toggle.isVisible()) await toggle.click(); // filters are collapsed on phones
  await page.getByLabel("City").selectOption("pokhara");
  await expect(page).toHaveURL(/city=pokhara/);
  await expect(page.getByText(/\d+ dates?/).first()).toBeVisible();
  await expect(page.locator("main")).not.toContainText(/whatsapp/i);

  // Anonymous students are sent to log in, then returned to the same date inside the portal.
  await page
    .getByRole("link", { name: /^Book this date/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/login\?next=/);
  await page.getByRole("link", { name: "Create a free account" }).click();
  const u = uniqueUser();
  await fillRegistration(page, u);

  // The chosen date skips straight to the candidate details.
  await expect(page).toHaveURL(/\/portal\/book\?session=\d+/);
  await expect(page.getByRole("heading", { name: "Candidate details" })).toBeVisible();
  await expect(page.locator("main")).not.toContainText(/whatsapp/i);
  await expect(page.getByLabel("Full name *")).toHaveValue(u.name);

  await fillDetails(page, { province: "Gandaki", district: "Kaski", city: "Lakeside" });
  await page.getByRole("button", { name: "Continue" }).click();

  // Only now does the flow mention WhatsApp.
  await expect(page.getByRole("heading", { name: "Review and confirm" })).toBeVisible();
  await expect(page.getByText(/WhatsApp/).first()).toBeVisible();
  await page.getByLabel(/I agree to the/).check();
  const popupPromise = page.context().waitForEvent("page");
  await page.getByRole("button", { name: "Confirm and continue on WhatsApp" }).click();
  const popup = await popupPromise;
  await popup.waitForURL(/wa\.me/);
  const text = new URL(popup.url()).searchParams.get("text") ?? "";
  expect(text).toContain("Hi, my name is Test Student. I want to book IELTS.");
  expect(text).toContain("City: Pokhara");
  expect(text).toMatch(/Reference: BYI-\d{4}-\d{6}/);

  await expect(page.getByText(/Booking request BYI-/)).toBeVisible();
  await page.getByRole("link", { name: "View this request" }).click();
  await expect(page.getByText("Awaiting confirmation").first()).toBeVisible();
  await expect(page.getByText("Lakeside, Kaski, Gandaki")).toBeVisible();
});

test("the stepper walks through provider, preferences, date, details and review", async ({
  page,
}) => {
  await page.goto("/register?next=%2Fportal%2Fbook");
  await fillRegistration(page, uniqueUser());

  await expect(page.getByRole("heading", { name: "Choose your exam provider" })).toBeVisible();
  await expect(page.locator("main")).not.toContainText(/whatsapp/i);
  await expect(page.getByRole("button", { name: "Continue" })).toBeDisabled();
  await page.getByText("British Council IELTS").click();
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByRole("heading", { name: "Exam preferences" })).toBeVisible();
  await page.getByLabel("Test type").selectOption("academic");
  await page.getByLabel("Format").selectOption("computer");
  await page.getByRole("radio", { name: /Kathmandu/ }).check({ force: true });
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByRole("heading", { name: "Pick your test date" })).toBeVisible();
  await page.locator('[role="grid"] button:not([disabled])').first().click();
  await page.getByRole("radio").first().check({ force: true });
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByRole("heading", { name: "Candidate details" })).toBeVisible();
  // Required fields are validated with specific messages.
  await page.getByLabel(/Date of birth/).fill("");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Enter the date of birth.")).toBeVisible();
  await expect(page.getByText("Choose a province.")).toBeVisible();
  await expect(page.getByText("Please confirm that the details match the passport.")).toBeVisible();

  await fillDetails(page, { province: "Bagmati", district: "Kathmandu", city: "Thamel" });
  await page
    .locator('input[type="file"]')
    .first()
    .setInputFiles({
      name: "front.png",
      mimeType: "image/png",
      buffer: Buffer.from("89504e470d0a1a0a00", "hex"),
    });
  await expect(page.getByText("front.png")).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByRole("heading", { name: "Review and confirm" })).toBeVisible();
  await expect(page.getByText("Front attached")).toBeVisible();
  await page.getByRole("button", { name: "Edit" }).first().click();
  await expect(page.getByRole("heading", { name: "Exam preferences" })).toBeVisible();
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
  await page.getByLabel(/Mobile number/).fill("+977 9801234567");
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
  await page.getByLabel(/Mobile number/).fill("12345");
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

test("the portal sends logged-out visitors to log in", async ({ page }) => {
  await page.goto("/portal/bookings");
  await expect(page).toHaveURL(/\/login\?next=/);
});

test("registration shows field errors", async ({ page }) => {
  await page.goto("/register");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Use at least 8 characters.")).toBeVisible();
});

test("a student can withdraw an unconfirmed request", async ({ page }) => {
  await page.goto("/ielts-test-dates?city=kathmandu");
  await page
    .getByRole("link", { name: /^Book this date/ })
    .first()
    .click();
  await page.getByRole("link", { name: "Create a free account" }).click();
  await fillRegistration(page, uniqueUser());
  await fillDetails(page, { province: "Bagmati", district: "Kathmandu", city: "Thamel" });
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel(/I agree to the/).check();
  const popup = page.context().waitForEvent("page");
  await page.getByRole("button", { name: "Confirm and continue on WhatsApp" }).click();
  await (await popup).close();
  await page.getByRole("link", { name: "View this request" }).click();
  await page.getByRole("button", { name: "Withdraw request" }).click();
  await page.getByRole("button", { name: "Yes, withdraw" }).click();
  await expect(page.getByText("Cancelled").first()).toBeVisible();
});

test("a signed-in student skips the marketing home and lands on their dashboard", async ({
  page,
}) => {
  await page.goto("/register?next=%2Fportal");
  await fillRegistration(page, uniqueUser());
  await expect(page).toHaveURL(/\/portal$/);
  await expect(page.getByRole("heading", { name: /^Namaste, / })).toBeVisible();

  await page.goto("/");
  await expect(page).toHaveURL(/\/portal$/);
  // The public site stays reachable on purpose.
  await page.goto("/?site=1");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("IELTS test date in Nepal");
  // Students cannot open the admin dashboard.
  await page.goto("/portal/manage");
  await expect(page).toHaveURL(/\/portal$/);
});

test("staff sign in to the admin dashboard and manage dates and requests", async ({ page }) => {
  await page.goto("/login");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Email").fill(ADMIN.email);
  await page.getByLabel("Password").fill(ADMIN.password);
  await page.getByRole("button", { name: "Log in" }).click();

  await expect(page).toHaveURL(/\/portal\/manage$/);
  await expect(page.getByRole("heading", { name: "Overview", level: 1 })).toBeVisible();
  await expect(page.getByLabel("Key numbers")).toContainText("Awaiting confirmation");

  await adminNav(page, /^Test dates/);
  await expect(page.getByRole("heading", { name: "Test dates", level: 1 })).toBeVisible();
  await page.getByRole("link", { name: "Add a date" }).click();
  await page.getByRole("button", { name: "Add date" }).click();
  await expect(page.getByText("Choose the test date.")).toBeVisible();
  await expect(page.getByText("Choose a city.")).toBeVisible();

  await adminNav(page, /^Booking requests/);
  await expect(page.getByRole("heading", { name: "Booking requests", level: 1 })).toBeVisible();
  await page.getByRole("tab", { name: /^Confirmed/ }).click();
  await expect(page).toHaveURL(/status=confirmed/);

  await adminNav(page, /^Inquiries/);
  await expect(page.getByRole("heading", { name: "Inquiries", level: 1 })).toBeVisible();
  await adminNav(page, /^Settings/);
  await expect(page.getByLabel("WhatsApp number")).not.toHaveValue("");
});

test("staff confirm a request from the dashboard", async ({ page, browser }) => {
  // A student makes a request...
  const sctx = await browser.newContext();
  const sp = await sctx.newPage();
  await sp.goto("/ielts-test-dates?city=chitwan");
  await sp
    .getByRole("link", { name: /^Book this date/ })
    .first()
    .click();
  await sp.getByRole("link", { name: "Create a free account" }).click();
  await fillRegistration(sp, uniqueUser());
  await fillDetails(sp, { province: "Bagmati", district: "Chitwan", city: "Bharatpur" });
  await sp.getByRole("button", { name: "Continue" }).click();
  await sp.getByLabel(/I agree to the/).check();
  await sctx.route("https://wa.me/**", (r) => r.fulfill({ body: "ok" }));
  const popup = sp.context().waitForEvent("page");
  await sp.getByRole("button", { name: "Confirm and continue on WhatsApp" }).click();
  await (await popup).close();
  const reference =
    (await sp.getByText(/Booking request BYI-/).textContent())?.match(/BYI-\d{4}-\d{6}/)?.[0] ?? "";
  expect(reference).not.toBe("");
  await sctx.close();

  // ...and staff find it and confirm it.
  await page.goto("/login");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Email").fill(ADMIN.email);
  await page.getByLabel("Password").fill(ADMIN.password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/portal\/manage$/);
  await page.goto(`/portal/manage/bookings?q=${reference}`);
  await page.getByRole("link", { name: reference }).first().click();
  await expect(page.getByText("Awaiting confirmation").first()).toBeVisible();
  await page.getByRole("textbox", { name: "Internal notes" }).fill("Paid by cash");
  await page.getByRole("button", { name: "Save notes" }).click();
  await expect(page.getByText("Saved")).toBeVisible();
  await page.getByRole("button", { name: /^Confirm booking/ }).click();
  await expect(page.getByText("Confirmed").first()).toBeVisible();
  await expect(page.getByRole("button", { name: /^Confirm booking/ })).toHaveCount(0);
});
