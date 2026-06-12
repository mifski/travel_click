# TravelClick v2 — Product Requirements Document

**Date:** 2026-06-11 · **Status:** In development · **Owner:** TravelClick team

---

## 1. Vision

TravelClick turns the chaos of travel inspiration — TikToks, YouTube videos, Instagram reels, articles — into a beautiful, tactile trip plan. Users pin places onto a **corkboard** the way they'd plan on a real wall, then AI assembles everything into a day-by-day **travel binder** itinerary, packing list, and destination brief.

**One-line pitch:** *"From doomscrolling to departure gate — your saved videos become a real trip plan in 60 seconds."*

### Why it wins
- **Emotional design.** Nobody else makes trip planning feel like a scrapbook. Corkboard + postcards + binder is a memorable, demoable identity.
- **Real AI utility.** Place extraction from social video (yt-dlp + ffmpeg + Claude vision pipeline) is genuinely hard and genuinely useful — not a thin GPT wrapper.
- **Full loop.** Inspiration capture → spatial curation → itinerary → packing → departure. Competitors do one slice.

---

## 2. Current state audit (v1)

### What exists and works
| Area | State |
|---|---|
| Trip wizard (destination → dates → group → goals) | ✅ Working, 4-step modal |
| Corkboard with draggable postcards | ✅ Working, framer-motion drag |
| Link extraction (YouTube oEmbed; TikTok/IG via C# backend) | ✅ Working |
| AI itinerary (claude-sonnet-4-6, binder UI) | ✅ Working, ~30–45 s |
| AI accommodation picks | ✅ Working |
| Supabase auth + profiles + avatars | ✅ Working |
| Wikipedia place-image enrichment | ✅ Working |

### Defects found in audit
1. **D1 — Dark-theme remnants:** `AgeRangeSelector`, `ObjectiveSelector`, `BudgetSelector` render white-on-white inside the light wizard modal (`bg-white/5`, `text-white/70` on `#fffef9`). `AccommodationCards` and `/profile` are fully dark-themed on a light app. Looks broken.
2. **D2 — Pin counts always 0:** boards page reads card counts from Supabase, but cards are only ever written to localStorage (Zustand). `saveCard()` exists but is never called.
3. **D3 — No cross-device trips:** `/board/[tripId]` reads only the local Zustand store; trips fetched from Supabase on `/boards` are never hydrated into it, so opening a trip on a second device silently redirects away.
4. **D4 — Native `confirm()`/no toasts:** destructive delete uses browser confirm; success/error feedback is inconsistent.
5. **D5 — No way to experience the product without signing up** — fatal for demos to judges/investors.

---

## 3. v2 Scope

### F1 — Demo Mode (instant gratification) ⭐ P0
- "**Try the live demo**" button on landing — no signup.
- Seeds a fully-populated Tokyo trip (8 pinned places with images, sticky note, generated-style itinerary) into the local store, navigates to `/board/demo`.
- Amber "Demo mode" ribbon with *Sign up to save your boards* CTA.
- Board, itinerary, packing, and brief pages all work unauthenticated.
- **Acceptance:** landing → full corkboard in < 3 seconds, zero auth friction.

### F2 — Travel Brief (destination essentials) ⭐ P0
- New `POST /api/brief`: Claude generates currency & cash culture, language + 6 key phrases, plug type & voltage, tipping norms, getting around, etiquette do/don'ts, emergency numbers, best neighbourhoods.
- Passport-page UI: stamp-styled section cards on the board page. Cached per trip in store.
- **Acceptance:** generates in < 15 s, renders styled sections, persists across reloads.

### F3 — Smart Packing List ⭐ P0
- New `POST /api/packing`: list tailored to destination climate for the trip dates, group ages, objectives, and trip length, grouped into categories (documents, clothing, tech, toiletries, extras).
- Interactive checklist with progress ring; checked state persists in store.
- **Acceptance:** category groups render, check-off persists across reloads, progress updates live.

### F4 — Itinerary upgrades ⭐ P0
- **Open in Google Maps** link on every activity block (zero-dependency, huge utility).
- **Per-day estimated cost** added to generation schema + displayed in the day header; trip total on the overview.
- **Refine & regenerate:** free-text instructions ("more street food, no museums") passed into the prompt.
- **Print / save as PDF:** print stylesheet that flattens the binder into a clean document (`window.print()`).
- **Acceptance:** all four work on a freshly generated itinerary and on cached ones (cost may be absent on stale cache — degrade gracefully).

### F5 — Corkboard upgrades · P1
- **Sticky notes:** add/edit/drag/delete classic yellow sticky notes (washi-tape look) alongside postcards. Persisted per trip.
- **Category filter chips:** one chip per category present on the board; selecting dims non-matching cards.
- **Acceptance:** notes survive reload; filters never lose card positions.

### F6 — Boards page polish · P1
- **Status stamps:** "12 DAYS TO GO" / "IN PROGRESS" / "COMPLETED" rubber-stamp on each trip card.
- Styled delete-confirmation modal (replaces `confirm()`).
- **Fix D2/D3:** sync cards to Supabase on add/remove (fire-and-forget when signed in); hydrate db trips into the local store on `/boards` load.
- **Acceptance:** pin counts correct, trips openable after store wipe, no native dialogs.

### F7 — Landing page, investor-ready · P1
- Hero with live animated corkboard mock, demo CTA (primary) + signup (secondary).
- "How it works" 3-step strip (Paste a link → Pin to board → Get your itinerary).
- Feature grid with the v2 features. Footer.
- **Acceptance:** scroll-animated, responsive at 380 px and 1280 px, < 1 s first paint on dev.

### F8 — Design-system & a11y pass · P1
- Kill remaining dark-theme remnants (D1). One palette: cream/ink/coral/sage (already in `globals.css`).
- Toast notification system (success/error) replacing ad-hoc banners.
- Focus-visible rings, aria-labels on icon buttons, `prefers-reduced-motion` respect, keyboard-dismissable modals.

### Out of scope (v3 candidates)
Real map view (Leaflet + geocoding), collaborative boards (Supabase realtime), flight/hotel price APIs, weather forecast integration, mobile apps.

---

## 3b. v2.1 Scope — The Undecided Traveler

### User story (verbatim from research)
> *"Hmm, I want to travel — probably somewhere in East Asia with my mom. She only cares about prices and weather (she wants it nice and cold, so Nov/Dec — though we were considering Oct/Nov). We wanted Guangzhou but flights are the same $700 as Fukuoka and Shanghai, which isn't very worth it — which should we go to? I need to find flights, decide where to go, plan places to visit and accommodations."*

**Insight:** v2 starts at "Where are you going?" — this user is one step earlier in the funnel. She has candidates, constraints (price + temperature), a co-decider (mom), and no tooling. The decision phase is where trips are actually won or abandoned.

### F9 — Destination Decider ⭐ P0
- New `/decide` page, no auth required, linked from landing + boards.
- Input: 2–4 candidate destinations, 1–3 candidate months, temperature preference (cold/mild/warm/any), priority chips (low prices, food, culture, nature, shopping, nightlife), free-text traveller note ("with my mom, she cares about…"), pax count.
- `POST /api/compare` (claude-sonnet-4-6): per candidate — month-by-month temp range/rain/crowds (with holiday traps like China Golden Week or Japan koyo season), daily on-the-ground cost, hotel $/night, flight note, **visa/entry note** (often the silent decider), vibe, 3 highlights, watch-outs, and a 0–100 **fit score weighted by the stated priorities**.
- **Verdict card**: winner + best month + plain-English reasoning (screenshot-able to send to mom) + runner-up.
- **One-click conversion**: "Start planning {winner}" creates a board pre-filled with destination and suggested dates in the best month.
- Example prefill button seeded with the research scenario (Guangzhou vs Fukuoka vs Shanghai).
- Last comparison persists in the store across reloads.
- **Acceptance:** 3-city × 2-month compare completes < 30 s; verdict names one winner and one month; conversion lands on a working board.

### F10 — Flight handoff · P0
- No fare API in MVP (cost/licensing trap). Instead: **Google Flights deep links** prefilled per candidate on the compare results and per trip on the board's Budget tab.
- AI flight note tells the user whether a quoted fare (e.g. "$700") is typical for the route/season.

### F11 — Budget guardrail · P0
- New **Budget** tool tab on the board: enter total trip budget + flight price per person.
- Projected total = flights × pax + stay (nights × rooms × price-tier rate) + daily spend (parsed from the AI itinerary's estimate when available, tier default otherwise) × days × pax.
- Live bar: projected vs budget, green under / red over, per-person figure. Mom's #1 question, permanently on-screen.
- **Acceptance:** updates live as inputs change; uses AI itinerary costs when an itinerary exists; persists per trip.

### F12 — v3 candidates (decision layer)
Live climate normals (Open-Meteo), read-only share-to-veto links for co-deciders, fare tracking/alerts, companion profiles that shape pacing.

### Test plan additions
7. `/decide`: example prefill → live compare (3 cities) → verdict renders → "Start planning" → board exists with right destination/dates.
8. Budget tab: inputs persist, projection math sane, flights link opens prefilled.

---

## 4. Design principles

1. **Skeuomorphism with restraint** (cork, paper, pins, stamps) — texture sells the metaphor, but type stays modern (Playfair Display for display, Geist for UI).
2. **Progressive disclosure** — board first; tools (extract, brief, packing, stays) fold away. Never two competing CTAs at once.
3. **Feedback within 100 ms** — every action gets motion or a toast; AI waits get progress narration, never spinners alone (Doherty threshold).
4. **Aesthetic–usability with floors** — contrast ≥ 4.5:1 for body text, hit targets ≥ 40 px, visible focus.
5. **Fitts-friendly primary actions** — big, edge-anchored, thumb-reachable on mobile.
6. **The demo IS the product** — every feature must be showable in under 10 seconds from a cold start.

---

## 5. Technical notes

- **Stack unchanged:** Next.js 16 (App Router, client components + route handlers), Tailwind v4, framer-motion, Zustand persist, Supabase, ASP.NET Core 8 extraction backend on :5107.
- New routes follow the existing `route.ts` + Anthropic SDK pattern (`claude-sonnet-4-6`, JSON-only responses, regex fallback parse).
- Store gains `notes`, `packingLists`, `briefs` slices + `hydrateTrips`; all persisted under the existing `travelclick-store` key (additive, no migration needed).
- Demo data is static TS (no API calls) so the demo works offline and instantly.

## 6. Test plan

1. `npm run build` — zero type/lint errors.
2. Backend smoke: `dotnet run` starts, `/api/extract` reachable.
3. Browser (preview) E2E: landing → demo board → drag card → expand card → sticky note → filter → brief generate → packing generate + check-off → itinerary generate → maps link → print view → boards page stamps → wizard create → profile theme.
4. Real AI calls exercised once each (extract YouTube, itinerary, brief, packing, accommodations).
5. Responsive: 380 px, 768 px, 1280 px screenshots of board, itinerary, landing.
6. Reload-persistence checks on notes, packing state, brief, itinerary cache.
