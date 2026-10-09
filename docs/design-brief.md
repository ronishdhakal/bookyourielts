# Design brief: bookyourielts.com

This replaces the first brief. The earlier direction (green "departure board", mono type, many accent colours) read as
generic and AI-made, so the product now follows a plain, utilitarian booking-app pattern in the brand colours.

## Subject, audience, job
Nepali students, and the parents who often hold the purse, who need an IELTS date to study or work abroad. Mostly on
phones. The site's job: get them from "which date?" to a confirmed seat with as few decisions as possible, and be honest
that we are an independent service.

## Principles
- **Clean and utilitarian.** Grey app background, white panels, thin borders, small radii. No gradients, glows, blobs,
  illustrations or decorative icons.
- **One accent.** The brand red `#c80530` is the only colour. Everything else is near-black and greys. No green, yellow or blue.
- **Wide on desktop.** Content runs to 1440px with 56px side margins. The portal pairs a 24rem profile column with the
  main panel; forms use a label-left layout from 1024px up.
- **Search by preference.** Provider, exam category (Regular or UKVI), test type, format, city and month. The same fields
  appear on the home page, the schedule and the booking form.
- **WhatsApp only at the very last step** of the booking journey.

## Tokens
| Token | Value | Use |
|---|---|---|
| `crimson` | `#c80530` (hover `#a30426`, tint `#fdeef1`) | Primary buttons, links, active tab underline, urgent chips |
| `ink` | `#1d2127` | Text, utility bar, footer, dark buttons, "confirmed" chips |
| `paper` | `#f1f3f5` | App background |
| white | `#ffffff` | Panels, header, inputs |
| `mist` | `#dfe3e8` | Borders and dividers |
| `muted` | `#5b6470` | Secondary text (6.2:1 on white) |

Status never relies on colour alone: seat chips carry a shape and a label, booking chips carry text.
- Seats: *Available* neutral outline with a dot, *Few seats left* red tint, *Full* and *Closed* grey.
- Bookings: *Awaiting confirmation* grey, *Confirmed* dark, *Cancelled* white with muted text.

## Type
One family, **Public Sans** (via `next/font`), with tabular figures. Scale: 14 / 16 / 18 / 24 / 30 / 48. Headings are bold
(700), sentence case, tight leading. No display or monospace faces.

## Layout patterns
- **Header:** dark utility bar (tagline and phone), white bar with logo, five links and one red action.
- **Home:** dark hero with the headline and live numbers; a wide search panel overlaps its lower edge; upcoming dates as a
  table; four process steps; exam types and cities side by side; independence statement; FAQ; closing band.
- **Dates:** a data table from tablet width, stacked rows on phones. Columns: test date and session, exam and provider,
  city, format, register by, results from, fee, seats, action.
- **Portal (as in the reference):** grey background, profile card on the left (avatar, status, member since, mobile, email,
  date of birth), white content panel on the right. Home has a welcome line, a red "Book your IELTS test date" band and a
  "Reserve your date today" tile. The tile opens a **Choose provider** dialog.
- **Booking form:** back button, "Bookings" title, breadcrumb. Three steps in one panel with label-left rows:
  *Exam preference* (IELTS exam, type, format, city, examinee) → *Candidate detail* (preferred date with a calendar that
  underlines days with seats, personal, address, passport) → *Review and confirm*.
- **Admin:** left sidebar with counts, white panels, tables on desktop and stacked rows on phones.

## Components
- Buttons: red (primary), near-black (proceed), outlined (secondary); 46px tall, 6px radius.
- Inputs: 46px, 1px grey border, red focus ring with a soft halo, errors in red text under the field.
- Panels: 12px radius, 1px border, no shadow (a single soft shadow only on the home search panel).
- Dialog: native `<dialog>` with focus trapping and Escape to close.

## Tone
Plain, direct English. Name actions consistently: **Book this date**, **Proceed**, **Confirm and continue on WhatsApp**
(only on the last step), **Send an inquiry**. Errors say what happened and what to do. Never imply affiliation with the
British Council or IDP, and never use their logos.

## Accessibility and performance
WCAG AA contrast, keyboard-first, visible focus, 360px minimum, semantic tables and forms, labelled controls, reduced
motion respected, server-rendered marketing pages, one font file family, no layout shift.
