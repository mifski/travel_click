# TravelClick v3.0: The Decision Layer (PRD)

**Status:** Draft · 2026-10-27
**Builds on:** v2.1 (board, itinerary, budget), v2.2 Reality Layer P0 (stamp, pace ribbon, ticket stubs)
**One-line pitch:** Help travellers decide what they want before the plan is built, see the whole trip at once after it is built, and find more places that fill real gaps.

---

## 1. Problem Statement

Travellers save places to the board freely, but **the board has no idea what "decided" means**. Every card is either on or off, so a growing board turns into a pile where nothing stands out. The itinerary then treats every saved place as a must (`SAVED PLACES (must all be included)`), which crams days and fights the pace rules from v2.2.

The link from board to itinerary is **one-way and drops most of what's on the board**. Only `"name, city, country"` reaches the planner: card descriptions, tags and sticky notes are dropped, and no itinerary block records which card it came from. So the board can't show what got used and what got dropped.

After generating, **you can't see the state of the whole trip** without flipping through the binder day by day. Reality Check results, booking deadlines and how full each day is only show inside each day's page.

The planner also can't help you find more places. Recommendations need to come from what you've already said you love and avoid, and they must not add to the pile.

**Cost of not solving it:** boards stall before the itinerary step, generated plans feel generic or overloaded, and the Reality Check reads as a report card nobody acts on.

## 2. Goals

1. **Decided before generating:** most trips that reach the itinerary have their musts marked.
2. **Plans that fit:** generated days stay within the chosen pace because the input does.
3. **Board and itinerary are connected:** every must is either placed on a day or flagged as unplaced.
4. **The whole trip at a glance:** the health and rhythm of all days are readable without changing page.
5. **More places, fewer piles:** recommendations fill gaps and are approved by the user, never auto-pinned.

## 3. Non-Goals

| Not doing | Why |
|---|---|
| Maps, coordinates, area clustering | Expensive and depends on place data. Without priority marking it only shows an overloaded plan more clearly. Revisit after v3.0. |
| Drag-and-drop between days / week spread | Only useful once moving stops is wanted. Parked as P2 (supersedes the v2.2 Swap tray). |
| Changing the Fix loop | User feedback: fixing is fine. The pain is the overview. |
| Real video search (YouTube Data API) | AI-generated video links would be invented. v3.0 uses search links, and the API is P2 if links get clicked. |
| TikTok / Instagram search | No open search API. |
| Auto-pinning recommendations | Would recreate the messy-board problem. |

## 4. User Stories

**Planner on the board (before generating)**
- As a traveller with a crowded board, I want to mark each place as must go, if it fits or skip so that I can see what I have actually decided.
- As a traveller, I want to know when I have more musts than my trip can hold so that I cut down before generating, not after.
- As a traveller, I want my notes on a card ("only if it's sunny", "Mum's pick") to shape the plan so that I don't repeat myself in the refine box.
- As a traveller who never stamps anything, I want the plan to behave as it does today so that nothing breaks for me.

**Planner on the itinerary (after generating)**
- As a traveller, I want to see every day's status, anchor and fullness in one strip so that I know how the trip looks without flipping pages.
- As a traveller, I want my board cards to show which day they landed on so that I can spot a must that was dropped.
- As a traveller, I want a thin or empty day to offer "find something" so that recommendations go where they're needed.

**Looking for more places**
- As a traveller, I want suggestions based on what I loved and avoided on this board so that they feel like mine, not a top-10 list.
- As a traveller, I want each suggestion to link to videos about it so that I can see it before deciding.
- As a traveller, I want to accept or dismiss a suggestion in one tap so that my board only grows with places I chose.

**Edge cases**
- A board with zero cards: the meter and suggestions still work from the trip setup alone.
- All cards are skipped: generation works and fills days like an empty board does today.
- The model returns a `cardId` that isn't on the board: it's ignored, not shown as a broken link.
- The demo trip shows stamps, day badges and the strip without needing an API call.

## 5. Requirements

### P0: Must-have

**R1. Card stamps (must go / if it fits / skip)**
Board stamps for the existing plan choices in `pinPriorities` (`must` / `maybe` / `skip`, shared with the "Before we plan" sheet). One tap cycles through them, shown as rubber-stamp marks in the scrapbook style (MUST GO in red ink, IF IT FITS in pencil, SKIP faded).
- [ ] Stamp state persists locally and syncs with the trip's other data (the `priorities` sync kind).
- [ ] SKIP cards are dimmed and excluded from itinerary generation, but stay on the board.
- [ ] Category filter chips still work and combine with a "Musts only" filter.
- [ ] Stamps are reachable by keyboard and have accessible labels.

**R2. Capacity meter**
Shows *musts vs stops the trip can hold* = days × the pace's top stop count (slow 3, balanced 4, full 6; arrival and departure days count half).
- [ ] Visible on the board next to the Generate button.
- [ ] Turns coral when musts exceed capacity, with the text "N musts for about M stops".
- [ ] Generating while over capacity is allowed, with a one-line warning, never blocked.
- [ ] Updates live when pace or dates change.

**R3. The board's full context reaches the planner**
`/api/itinerary` receives each card's id, name, priority, a clamped description and tags, plus the trip's sticky-note text.
- [ ] Must-go pins are all included; if-it-fits pins fill remaining slots; skipped pins are never sent.
- [ ] Pins without a choice are planned as "if it fits", the same as in the plan sheet.
- [ ] Input is clamped (≤ 60 cards, description ≤ 200 chars, notes ≤ 600 chars total), the same as the existing `clamp` guards.

**R4. Itinerary blocks link to cards**
Cards are sent as `[c<id>] Name`, and blocks return an optional `cardId`.
- [ ] Unknown `cardId`s are dropped on the server.
- [ ] Each placed card shows a "Day N" tag on the board.
- [ ] Musts that aren't placed are listed as "Not in the plan" above the board, with a "Refine to include" action.
- [ ] Demo itinerary data carries `cardId`s.

**R5. Trip strip**
A horizontal row of luggage tags at the top of the itinerary, replacing the day tabs. Each tag: date, anchor, fullness bar (stops vs pace), stamp-coloured edge, fix-now count, nearest booking deadline.
- [ ] Clicking a tag opens that day; the active day is highlighted.
- [ ] Built only from existing data (`dayReality`, `sortStubs`): no new API call.
- [ ] Scrolls horizontally on phones and doesn't scroll the page sideways.
- [ ] Shows "Checking…" per tag while the Reality Check is running.

### P1: Nice-to-have

**R6. Suggestions tray**
A tray next to the board with up to 6 ghost cards. They're generated from a preference profile (musts = loves, skips = avoids, plus the trip setup) and targeted at gaps (thin days, missing evenings or food near a must). Reuses `lib/place-search.ts` (Haiku).
- [ ] Stamping MUST GO or IF IT FITS pins the card to the board; SKIP dismisses it and adds it to the avoid list.
- [ ] Every suggestion has "Watch on YouTube" and "Watch on TikTok" search links (built from a query, never AI-written URLs).
- [ ] Never suggests a place already on the board or dismissed on this trip.
- [ ] Rate limited like the other AI routes.

**R7. Gap prompts on the trip strip**
A day under half its capacity shows "Find something" on its tag, which opens R6 for that day.

**R8. Findings in the margin**
Reality Check findings name the stop they refer to (by block time) and show next to it, not under the pace ribbon. Findings that apply to the whole day stay where they are.

### P2: Future (design so these stay possible)

- **YouTube Data API results** with "Pin from this video" running the existing extract pipeline. Only if R6 search links get clicked.
- **Week-at-a-glance spread** (days × morning/afternoon/evening) with dragging stops between days. Supersedes the v2.2 Swap tray. R4's `cardId` is what makes moving cards safe.
- **Coordinates and area grouping** on cards, and a map view.
- **Day-scoped fix** (regenerate one day only).
- **Cross-trip taste profile** (loves and avoids carried to new trips).

## 6. Success Metrics

There's no analytics yet (see the launch-readiness notes), so **adding event tracking is a dependency**. Without it, these targets can't be measured.

**Leading (2–4 weeks after launch)**
| Metric | Success | Stretch |
|---|---|---|
| Trips with ≥ 1 stamp before first generate | 50% | 70% |
| Generations where musts ≤ capacity | 70% | 85% |
| Itinerary sessions with a trip-strip click | 60% | 80% |
| Suggestion accept rate (must + maybe / shown) | 20% | 35% |
| Search-link clicks per suggestion shown | 10% | 20% (moves the YouTube API into the build) |

**Lagging (1–3 months)**
- Refines per itinerary go **down** by 30% (plans fit on the first try).
- Share of boards that reach the itinerary step goes **up**.
- Returning to a trip within 7 days goes up.

## 7. Open Questions

| Question | Who | Blocking? | Default if unanswered |
|---|---|---|---|
| Unstamped card = must or maybe? | Product | Resolved | "If it fits", matching the plan sheet in PR #1. |
| Suggestions: watch-first (video is the main part) or place-first (card is the main part)? | Product / design | Yes (R6) | Place-first with search links. |
| Do arrival and departure days count half toward capacity, or use flight times? | Engineering | No | Half; use flight times later if booked flights are present. |
| Should the avoid list persist beyond one trip? | Product / privacy | No | This trip only (cross-trip is P2). |
| Fate of v2.2 P1/P2 (Pin passport, niche dial, Home base, Send to Sheets) | Product | No | Home base stays in v2.2 backlog; Swap tray superseded by P2 spread. |
| Which analytics tool? | Engineering | Yes for metrics | Pick before 3a ships. |

## 8. Timeline and Phasing

Each phase ships on its own and builds on the one before.

1. **3a: Decide (R1–R4).** Stamps, meter, full context to the planner, card links. Also needs updated demo data.
2. **3b: See (R5).** Trip strip. No API work, only UI on top of existing data.
3. **3c: Discover (R6–R8).** Suggestions tray, gap prompts, margin notes. Depends on 3a (stamps are the preference signal) and 3b (gaps come from the strip).

**Dependencies:** 3a builds on `feat/v2.2-reality-layer-ce1cbg` (PR #1: plan sheet, pin priorities, whole-trip sync), which should merge to `main` first. No new database column is needed.

---

## 9. Backlog from real-trip testing (TC-1 to TC-11) and design critique

Source: the TC-1 to TC-11 tickets from planning the Osaka & Kyoto trip (Apr 2027), plus a design critique of that board and binder on 2026-10-27.

### 9.1 What's already covered

| Ticket | Already done | Still open |
|---|---|---|
| TC-1 Validate before showing | Flight times are fixed in code (`fitAroundFlights`); a rest block and an anchor are always added; fixing one day only rewrites that day (PR #1) | Opening hours and closed days by actual date; last trains; no "Fix now" for problems the generator caused itself |
| TC-5 Preferences | Pace, start time, Classics↔Gems slider, must-go / if it fits / skip per pin (PR #1 + 3a) | Skip list by category, also applied to backups; cap on anchors per day; stay preferences; "why it didn't fit" for a must-go |
| TC-7 Hotel per night | Stays per night with check-in and check-out; each day starts and ends at that night's stay (PR #1) | Map of each day; flag travel times that are unrealistic for the pace |
| TC-9 Co-planning | Shared boards, live edits (PR #1) | A choice per traveller (want / fine / skip), "wanted by both", who changed what |
| TC-11 Day view | Correct day shown; full titles (TC-11 fix) | Short timeline with details collapsed; each tip once; offline |

### 9.2 Design critique findings that become requirements

**R9. The plan comes first in the binder (P0, phase 3b).** On desktop, the day's first stop sits at 1,091 px (viewport 800); on a phone it's at 1,602 px. Reality Check findings, KEY FACTS and the pace ribbon all render above the plan.
- [ ] The day's timeline starts within the first screen on desktop and right after the trip strip on a phone.
- [ ] Reality Check findings collapse to one line under the stamp ("2 to fix, 1 to look at"), expanding on tap. KEY FACTS are collapsed by default.

**R10. Compact day navigation (P0, phase 3b; replaces the full-title tabs).** Showing full titles made the 7 tabs 269 px tall on a phone. The R5 trip strip replaces the tabs: each luggage tag shows "Day 3 · Thu 15", plus the anchor in one line truncated with an ellipsis, with the full theme in the tag's tooltip and as the day's heading.

**R11. Day photos come from that day (P0, quick fix).** Day 1 (arrival) shows a Kobe Herb Garden print, because `pickPrints` falls back to any card with a photo. Prints come from the day's `cardId` links first, then name matches, and the column stays empty instead of showing another day's place.

**R12. No stale "Saved but not planned" chips (P0, quick fix).** The binder offered 20 unused pins for an 18-pin board, including pins deleted since the plan was made. Chips only show pins that are still on the board and still unplaced.

**R13. Theme parks aren't nature (P0, quick fix, part of TC-8).** `park` → nature in `lib/categories.ts` also catches "theme park" (USJ is filed under Nature). Match "theme park" / "amusement" to a Character/Themed category before the generic `park` rule.

**R14. Readable small text and touch targets (P1).** 26 labels are under 11 px (9 to 10.5 px captions, ticket labels, the boarding pass); stamp buttons are 25 px tall and the sticky note's delete button is 7×14 px.
- [ ] Body and caption text are at least 11 px; uppercase labels at least 10 px with letter-spacing.
- [ ] Every tap target is at least 32 px (44 px on phones), including stamps and the note delete button.

**R15. Booking list reflects reality (P1, TC-4 without external data).** In the Osaka & Kyoto plan the list has 12 tickets: Saoto Kawaken appears three times, the already-booked SQ623 flight shows as "To book", and Kiyomizu-dera "timed entry" can't actually be booked.
- [ ] Booked flights and stays come from Budget and Stays and show as booked, with a confirmation number field.
- [ ] Duplicate venues merge into one ticket listing every day it applies to.
- [ ] Every ticket shows how it's booked (official site / phone / walk-in); walk-in-only items are dropped.

### 9.3 Revised phasing

| Phase | Scope | Needs |
|---|---|---|
| **3a-fix: Quick fixes** | R11, R12, R13 | nothing; ships with PR #1 + 3a |
| **3b: See** | R5 trip strip, R9 plan first, R10 compact navigation, the rest of TC-11 (collapsed timeline, each tip once) | nothing |
| **3c: Decide better** | TC-5 skip list and anchor limit, TC-6 locks, TC-8 categories and pin editing, R14 | nothing |
| **3d: Bookings** | R15 / TC-4 | nothing |
| **3e: Trust** | TC-1 opening hours and closed days, TC-2 sourced facts with retrieval date, TC-3 transit | **Decision: which paid data sources** (places, transit) |
| **3f: Discover** | R6 to R8 suggestions tray | 3b (gaps come from the strip) |
| Later | TC-7 map, TC-9 per-traveller choices, TC-10 Google Sheets, TC-11 offline | maps provider, accounts, Google OAuth |

**Blocking decision for 3e:** without real place and transit data, TC-1 can only re-check the AI's guesses, and TC-2 can show "not confirmed" but never a source. Until then, the rule from TC-2 applies now: **never show a placeholder value** ("075-XXX-XXXX"); show "not confirmed" instead.
