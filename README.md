# MMO Match

MMO Match is a mobile-first matchmaking experience for MMO players. It pairs adventurers using shared preferences, swipe-based discovery, and lightweight chat on top of Next.js 15, PostgreSQL, and Prisma.

## Features
- Passwordless login flow that emails (or logs) six-digit OTP codes and magic links.
- Guided profile builder with avatar uploads, MMO preference enums, social links, timezone hints, and locale-aware language defaults.
- Swipe deck that filters candidates by shared MMO and language, with instant toast on mutual matches.
- Matches list and polling chat room so new messages appear without a page refresh.
- Dark/light theme support with system default preference saved to user profile.
- Games directory with individual game pages featuring screenshots, descriptions, official website links, star ratings, community comments, and player listings.
- Settings page with sign-out and full account deletion that cascades through matches, swipes, and messages.
- Notification preferences for new matches, messages, and announcements.
- Middleware-backed session guard that redirects unauthenticated users to the landing page.
- Invite-only guilds that verified players can create with prepaid creation codes, share as one-hour QR invites, and manage via unique links.
- Guild chat for intra-squad coordination, plus analytics that surface player summaries, guardian activity, badge hunts, and event attendance trends.
- Shadowban moderation tools with automated LLM review of recent messages.
- Kid accounts with guardian approvals, read-only chat oversight, and parent-managed matches/guild access.
- Location-based badge hunts (GPS + QR codes) that reward players for visiting real-world hotspots.
- In-app feedback portal so players can report bugs or suggest improvements directly from Settings.
- Self-service data export that bundles your direct and guild messages.
- Guild events with photos, online/offline locations, scheduling, and multi-channel alerts (email/SMS/Discord/Telegram).
- Auto-generated OG preview cards for players, guilds, and events.
- Rich sample seed that provisions guardian/kid accounts, a starter guild, badges/events, and 100 randomized pilots (complete with DiceBear avatars) for instant matchmaking demos.

## Tech Stack
- Next.js 15 App Router • React 19 Server/Client Components
- TypeScript with strict settings
- Prisma ORM + PostgreSQL
- Tailwind CSS + Radix UI primitives
- Framer Motion, react-hot-toast, sonner, lucide-react
- Playwright for end-to-end coverage

## Prerequisites
- Node.js 18 LTS or 20 LTS
- pnpm 8+ (recommended; swap commands for npm/yarn if preferred)
- PostgreSQL database (local Docker or hosted)
- SMTP credentials for transactional mail (development can fall back to console logging)

## Quick Start
1. **Install dependencies**
   ```bash
   pnpm install
   ```
   > The repo tracks `pnpm-lock.yaml`. Using pnpm keeps dependency resolution consistent.

2. **Create environment variables** (`.env.local` in the project root):
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/mmo_match"
   APP_URL="http://localhost:3000"
   SMTP_HOST="smtp.yourprovider.com"
   SMTP_PORT="587"
   SMTP_USER="smtp-user"
   SMTP_PASS="smtp-pass"
   SMTP_FROM="MMO Match <no-reply@mmo-match.gg>"
   OTP_EXPIRATION_MINUTES=10        # optional override
   SESSION_TTL_DAYS=30              # optional override
   MODERATION_SECRET="super-secret"      # required for moderation endpoints
   OPENROUTER_API_KEY="sk-or-..."         # required for LLM-based moderation
   MODERATION_MODEL="openrouter/auto"     # optional override
   ```
   - If SMTP is omitted, OTP codes and magic links are printed to the server logs for local testing.
   - Use port `465` for implicit TLS; the mailer auto-selects secure mode.

3. **Set up the database**
   ```bash
   pnpm exec prisma migrate dev --name init
   pnpm exec prisma generate
   ```
   - Run `pnpm exec prisma migrate deploy` in production/CI.
   - `pnpm exec prisma studio` opens a browser UI to inspect tables.

4. **Seed preference tables and demo data (optional)**
   ```bash
   pnpm seed:preferences
   pnpm db:seed
   ```
   - `pnpm seed:preferences` hydrates the `Game`, `TimeSlotOption`, `LanguageOption`, and `PlaystyleOption` lookup tables.
   - `pnpm db:seed` seeds a verified guardian/kid pair, a starter guild with events/badges, and 100 random pilot profiles (names, bios, avatars, preferences) so the swipe deck has immediate candidates.
   - Verify additional profiles directly in the database or via Prisma Studio by toggling the `isVerified` flag on `Profile` rows. Only verified players can create guilds.
   - Generate creation codes with `pnpm generate:guild-codes <amount>` (add `--creator-email=` to attribute a creator). Codes expire after 30 days and must be funded on-chain before use.
   - Guild officers can mint one-hour QR invites from the guild detail page; shareable URLs are embedded in the QR image for standard camera apps.
   - Guardians can create kid accounts via `/api/parent/kids` and manage matches/guilds through the `parent/` API suite.
   - Seed badges via Prisma, then expose them through `/api/badges`; players collect them with `/api/badges/collect` when on-site (GPS) or by scanning badge QR codes.

5. **Start the app**
   ```bash
   pnpm dev
   ```
   Visit `http://localhost:3000`, request a login link, and accept the Terms of Use and Privacy Policy prompt. The dashboard, profile, matches, chat, and settings routes now require a valid session cookie.

## Useful Commands
| Command | Description |
| --- | --- |
| `pnpm dev` | Launch the Next.js development server with hot reload. |
| `pnpm build` | Create an optimized production build. |
| `pnpm start` | Run the production build locally. |
| `pnpm lint` | Execute ESLint against the project. |
| `pnpm test:unit` | Execute the Vitest suite for fast utility tests. |
| `pnpm test:e2e` | Run the Playwright end-to-end suite. Set `PLAYWRIGHT_SKIP_WEB_SERVER=1` if the dev server is already running. |
| `pnpm generate:guild-codes <amount>` | Bulk-generate guild creation codes with 30-day expiry. |
| `pnpm seed:preferences` | Populate lookup tables for games, time slots, languages, and playstyles. |
| `pnpm generate:fakes <profileId> [count]` | Create demo matches for a given profile (default count: 5). |
| `pnpm exec prisma migrate dev --name <label>` | Apply schema changes locally and generate migrations. |
| `pnpm exec prisma migrate deploy` | Apply pending migrations in production/CI. |
| `pnpm exec prisma generate` | Regenerate the Prisma client after schema edits. |
| `pnpm exec prisma studio` | Launch Prisma Studio for inspecting data. |

## Testing
- Install browsers once with `npx playwright install` (pnpm will cache the binary).
- Run `pnpm test:unit` for quick Vitest feedback on utilities (`tests/unit`).
- Ensure `DATABASE_URL` points to an isolated database; tests create and clean up users, OTP tokens, guild memberships, and sessions.
- Playwright auto-starts the dev server (`npm run dev`) unless `PLAYWRIGHT_SKIP_WEB_SERVER=1` is set.
- The sample tests (`tests/e2e/auth-flow.spec.ts`, `tests/e2e/homepage.spec.ts`, `tests/e2e/match-conversation.spec.ts`, `tests/e2e/profile-persistence.spec.ts`, `tests/e2e/account-settings.spec.ts`) cover OTP login, profile persistence across sessions, account sign-out/deletion flows, and a complete mutual-match chat flow.

## Project Layout
```
app/
  page.tsx               Landing page + OTP request
  dashboard/             Swipe deck with matchmaking logic
  matches/               List of mutual matches
  chat/[matchId]/        Polling chat room
  games/                 Games directory with individual game pages
  games/[gameValue]/     Game detail page with ratings, comments, and players
  guilds/                Guild management + chat experience
  profile/               Profile editor (avatar upload, enums)
  settings/              Session + account management
  feedback/              In-app feedback submission form
  api/                   Route handlers (auth, profile, swipes, messages, account, analytics)
    analytics/
      players/           Player summary metrics
      preferences/       Preference distributions for dashboards
    guilds/
      [guildId]/invites/ One-hour QR invite lifecycle
      [guildId]/messages/ Guild chat endpoints
      join/               Join via invite code + nickname override
      route.ts            List/create guilds
    guild-invites/       Public invite lookup for scanners
    guild-codes/         Payment + status endpoints for creation codes
    parent/
      kids/              Manage child profiles (guardian only)
      matches/           Guardian-initiated friendships + queue
      matches/[matchId]/ Match approval/blocking actions
      guilds/[guildId]/  Guardian guild controls
      guilds/[guildId]/events/ Manage guild events + alerts
    badges/              Badge directory + collection (GPS/QR)
    export/              Download a JSON bundle of your chats
    feedback/            Submit user feedback
    games/
      [gameValue]/
        rating/          Submit game ratings
        comments/        Post and fetch game comments
    og/                  Dynamic Open Graph preview cards (player/guild/event)
    moderation/          Shadowban + automated review endpoints
components/              UI primitives, swipe deck, chat room, forms, game ratings/comments
lib/                     Prisma client, auth/session helpers, mailer
middleware.ts            Session guard + redirect rules
prisma/schema.prisma     Database schema and enums
public/uploads/          Local avatar storage (created at runtime)
scripts/                 Maintenance utilities (guild code generator)
tests/e2e/               Playwright scenarios
```

## Core Application Flow
- **Login**: `/api/auth/request-otp` hashes the OTP, stores it with expiry, and emails (or logs) the code plus magic link. `/auth/callback` verifies the code and issues a session cookie stored under `mmo_match_session`.
- **Profiles**: `lib/profile.ts` ensures every authenticated user has a profile row. Preference enums mirror the options rendered in the UI to keep data constrained, and the `isVerified` flag gates guild creation. Profile includes theme preference (light/dark/system) for UI customization.
- **Games**: `/games` displays all supported MMOs in a grid layout. Each game links to `/games/{game-slug}` showing detailed information, community ratings (1-5 stars), user comments, and a list of active players. Game badges throughout the app are clickable links to their respective game pages.
- **Guilds**: `/api/guilds` lets verified players spin up invite-only guilds using paid creation codes, `/api/guilds/[guildId]/invites` mints one-hour QR invites, `/api/guild-codes/pay` records EVM payments (ETH/ERC-20 on any chain), and `/api/guilds/join` handles membership via invite codes with nickname overrides. `/api/guilds/[guildId]/messages` powers real-time guild chat.
- **Moderation**: `/api/moderation/shadowban` toggles shadowbans (requires `MODERATION_SECRET` header) and `/api/moderation/review` runs an OpenRouter LLM scan across a player’s last 10 messages, auto-shadowbanning on abusive or spammy content.
- **Guardian controls**: `/api/parent/kids` manages linked kid accounts, `/api/parent/matches` lets guardians approve, block, or create friendships, `/api/parent/matches/[matchId]` handles approvals/blocks for existing chats, and `/api/parent/guilds/[guildId]` blocks or restores guild access.
- **Badges**: `/api/badges` lists available location-based badges and `/api/badges/collect` lets authenticated players claim them via GPS radius or badge QR codes.
- **Data export**: `/api/export` returns a JSON dump of your profile, direct messages, and guild chats.
- **Guild events**: `/api/guilds/{guildId}/events` manages scheduling with support for online/offline locations, banner images, and `/alerts` subroutes for email/SMS/Discord/Telegram notifications.
- **Open Graph**: `/api/og/player|guild|event` renders gradient preview cards for sharing profiles, guilds, and events across social platforms.
- **Analytics**: `/api/analytics/players` summarises user counts, guardian/kid activity, badge collections, and upcoming event metrics, while preference distributions remain available under `/api/analytics/preferences`.
- **Calendar export**: `/api/guilds/{guildId}/events/{eventId}?format=ics` generates an iCalendar file for easy calendar import.
- **Retention**: One-to-one and guild chats automatically discard messages older than 30 days to keep storage lean.
- **Matchmaking**: The dashboard fetches profiles that match the current user’s game, language, playstyle, and time slot. Swipes record `yes`/`no` decisions and promote to `Match` records when both parties say yes.
- **Chat**: `/api/messages/[matchId]` exposes GET/POST endpoints. The client polls every few seconds for new messages to keep dependencies light.
- **Account management**: `/api/auth/logout` clears the session token. `/api/account` cascades deletion through user-owned records, then removes the session cookie.

## Deployment Notes
- Provision PostgreSQL and set environment variables wherever the app runs (Vercel, Fly.io, etc.).
- Run `pnpm exec prisma migrate deploy` during release to keep the schema in sync.
- `APP_URL` must match the public origin so magic links redirect correctly.
- Chat uses short polling; consider switching to websockets (Pusher, Ably, custom server) as concurrency needs grow.
- Uploaded avatars live on the application server (`public/uploads`). For stateless deployments, back them with object storage (S3, R2) and update the upload handler.

## Policies & Terms
- [Terms of Use](./TERMS_OF_USE.md) – respectful behaviour, guardian responsibilities, and acceptable use guidelines.
- [Privacy Policy](./PRIVACY_POLICY.md) – data minimisation practices, retention windows, export/deletion instructions, and vendor disclosures.

## Troubleshooting
- **“Failed to send OTP” in development**: confirm SMTP variables. Without them the code falls back to logging; check the server console for the OTP and magic link.
- **Session redirects loop**: verify cookies are enabled and `SESSION_TTL_DAYS` has not expired; delete stale rows from the `Session` table if needed.
- **Playwright times out**: ensure the database is reachable and `APP_URL` matches the URL the web server binds to.

Happy matching!
