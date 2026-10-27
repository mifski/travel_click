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
