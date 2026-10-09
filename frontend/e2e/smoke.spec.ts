import { expect, test, type Page } from "@playwright/test";

const ADMIN = { email: "admin@example.com", password: "admin12345" }; // created by `seed_demo --admin` (dev only)
const PASSWORD = "Str0ng-pass-123";
const PNG = {
  name: "front.png",
  mimeType: "image/png",
  buffer: Buffer.from("89504e470d0a1a0a00", "hex"),
};

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

async function register(page: Page, next = "/portal") {
  await page.goto(`/register?next=${encodeURIComponent(next)}`);
  const u = uniqueUser();
  await fillRegistration(page, u);
  return u;
}

/** Fill the candidate details in the booking drawer and tick the confirmation. */
async function fillDetails(
  page: Page,
  place: { province: string; district: string; city: string } = {
    province: "Bagmati",
    district: "Kathmandu",
    city: "Thamel",
  },
) {
  const drawer = page.getByRole("dialog");
  await drawer.getByLabel(/City \/ municipality/).fill(place.city);
  await drawer.getByLabel(/Province/).selectOption(place.province);
  await drawer.getByLabel(/District/).selectOption(place.district);
  await drawer.getByLabel(/Date of birth/).fill("2001-04-05");
  await drawer.locator("#bk-passport").setInputFiles(PNG);
  await drawer.getByLabel(/I confirm these details/).check();
}

/** Review, agree and confirm. Returns the reference shown on the final screen. */
async function confirmBooking(page: Page): Promise<string> {
  const drawer = page.getByRole("dialog");
  await drawer.getByRole("button", { name: "Review" }).click();
  await expect(drawer.getByRole("heading", { name: "Review and confirm" })).toBeVisible();
  await drawer.getByLabel(/I agree to the/).check();
  await drawer.getByRole("button", { name: "Confirm booking" }).click();
  await expect(drawer.getByText("Your booking request is confirmed")).toBeVisible();
  const href =
    (await drawer.getByRole("link", { name: "Message us on WhatsApp" }).getAttribute("href")) ?? "";
  const text = new URL(href).searchParams.get("text") ?? "";
  const ref = text.match(/BYI-\d{4}-\d{6}/)?.[0] ?? "";
  expect(ref).not.toBe("");
  return ref;
}

/** Open an admin section. On phones the navigation is behind a Menu button. */
async function adminNav(page: Page, name: RegExp | string) {
  const menu = page.getByRole("button", { name: "Menu" });
  if (await menu.isVisible()) await menu.click();
  await page.getByRole("navigation", { name: "Admin" }).getByRole("link", { name }).click();
}

async function adminLogin(page: Page) {
  await page.goto("/login");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Email").fill(ADMIN.email);
  await page.getByLabel("Password").fill(ADMIN.password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/portal\/manage$/);
}

test.beforeEach(async ({ context }) => {
  // Analytics is not part of what the tests check, and must not slow them down.
  await context.route("**/googletagmanager.com/**", (route) => route.abort());
  await context.route("**/google-analytics.com/**", (route) => route.abort());
  // Never hit the real WhatsApp during tests.
  await context.route("https://wa.me/**", (route) =>
    route.fulfill({ contentType: "text/html", body: "<title>WhatsApp (test double)</title>" }),
  );
});

/* ------------------------------------------------------------------ public site */
test("home page leads with the booking, not with WhatsApp", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("IELTS test date in Nepal");
  await expect(page.getByRole("heading", { level: 1 })).not.toContainText(/whatsapp/i);
  await expect(page.getByRole("heading", { name: "Upcoming test dates" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Search test dates" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Book Your IELTS" })).toHaveAttribute(
    "href",
    /\/portal\/dates$/,
  );
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

  // The chosen date opens in the booking panel on the Find a date page.
  await expect(page).toHaveURL(/\/portal\/dates\?session=\d+/);
  const drawer = page.getByRole("dialog");
  await expect(drawer.getByRole("heading", { name: "Book this date" })).toBeVisible();
  await expect(drawer).toContainText("Pokhara");
  await expect(drawer).not.toContainText(/whatsapp/i);
  await expect(drawer.getByLabel("Full name *")).toHaveValue(u.name);

  await fillDetails(page, { province: "Gandaki", district: "Kaski", city: "Lakeside" });
  await drawer.getByRole("button", { name: "Review" }).click();
  // Only now does the flow mention WhatsApp.
  await expect(drawer.getByText(/WhatsApp/).first()).toBeVisible();
  await drawer.getByLabel(/I agree to the/).check();
  await drawer.getByRole("button", { name: "Confirm booking" }).click();
  await expect(drawer.getByText("Your booking request is confirmed")).toBeVisible();
  const href =
    (await drawer.getByRole("link", { name: "Message us on WhatsApp" }).getAttribute("href")) ?? "";
  expect(href).toMatch(/^https:\/\/wa\.me\//);
  const text = new URL(href).searchParams.get("text") ?? "";
  expect(text).toContain("Hi, my name is Test Student. I want to book IELTS.");
  expect(text).toContain("City: Pokhara");
  expect(text).toMatch(/Reference: BYI-\d{4}-\d{6}/);

  await expect(drawer.getByText(/BYI-\d{4}-\d{6}/).first()).toBeVisible();
  await drawer.getByRole("link", { name: "View this request" }).click();
  await expect(page.getByText("Awaiting confirmation").first()).toBeVisible();
  await expect(page.getByText("Lakeside, Kaski, Gandaki")).toBeVisible();
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

test("registration shows field errors", async ({ page }) => {
  await page.goto("/register");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Use at least 8 characters.")).toBeVisible();
});

/* ------------------------------------------------------------------ student portal */
test("the portal sends logged-out visitors to log in", async ({ page }) => {
  await page.goto("/portal/bookings");
  await expect(page).toHaveURL(/\/login\?next=/);
});

test("a signed-in student skips the marketing home and lands on their dashboard", async ({
  page,
}) => {
  await register(page);
  await expect(page).toHaveURL(/\/portal$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    /^Good (morning|afternoon|evening), /,
  );
  await expect(page.getByRole("heading", { name: "No test booked yet" })).toBeVisible();

  await page.goto("/");
  await expect(page).toHaveURL(/\/portal$/);
  // The public site stays reachable on purpose.
  await page.goto("/?site=1");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("IELTS test date in Nepal");
  // Students cannot open the admin dashboard.
  await page.goto("/portal/manage");
  await expect(page).toHaveURL(/\/portal$/);
});

test("find a date: filters, list and month views, and the booking panel", async ({ page }) => {
  await register(page, "/portal/dates");
  await expect(page.getByRole("heading", { name: "Find a date", level: 1 })).toBeVisible();
  await page.getByLabel("City", { exact: true }).selectOption("kathmandu");
  await expect(page).toHaveURL(/city=kathmandu/);
  await page.getByLabel("Test type").selectOption("academic");
  await expect(page).toHaveURL(/test_type=academic/);
  await expect(page.getByRole("button", { name: /^Select/ }).first()).toBeVisible();
  await expect(page.getByText(/seats left/).first()).toBeVisible();

  // Month view: pick a day, then a session from the side panel.
  await page.getByRole("tab", { name: "Month" }).click();
  await expect(page.getByRole("grid")).toBeVisible();
  await page.locator('[role="grid"] button:not([disabled])').first().click();
  await page.getByRole("button", { name: "Select", exact: true }).first().click();
  const drawer = page.getByRole("dialog");
  await expect(drawer.getByRole("heading", { name: "Book this date" })).toBeVisible();
  await expect(drawer).toContainText("Kathmandu");

  // Validation inside the panel
  await drawer.getByLabel(/Date of birth/).fill("");
  await drawer.getByRole("button", { name: "Review" }).click();
  await expect(drawer.getByText("Enter the date of birth.")).toBeVisible();
  await expect(drawer.getByText("Choose a province.")).toBeVisible();
  await expect(drawer.getByText(/Add a photo of the passport page/)).toBeVisible();
  await expect(
    drawer.getByText("Please confirm that the details match the passport."),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();
});

test("date alerts: save a search, see its matches, pause and delete it", async ({ page }) => {
  await register(page, "/portal/dates?city=butwal");
  await page.getByRole("button", { name: "Notify me about this search" }).click();
  await expect(page.getByText(/Alert saved/)).toBeVisible();
  await page.goto("/portal/alerts");
  await expect(page.getByRole("heading", { name: "Date alerts", level: 1 })).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: /Butwal/ })).toBeVisible();
  await expect(page.getByText(/open dates?/).first()).toBeVisible();
  await page.getByRole("button", { name: "Pause" }).click();
  await expect(page.getByText("Paused")).toBeVisible();
  await page.getByRole("button", { name: "Delete alert" }).click();
  await expect(page.getByRole("heading", { name: "No alerts yet" })).toBeVisible();
});

test("saved candidates are created while booking and reused next time", async ({ page }) => {
  await register(page, "/portal/dates?city=kathmandu");
  await page
    .getByRole("button", { name: /^Select/ })
    .first()
    .click();
  const drawer = page.getByRole("dialog");
  await drawer.getByText("Someone new").click();
  await drawer.getByLabel("Full name *").fill("Maya Gurung");
  await drawer.getByLabel("Mobile number *").fill("9801112233");
  await drawer.getByLabel("Who is this?").fill("Daughter");
  await fillDetails(page);
  await expect(drawer.getByLabel(/Save to my candidates/)).toBeChecked();
  await confirmBooking(page);

  await page.goto("/portal/candidates");
  await expect(page.getByText("Maya Gurung")).toBeVisible();
  await expect(page.getByText(/Daughter/)).toBeVisible();

  // Next booking: pick her in one tap and the details are filled in.
  await page.goto("/portal/dates?city=kathmandu");
  await page
    .getByRole("button", { name: /^Select/ })
    .nth(1)
    .click();
  await page.getByRole("dialog").getByText("Maya Gurung").click();
  await expect(page.getByRole("dialog").getByLabel("Full name *")).toHaveValue("Maya Gurung");
  await expect(page.getByRole("dialog").getByLabel(/City \/ municipality/)).toHaveValue("Thamel");
});

test("a booking page tracks progress, adds a calendar entry, takes passports and change requests", async ({
  page,
}) => {
  await register(page, "/portal/dates?city=kathmandu");
  await page
    .getByRole("button", { name: /^Select/ })
    .first()
    .click();
  await fillDetails(page);
  const ref = await confirmBooking(page);
  await page.getByRole("dialog").getByRole("link", { name: "View this request" }).click();

  await expect(page.getByRole("heading", { level: 1 })).toContainText("IELTS");
  await expect(page.getByRole("list", { name: "Booking progress" })).toBeVisible();
  await expect(page.getByText(ref).first()).toBeVisible();

  // Calendar file
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Add to calendar" }).click();
  expect((await download).suggestedFilename()).toBe(`${ref}.ics`);

  // Passport added after booking
  await expect(page.getByText(/Uploaded\. Stored privately/)).toBeVisible();
  await page.locator("#doc-passport").setInputFiles(PNG);
  await page.getByRole("button", { name: "Upload", exact: true }).click();
  await expect(page.getByText("Passport uploaded.")).toBeVisible();

  // Change request
  await page.getByLabel("Tell us what to change").fill("Please move me to the following week.");
  await page.getByRole("button", { name: "Send request" }).click();
  await expect(page.getByText("Waiting for our team")).toBeVisible();

  // Checklist is remembered
  await page.getByLabel("Original passport packed").check();
  await page.reload();
  await expect(page.getByLabel("Original passport packed")).toBeChecked();
});

test("a student can withdraw an unconfirmed request", async ({ page }) => {
  await register(page, "/portal/dates?city=kathmandu");
  await page
    .getByRole("button", { name: /^Select/ })
    .first()
    .click();
  await fillDetails(page);
  await confirmBooking(page);
  await page.getByRole("dialog").getByRole("link", { name: "View this request" }).click();
  await page.getByRole("button", { name: "Withdraw request" }).click();
  await page.getByRole("button", { name: "Yes, withdraw" }).click();
  await expect(page.getByText("Cancelled").first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Book again" })).toBeVisible();
});

/* ------------------------------------------------------------------ admin dashboard */
test("staff sign in to the admin dashboard and manage dates and requests", async ({ page }) => {
  await adminLogin(page);
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
  await page.getByRole("tab", { name: /^Change requests/ }).click();
  await expect(page).toHaveURL(/change=open/);

  await adminNav(page, /^Inquiries/);
  await expect(page.getByRole("heading", { name: "Inquiries", level: 1 })).toBeVisible();
  await adminNav(page, /^Settings/);
  await expect(page.getByLabel("WhatsApp number")).not.toHaveValue("");
});

test("staff confirm a request and resolve a change request from the dashboard", async ({
  page,
  browser,
}) => {
  // A student makes a request and asks for a change...
  const sctx = await browser.newContext();
  await sctx.route("https://wa.me/**", (r) => r.fulfill({ body: "ok" }));
  const sp = await sctx.newPage();
  await register(sp, "/portal/dates?city=chitwan");
  await sp
    .getByRole("button", { name: /^Select/ })
    .first()
    .click();
  await fillDetails(sp, { province: "Bagmati", district: "Chitwan", city: "Bharatpur" });
  const reference = await confirmBooking(sp);
  await sp.getByRole("dialog").getByRole("link", { name: "View this request" }).click();
  await sp.getByLabel("Tell us what to change").fill("Please correct the spelling of my name.");
  await sp.getByRole("button", { name: "Send request" }).click();
  await expect(sp.getByText("Waiting for our team")).toBeVisible();
  await sctx.close();

  // ...and staff find it, resolve the change and confirm the booking.
  await adminLogin(page);
  await page.goto(`/portal/manage/bookings?q=${reference}`);
  await page.getByRole("link", { name: reference }).first().click();
  await expect(page.getByText("Awaiting confirmation").first()).toBeVisible();
  await expect(page.getByText(/correct the spelling of my name/)).toBeVisible();
  await page.getByRole("button", { name: "Mark as resolved" }).click();
  await expect(page.getByText("Resolved", { exact: true })).toBeVisible();
  await page.getByRole("textbox", { name: "Internal notes" }).fill("Paid by cash");
  await page.getByRole("button", { name: "Save notes" }).click();
  await expect(page.getByText("Saved")).toBeVisible();
  await page.getByRole("button", { name: /^Confirm booking/ }).click();
  await expect(page.getByText("Confirmed").first()).toBeVisible();
  await expect(page.getByRole("button", { name: /^Confirm booking/ })).toHaveCount(0);
});

test("the Book Your IELTS button leads to the portal after sign-in", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Book Your IELTS" }).click();
  await expect(page).toHaveURL(/\/login\?next=/);
  await page.getByRole("link", { name: "Create a free account" }).click();
  await fillRegistration(page, uniqueUser());
  await expect(page).toHaveURL(/\/portal\/dates$/);
  await expect(page.getByRole("heading", { name: "Find a date", level: 1 })).toBeVisible();
});

/* ------------------------------------------------------------------ general questions, bulk dates, assignment */
test("a general question can be sent from the home page without any WhatsApp wording first", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  const ask = page.locator("#ask");
  await expect(ask).not.toContainText(/whatsapp/i);
  await ask.getByLabel("Your name").fill("Sita Rai");
  await ask.getByLabel("Mobile number").fill("9812345678");
  await ask.getByLabel("How can we help?").fill("Which documents do I need to bring?");
  await ask.getByRole("button", { name: "Send message" }).click();
  await expect(ask.getByRole("heading", { name: "Thanks, we have your message" })).toBeVisible();
  await expect(ask.getByText(/whatsapp/i).first()).toBeVisible();
});

test("the contact page has the same general question form", async ({ page }) => {
  await page.goto("/contact");
  await expect(page.locator("#ask").getByLabel("How can we help?")).toBeVisible();
});

test("a student can ask a question from the portal Help page and see it listed", async ({
  page,
}) => {
  await register(page, "/portal/help");
  await page.getByLabel("How can we help?").fill("Can I change my city after booking?");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByRole("heading", { name: "Thanks, we have your message" })).toBeVisible();
  await expect(page.getByText("Can I change my city after booking?")).toBeVisible();
});

test("staff can select dates and delete them in bulk", async ({ page }) => {
  await adminLogin(page);
  await adminNav(page, /^Test dates/);
  await page.getByRole("link", { name: "Add a date" }).click();
  await page.getByLabel("Test date").fill("2020-03-14");
  await page.getByLabel("City").selectOption({ label: "Kathmandu" });
  await page.getByLabel(/^Test type/).selectOption({ index: 1 });
  await page.getByLabel(/^Fee/).fill("25000");
  await page.getByLabel(/^Seats in total/).fill("20");
  await page.getByRole("button", { name: "Add date" }).click();
  await expect(page.getByRole("heading", { name: "Test dates", level: 1 })).toBeVisible();
  await page.getByRole("tab", { name: "Past" }).click();
  await page
    .getByRole("checkbox", { name: /^Select .*14 Mar/ })
    .first()
    .check();
  await expect(page.getByText("1 selected")).toBeVisible();
  await page.getByRole("button", { name: "Delete selected" }).click();
  await page.getByRole("button", { name: "Yes, delete" }).click();
  await expect(page.getByText(/1 deleted/)).toBeVisible();
});

test("staff assign the session and venue after booking and the student sees them", async ({
  page,
  browser,
}) => {
  const sctx = await browser.newContext();
  await sctx.route("https://wa.me/**", (r) => r.fulfill({ body: "ok" }));
  const sp = await sctx.newPage();
  await register(sp, "/portal/dates?city=chitwan");
  await sp
    .getByRole("button", { name: /^Select/ })
    .first()
    .click();
  await expect(sp.getByRole("dialog")).toContainText("Confirmed after booking");
  await fillDetails(sp, { province: "Bagmati", district: "Chitwan", city: "Bharatpur" });
  const reference = await confirmBooking(sp);

  await adminLogin(page);
  await page.goto(`/portal/manage/bookings?q=${reference}`);
  await page.getByRole("link", { name: reference }).first().click();
  await expect(page.getByRole("heading", { name: "Session and venue" })).toBeVisible();
  await page.getByLabel("Session", { exact: true }).selectOption("afternoon");
  await page.getByRole("textbox", { name: "Venue" }).fill("Test Centre, Bharatpur");
  await page.getByRole("button", { name: "Save assignment" }).click();
  await expect(page.getByText("Saved").first()).toBeVisible();

  await sp.getByRole("dialog").getByRole("link", { name: "View this request" }).click();
  await expect(sp.getByText("Test Centre, Bharatpur")).toBeVisible();
  await sctx.close();
});

test("a confirmed booking shows up in the student's portal notifications", async ({
  page,
  browser,
}) => {
  const sctx = await browser.newContext();
  await sctx.route("https://wa.me/**", (r) => r.fulfill({ body: "ok" }));
  const sp = await sctx.newPage();
  await register(sp, "/portal/dates?city=chitwan");
  await sp
    .getByRole("button", { name: /^Select/ })
    .first()
    .click();
  await fillDetails(sp, { province: "Bagmati", district: "Chitwan", city: "Bharatpur" });
  const reference = await confirmBooking(sp);

  await adminLogin(page);
  await page.goto(`/portal/manage/bookings?q=${reference}`);
  await page.getByRole("link", { name: reference }).first().click();
  await page.getByRole("button", { name: /^Confirm booking/ }).click();
  await expect(page.getByText("Confirmed").first()).toBeVisible();

  await sp.goto("/portal");
  await expect(sp.getByRole("region", { name: "Latest update" })).toContainText(
    `${reference} is confirmed`,
  );
  await sp.getByRole("button", { name: /^Notifications/ }).click();
  await expect(sp.getByRole("menuitem", { name: /is confirmed/ })).toBeVisible();
  await sp.getByRole("link", { name: "See all notifications" }).click();
  await expect(sp.getByRole("heading", { name: "Notifications", level: 1 })).toBeVisible();
  await expect(sp.getByText(`Your booking ${reference} is confirmed`)).toBeVisible();
  await sp.getByRole("button", { name: "Mark all as read" }).click();
  await expect(sp.getByRole("button", { name: "Mark all as read" })).toHaveCount(0);
  await sctx.close();
});

test("staff can delete a booking request and an inquiry in bulk", async ({ page, browser }) => {
  const sctx = await browser.newContext();
  await sctx.route("https://wa.me/**", (r) => r.fulfill({ body: "ok" }));
  const sp = await sctx.newPage();
  await register(sp, "/portal/dates?city=chitwan");
  await sp
    .getByRole("button", { name: /^Select/ })
    .first()
    .click();
  await fillDetails(sp, { province: "Bagmati", district: "Chitwan", city: "Bharatpur" });
  const reference = await confirmBooking(sp);
  await sctx.close();

  await adminLogin(page);
  await page.goto(`/portal/manage/bookings?q=${reference}`);
  await page
    .getByRole("checkbox", { name: `Select ${reference}` })
    .first()
    .check();
  await page.getByRole("button", { name: "Delete selected" }).click();
  await page.getByRole("button", { name: "Yes, delete" }).click();
  await expect(page.getByText("1 deleted.")).toBeVisible();
  await expect(page.getByText("No booking requests match")).toBeVisible();

  await page.goto("/portal/manage/inquiries");
  const first = page.getByRole("checkbox", { name: /^Select / }).first();
  await first.check();
  await page.getByRole("button", { name: "Delete selected" }).click();
  await page.getByRole("button", { name: "Yes, delete" }).click();
  await expect(page.getByText("1 deleted.")).toBeVisible();
});

test("staff send a remark and the student reads it on the booking", async ({ page, browser }) => {
  const sctx = await browser.newContext();
  const sp = await sctx.newPage();
  await register(sp, "/portal/dates?city=chitwan");
  await sp
    .getByRole("button", { name: /^Select/ })
    .first()
    .click();
  await fillDetails(sp, { province: "Bagmati", district: "Chitwan", city: "Bharatpur" });
  const reference = await confirmBooking(sp);

  await adminLogin(page);
  await page.goto(`/portal/manage/bookings?q=${reference}`);
  await page.getByRole("link", { name: reference }).first().click();
  await page
    .getByLabel("Message", { exact: true })
    .fill("Please bring a printed copy of the passport.");
  await page.getByRole("button", { name: "Send to student" }).click();
  await expect(page.getByText("Not seen yet")).toBeVisible();

  await sp.goto("/portal");
  await expect(sp.getByRole("region", { name: "Latest update" })).toContainText(
    "Please bring a printed copy",
  );
  await sp.getByRole("link", { name: "View booking" }).click();
  await expect(sp.getByRole("heading", { name: "Messages from our team" })).toBeVisible();
  await sctx.close();
});

test("a student changes the date, and a confirmed booking waits for staff approval", async ({
  page,
  browser,
}) => {
  const sctx = await browser.newContext();
  const sp = await sctx.newPage();
  await register(sp, "/portal/dates?city=chitwan");
  await sp
    .getByRole("button", { name: /^Select/ })
    .first()
    .click();
  await fillDetails(sp, { province: "Bagmati", district: "Chitwan", city: "Bharatpur" });
  const reference = await confirmBooking(sp);
  await sp.getByRole("dialog").getByRole("link", { name: "View this request" }).click();

  // Not confirmed yet: the move happens at once.
  await sp.getByLabel("New date").selectOption({ index: 1 });
  await sp.getByRole("button", { name: "Change date", exact: true }).click();
  await expect(sp.getByText("Your test date has been changed.")).toBeVisible();

  // Staff confirm it, then the student asks for another move.
  await adminLogin(page);
  await page.goto(`/portal/manage/bookings?q=${reference}`);
  await page.getByRole("link", { name: reference }).first().click();
  await page.getByRole("button", { name: /^Confirm booking/ }).click();
  await expect(page.getByText("Confirmed").first()).toBeVisible();

  await sp.reload();
  await sp.getByLabel("New date").selectOption({ index: 1 });
  await sp.getByRole("button", { name: "Request date change" }).click();
  await expect(sp.getByText(/Waiting for approval/)).toBeVisible();

  await page.reload();
  await page.getByRole("button", { name: "Approve date change" }).click();
  await expect(page.getByRole("button", { name: "Approve date change" })).toHaveCount(0);
  await sp.reload();
  await expect(sp.getByText(/Waiting for approval/)).toHaveCount(0);
  await sctx.close();
});

test("staff add many dates at once by tapping days on a calendar", async ({ page }) => {
  await adminLogin(page);
  await adminNav(page, /^Test dates/);
  await page.getByRole("link", { name: "Add many dates" }).click();
  await expect(page.getByRole("heading", { name: "Add many dates", level: 1 })).toBeVisible();
  await expect(page.getByLabel("Seats on each date")).toHaveValue("5");

  await page.getByRole("button", { name: "Create dates" }).click();
  await expect(page.getByText("Tap the days on the calendar.")).toBeVisible();

  await page.getByLabel("City").selectOption({ label: "Kathmandu" });
  await page.getByLabel("Test type").selectOption({ index: 1 });
  await page.getByLabel("Fee (NPR)").fill("28000");
  for (let i = 0; i < 24; i++) await page.getByRole("button", { name: "Later" }).click();
  const days = page.locator('[role="grid"] button:not([disabled])');
  await days.nth(2).click();
  await days.nth(9).click();
  await expect(page.getByText("2 days chosen")).toBeVisible();
  await page.getByRole("button", { name: "Create 2 dates" }).click();
  await expect(page.getByText(/dates? added/)).toBeVisible();
});
