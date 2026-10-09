# Design brief: bookyourielts.com

## Subject, audience, job
Nepali students (and the parents who often hold the purse) who need an IELTS date to study or work abroad. Mostly on phones, often on mobile data. The site's one job: get them from "which date?" to a WhatsApp conversation with us in under a minute, and be honest that we are an independent service.

## Idea
**The test date is a boarding pass.** IELTS is the ticket out; the schedule is the departures board. The whole identity borrows from transport timetables (monospace dates, status chips, hairline rules, a dark board panel) and keeps everything else calm and plain. The signature element is the **departure board**: a spruce-green panel with monospace rows, shown in the hero (next five dates, live) and as the full schedule on `/ielts-test-dates`. On phones, each row becomes a stacked "pass" row, not a shrunken table.

Rejected on purpose: cream + terracotta editorial, black + neon, broadsheet columns, purple-blue gradients, emoji icon grids, repeated rounded cards.

## Palette (AA checked on the backgrounds listed)
| Token | Hex | Use |
|---|---|---|
| `paper` | `#F2F4F0` | Page background (cool mineral, not cream) |
| `ink` | `#0E1F1C` | Text, 15:1 on paper |
| `spruce` | `#123A33` | Board panel, footer, primary dark surfaces |
| `spruce-2` | `#1C4D44` | Board row hover / borders on spruce |
| `crimson` | `#B8232B` | The single accent: primary buttons, key links. 5.6:1 on paper, white text on it 6.4:1 |
| `marigold` | `#F0B33A` | "Few seats left" only; ink text on it |
| `mist` | `#D9DFD8` | Hairlines, input borders on paper |
| `muted` | `#4A5C57` | Secondary text, 6.3:1 on paper |
| `board-text` | `#E8F0EC` | Text on spruce, 11:1 |
| `ok` | `#3FBF8F` on spruce / `#0F6B4B` on paper | "Available" |

Status chips always pair colour with a text label and a shape glyph, never colour alone.

## Type
- **Display:** Bricolage Grotesque (variable, uses the width axis at large sizes). Headings only, tight leading (1.02 to 1.1), slightly negative tracking.
- **Text:** Instrument Sans, 16 to 18px, 1.6 leading.
- **Data:** IBM Plex Mono for dates, fees, references, board rows, tabular numerals.
- Scale (px, mobile to desktop): 14 / 16 / 18 / 22 / 30-40 / 44-76. Sentence case everywhere. No all-caps paragraphs; small mono eyebrows allowed where they encode something true (e.g. "NEXT DATES").

## Layout
- 12-column grid, max width 1200px, 16px gutters on 360px screens, 32px from `md`.
- Hero: left column headline + date finder; right column the departure board. On mobile the finder comes first, the board follows as stacked rows.
- Sections are separated by hairline rules and generous whitespace instead of boxed cards. Lists use rows, not tiles.
- "How booking works" is a true sequence (3 steps), so it is numbered. Nothing else is.
- Schedule: sticky filter bar; table at `md+`, stacked rows below. Fixed row heights per breakpoint and reserved skeletons so there is no layout shift.

## Components
- **Button:** crimson solid (primary), ink outline (secondary), WhatsApp action uses crimson too (we do not use WhatsApp green; the brand stays ours). 48px min height on touch.
- **Seat chip:** `● Available`, `▲ Few left` (marigold), `■ Full`, `– Closed`; mono, small caps-free.
- **Board row:** date (mono, large) / city + venue / test + format / session / fee / closes / status / action.
- **Forms:** labels above inputs, 48px inputs, errors in text under the field with `aria-describedby`, summary on submit.
- **Focus:** 3px marigold-on-ink double ring, always visible; skip link.

## Motion
One orchestrated moment: the hero board rows flip in with a short stagger on load (transform/opacity only, 350ms). Hover/press states on buttons and rows. Everything respects `prefers-reduced-motion`.

## Tone
Warm, direct, plain English. "Namaste" once in the hero. Talk to the student ("your date"), name actions consistently: **Book via WhatsApp**, **Send an inquiry**, **My bookings**. Errors say what happened and what to do. Empty states are invitations. Never imply affiliation with the British Council or IDP; the disclaimer appears in the footer and on booking pages.

## Accessibility and performance
WCAG AA, keyboard-first, visible focus, 360px minimum, server components for SEO pages, fonts via `next/font` with `display: swap`, no client JS on informational pages beyond the header menu, no layout shift (reserved sizes), images via `next/image`.
