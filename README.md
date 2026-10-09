# bookyourielts.com

IELTS booking assistance for students in Nepal (Phase 1). Students browse the dates our admin enters, then finish
the booking with us on WhatsApp. There is no payment gateway in Phase 1.

> bookyourielts.com is an independent service. It is not affiliated with the British Council, IDP IELTS or Cambridge
> University Press & Assessment, and must never use their logos or imply an affiliation.

## Stack

| Part | Tech |
|---|---|
| API and admin | Django 5.2, Django REST Framework, drf-spectacular, django-unfold, PostgreSQL 16 |
| Website | Next.js 16 (App Router), TypeScript, Tailwind CSS 4 |
| Auth | Email + password, Django session cookie (httpOnly) + CSRF, email verification, password reset |
| Infra | Docker, blue-green deploy script, nginx, Cloudflare in front |

```
backend/    Django project (apps: core, accounts, catalog, bookings) and pytest tests
frontend/   Next.js app and Playwright smoke tests
deploy/     Compose files, nginx config, deploy.sh
docs/       design-brief.md
```

The browser only talks to its own origin. Next.js proxies `/api/*` to Django (in production nginx routes `/api`,
`/admin` and `/django-static` straight to Django), so session and CSRF cookies are first-party.

## Run it locally

You need Python 3.12, Node 22 and Docker (for Postgres).

```bash
# 1. Postgres (mapped to localhost:5433 so it does not clash with a local install)
docker compose -f deploy/docker-compose.dev.yml up -d db

# 2. Backend
cd backend
python -m venv .venv && source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements/dev.txt
export DEBUG=true DATABASE_URL=postgres://bookyourielts:bookyourielts@127.0.0.1:5433/bookyourielts
export ADMIN_WHATSAPP_NUMBER=9779812345678
python manage.py migrate                 # also loads cities, test types, FAQs, content blocks
python manage.py seed_demo --admin       # demo venues + dates, and admin@example.com / admin12345 (dev only)
python manage.py runserver 8000          # on Windows prefer: python -m waitress --port=8000 config.wsgi:application

# 3. Frontend (new terminal)
cd frontend
npm install
API_ORIGIN=http://localhost:8000 npm run dev
```

Open http://localhost:3000 for the site and http://localhost:8000/admin/ for the admin. API docs are at
http://localhost:8000/api/v1/docs/. Emails (verification, password reset) print to the Django console in development.

> Windows note: Django's built-in dev server drops keep-alive connections, which makes the Next.js proxy log
> "socket hang up". Run the API with `waitress` as shown above (it is in `requirements/dev.txt`).

### Tests and checks

```bash
cd backend  && pytest                          # 70+ tests incl. concurrency (needs Postgres)
cd backend  && ruff check . && ruff format --check .
cd frontend && npm run lint && npm run typecheck && npx prettier --check .
cd frontend && npm run build && npx playwright install chromium && npm run test:e2e   # API must be running with seed_demo data
```

`pre-commit install` enables the same lint and format checks on every commit. GitHub Actions (`.github/workflows/ci.yml`)
runs backend tests, frontend lint/typecheck and the Playwright smoke tests.

## Environment variables

Everything is configured through the environment; see [`.env.example`](.env.example) for the full list with comments.
The ones you must set in production: `SECRET_KEY`, `ALLOWED_HOSTS`, `FRONTEND_URL`, `CORS_ALLOWED_ORIGINS`,
`CSRF_TRUSTED_ORIGINS`, the `POSTGRES_*` values, `ADMIN_WHATSAPP_NUMBER` and your SMTP settings (`EMAIL_*`).
`DEBUG` must be `false`. The WhatsApp number can later be changed in the admin without a redeploy.

## Running the business from the admin

Log in at `/admin/`. The sidebar groups everything an operator needs:

- **Test sessions**: add dates one by one, or use **Bulk create dates** (button at the top of the list) to create
  every combination of cities, test types, formats and sessions on a weekly or custom repeat. Existing dates are never
  duplicated. Registration closing (6 days before) and results dates (5 days computer, 13 days Writing on Paper) are filled
  in automatically if left empty. Bulk actions show, hide or duplicate dates.
- **Booking requests**: filter by status, date and city. Mark requests **confirmed** (takes a seat, refuses if the date is
  full) or **cancelled** (gives the seat back). Seat counts only ever change through this path, inside a database
  transaction with row locks. Each row links to the student on WhatsApp. Export to CSV from the Actions menu.
- **Inquiries**: students who could not find a date. Mark contacted or closed, add notes, export to CSV.
- **Site settings**: WhatsApp number and both message templates, contact details, the low-seat threshold (default 5),
  the announcement banner and the footer disclaimer.
- **FAQs and content blocks**: edit the text shown on the information pages. Cities (with their intro paragraph),
  venues and test types are editable too.

Seat status shown to students is derived: `Registration closed` (after the closing date) > `Full` > `Few seats left`
(at or below the threshold) > `Available`.

## API

Versioned under `/api/v1/`; OpenAPI at `/api/v1/schema/`, Swagger UI at `/api/v1/docs/`. Public read endpoints for cities,
test types, sessions (filters: `city`, `test_type`, `test_format`, `month=YYYY-MM`, `hide_closed`, `page`, `page_size`), FAQs and
site settings. Authenticated endpoints for bookings and the student's own inquiries. Guests can create inquiries
(rate limited to 5 per hour). Login, register and reset endpoints are rate limited and enforce CSRF even for anonymous users.
Nepali mobile numbers are accepted in common formats (`98XXXXXXXX`, `+977 98XXXXXXXX`, `0097798...`) and stored as `+9779XXXXXXXXX`.

## Deploying (VPS, Docker, blue-green behind Cloudflare)

1. Install Docker and nginx on the server. Copy `.env.example` to `.env` and fill it in.
2. Copy `deploy/nginx/bookyourielts.conf` to `/etc/nginx/sites-enabled/` and `deploy/nginx/byi-proxy.conf` to `/etc/nginx/`.
   Put a Cloudflare origin certificate where the config expects it and set Cloudflare SSL mode to **Full (strict)**.
   Create `/etc/nginx/cloudflare-ips.conf` with Cloudflare's published ranges as `set_real_ip_from` lines.
3. Start the shared database once: `docker compose --env-file .env -f deploy/docker-compose.db.yml up -d`.
4. Run `./deploy/deploy.sh`. It builds the idle colour (blue or green), waits for health checks, warms the page caches, switches
   nginx to it, then stops the old colour. If the new colour is unhealthy the old one keeps serving.
5. First deploy only: `docker compose -p byi-blue ... exec backend python manage.py createsuperuser`.

Migrations run when a backend container starts, so keep them backward compatible (add columns before using them) so the old
colour keeps working while the new one starts. Cloudflare R2 (media) is wired through `django-storages` and switches on when
`AWS_STORAGE_BUCKET_NAME` is set; Phase 1 has no uploads.

## Decisions worth knowing

- **British Council check.** The brief asked to re-verify britishcouncil.org.np before building. Both pages timed out repeatedly
  (and `curl` could not connect from this machine), so the information architecture follows the brief. Please compare it once
  with the live site: formats, test types, cities, session times, the 6-day closing rule and result timings.
- Test formats are an enum (`computer`, `computer_wop`), test types and cities are database rows. UKVI is blocked from Writing on Paper.
- Bookings are not blocked on email verification (a verification banner nudges instead); WhatsApp is the real confirmation.
- The existing active request for a date is reused instead of creating duplicates; cancelled requests can be re-booked.
- `/api/v1/auth/me/` returns `{"authenticated": false}` with HTTP 200 for anonymous visitors to keep browser consoles clean.
- Query parameter for format is `test_format`, because DRF reserves `?format=`.
- Fees and dates are always admin-entered; nothing is hardcoded on the website. The demo seed uses obviously fake venues.
- The privacy policy and terms are plain-English drafts. Have a lawyer in Nepal review them before launch.

## Phase 2 (not built, but the code leaves room)

Online payments (eSewa, Khalti, bank), automatic confirmation emails, SMS or WhatsApp notifications and a test-prep area.
Seat logic lives in `apps/bookings/services.py`, so a payment callback can call `set_booking_status` unchanged; the status enum and
`BookingRequest` model are the natural place to add payment fields.
