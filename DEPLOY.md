# Deploying TravelClick (friends & family launch)

The app is two pieces:

| Piece | What it does | Hosting |
|---|---|---|
| `client/` (Next.js) | The whole product UI + all AI routes | Vercel (free tier is fine) |
| Root (ASP.NET Core) | TikTok/Instagram place extraction (yt-dlp + ffmpeg + Claude vision) | **Optional** — Docker host (Fly.io / Railway) |

The site works fully without the backend deployed: demo board, decide, itinerary,
brief, packing, budget, and YouTube pins all run in the Next.js app. Only
TikTok/IG extraction needs the backend — without it users see a friendly error.
Recommendation: launch frontend-only first, add the backend once friends ask for it.

---

## 0. Before anything: cap your spend

1. **Anthropic Console → Billing → set a monthly spend limit** (e.g. $20) and a
   notification threshold. The AI routes are rate-limited per IP (see below),
   but a hard cap is the real safety net.
2. The per-IP hourly limits live in `client/src/lib/api-guard.ts`:
   itinerary 6, compare 8, brief/packing/stays 10, extract 12.

## 1. Deploy the frontend (Vercel)

1. Push this repo to GitHub (private is fine).
2. Vercel → New Project → import the repo → **set Root Directory to `client`**.
3. Environment variables:

   | Name | Value |
   |---|---|
   | `ANTHROPIC_API_KEY` | your key |
   | `NEXT_PUBLIC_SUPABASE_URL` | from Supabase project settings |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | from Supabase project settings |
   | `NEXT_PUBLIC_APP_URL` | your prod URL, e.g. `https://travelclick.vercel.app` (set after first deploy, then redeploy — used for OG images and internal API calls) |
   | `BACKEND_URL` | only when the backend is deployed |
   | `BACKEND_API_KEY` | only when the backend is deployed — any long random string, must match the backend |

4. Deploy. First visit: landing → "Try the live demo" should give a full Tokyo
   board with images in under 3 s.

## 2. Configure Supabase for the real domain

1. **Authentication → URL Configuration → Site URL** = your Vercel URL
   (otherwise OTP emails reference localhost).
2. ⚠️ **Email rate limit:** Supabase's built-in email sender allows only ~2–4
   auth emails per hour. If five friends sign up at once, emails silently stop.
   Either:
   - Authentication → Emails → set up **custom SMTP** (Resend/Postmark free tiers work), or
   - tell friends to use the **demo** first and sign up later if they like it.
3. Confirm the `trips`, `cards`, `profiles` tables + RLS policies exist
   (`client/supabase-setup.sql` has the schema).

## 3. (Optional) Deploy the extraction backend

A `Dockerfile` is included (ships yt-dlp + ffmpeg, listens on :8080).

Fly.io example:

```sh
fly launch --no-deploy          # detects the Dockerfile
fly volumes create data --size 1
fly secrets set ANTHROPIC_API_KEY=sk-... BACKEND_API_KEY=<same-random-string-as-vercel>
fly deploy
```

Then set `BACKEND_URL=https://<app>.fly.dev` and `BACKEND_API_KEY` on Vercel and redeploy.

Notes:
- `BACKEND_API_KEY` activates a shared-secret gate on every `/api` route of the
  backend — **always set it on a public deployment**, or anyone can use your
  extraction pipeline and read/delete the places table.
- Extraction is restricted to TikTok / Instagram / YouTube / X / Facebook URLs.
- TikTok and Instagram sometimes block datacenter IPs. If extraction starts
  failing in prod, see the cookies/user-agent notes in
  `Services/VideoProcessing/YtDlpService.cs`.
- SQLite lives on the mounted volume via `DB_PATH=/data/places.db` (set in the Dockerfile).

## 4. Launch-day smoke test (5 minutes)

On the production URL, ideally from your phone on mobile data:

1. Landing → **Try the live demo** → board renders with 8 postcards + images.
2. Demo board → Brief, Packing, Budget tabs each work.
3. Demo itinerary opens (pre-generated) and **Print** produces a clean page.
4. `/decide` → "Try the example" → compare runs → verdict renders → Start planning.
5. Sign up with a real email → OTP arrives → create a trip → paste a YouTube
   link → pin appears.
6. Open the same account on a second device → the board shows the same pins.

## What's already hardened

- Per-IP hourly rate limits + input size caps on all AI routes.
- Image proxy locked to Wikimedia hosts.
- Extraction locked to supported social domains; optional API-key gate on the backend.
- EF sensitive-data logging disabled outside Development.
- Secrets only in `.env.local` / Vercel env vars (gitignored).
