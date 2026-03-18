# CUEE Parking

Full-stack parking reservation platform built with Next.js App Router, TypeScript, Tailwind CSS, MongoDB, and Mongoose. The system supports user/admin roles, secure cookie-based sessions, reservation conflict checks, realtime-ish parking status refresh, LINE notifications, Discord event hooks, audit logging, and seed data for local development.

## Stack

- Next.js 16 App Router
- TypeScript
- Tailwind CSS v4
- MongoDB + Mongoose
- Custom JWT session with `jose` and `httpOnly` cookie
- Zod validation
- `bcryptjs` password hashing
- LINE Messaging API push integration
- Optional Discord webhook event logging
- React Hook Form + Sonner + Recharts

## Environment setup

Create `.env.local` from `.env.example`.

```env
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/cuee-parking
SESSION_SECRET=change-this-secret-to-at-least-32-characters
LINE_CHANNEL_ACCESS_TOKEN=
LINE_CHANNEL_ID=
LINE_CHANNEL_SECRET=
LINE_OA_ID=
LINE_ADD_FRIEND_URL=
DISCORD_WEBHOOK_URL=
APP_NAME=CUEE Parking
UPCOMING_REMINDER_MINUTES=30
PARKING_FEE_NORMAL_PER_HOUR=20
PARKING_FEE_EV_PER_HOUR=30
PARKING_FEE_DISABLED_PER_HOUR=0
PARKING_FEE_CURRENCY=THB
```

Notes:

- `SESSION_SECRET` must be at least 32 characters.
- `LINE_CHANNEL_ACCESS_TOKEN` is used for push messages.
- `LINE_CHANNEL_ID` and `LINE_CHANNEL_SECRET` are reserved for webhook/login integration.
- `LINE_OA_ID` is used to open the LINE OA chat with a prefilled connect message.
- `LINE_ADD_FRIEND_URL` is an optional add-friend link for the LINE OA/bot.
- `DISCORD_WEBHOOK_URL` is optional. If missing, Discord events are skipped gracefully.
- `UPCOMING_REMINDER_MINUTES` controls how many minutes before the reservation start the system refers to as the upcoming reminder window.
- Parking fees are configurable per hour through the `PARKING_FEE_*` variables.

## Install and run

```bash
npm install
npm run dev
```

App URL:

- `http://localhost:3000`

## Seed database

Make sure MongoDB is running locally, then run:

```bash
npm run seed
```

Seeded accounts:

- Admin: `admin@cuee.local` / `Admin12345!`
- User: `user@cuee.local` / `User12345!`

Seed contents:

- 1 admin user
- 1 demo user
- 4 parking spaces: `A01`, `A02`, `A03`, and `A04`
- 1 demo reservation

## Main routes

User-facing:

- `/`
- `/login`
- `/register`
- `/dashboard`
- `/parking`
- `/reservations`
- `/reservations/new?parkingSpaceId=<id>`
- `/profile`

Admin:

- `/admin`
- `/admin/users`
- `/admin/parking-spaces`
- `/admin/reservations`

API:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/parking-spaces`
- `GET /api/parking-spaces/:id`
- `POST /api/admin/parking-spaces`
- `PATCH /api/admin/parking-spaces/:id`
- `DELETE /api/admin/parking-spaces/:id`
- `GET /api/reservations/me`
- `POST /api/reservations`
- `PATCH /api/reservations/:id/cancel`
- `GET /api/admin/reservations`
- `PATCH /api/admin/reservations/:id`
- `GET /api/admin/users`
- `PATCH /api/admin/users/:id`
- `GET /api/admin/stats`
- `GET /api/admin/reports/reservations`
- `POST /api/notifications/line/test`
- `POST /api/webhooks/line`
- `POST /api/jobs/reconcile-reservations`

## Architecture

```text
src/
  app/
  components/
  lib/
    auth/
    db/
    security/
    services/
    validators/
  models/
  types/
middleware.ts
scripts/seed.ts
```

Key pieces:

- `src/lib/env.ts`: validates required environment variables at startup.
- `src/lib/auth/session.ts`: secure JWT cookie session management.
- `src/lib/security/*`: CSRF, rate limit, request metadata, and sanitization helpers.
- `src/lib/services/reservations.ts`: reservation business rules, conflict checks, notifications, audit logging.
- `src/models/*`: Mongoose models with indexes.
- `middleware.ts`: page route protection based on authentication and role.

## Security measures implemented

- `Zod` validation on auth, profile, parking, reservation, and admin payloads.
- Input sanitization strips unsafe HTML-like characters and blocks suspicious Mongo operator keys.
- Passwords are hashed with `bcryptjs`.
- Sessions use signed JWTs in `httpOnly` cookies. No localStorage token storage.
- CSRF protection is enforced on state-changing endpoints with cookie + header token matching.
- Role-based checks happen both in UI navigation and in API handlers.
- Generic login errors avoid revealing whether email or password was incorrect.
- In-memory rate limiting protects login, registration, reservation creation, and admin parking creation.
- Security headers configured in `next.config.ts`: CSP, frame deny, no-sniff, referrer policy, permissions policy.
- Audit logs capture login events, profile updates, reservation create/cancel, and admin CRUD operations.
- Errors are centralized through `withErrorHandler`, with minimal production exposure.
- Secrets are loaded only through environment variables.

## Reservation rules

- Reservation start time must be in the future.
- End time must be after start time.
- Users are limited to 2 active future reservations.
- Time conflicts on the same parking space are blocked.
- Parking spaces under maintenance cannot be reserved.
- Cancellation requires at least 30 minutes before start time for normal users.
- Expired reservations are reconciled by `reconcileReservationStatuses`.
- Parking-space level advisory locking reduces same-slot race conditions during concurrent booking attempts.

## LINE binding flow

Current implementation uses a dedicated `/line/connect` page.

- The app generates a short-lived bind token via `POST /api/profile/line-connect`.
- If `LINE_OA_ID` is configured, the user can open the LINE OA chat directly with a prefilled connect message.
- The LINE bot receives a message like `bind ABCD1234`.
- The webhook verifies `x-line-signature` using `LINE_CHANNEL_SECRET`.
- On success, the matching user account is updated with the sender's `lineUserId`.

This keeps the dashboard/profile UI simple while still binding the real LINE account behind the scenes.

## Discord webhook

If `DISCORD_WEBHOOK_URL` is present, the app sends important operational events such as reservation creation and suspicious login failures. If not present, Discord logging is skipped without breaking the main flow.

## Realtime-ish updates

`/parking` polls `/api/parking-spaces` every 20 seconds to refresh parking status. This keeps the UI simple while still giving near-live availability updates.

## Known follow-up opportunities

- Add persistent distributed rate limiting for multi-instance deployments.
- Add full admin edit/delete actions in the UI for users and reservations.
- Add dedicated scheduled execution for `/api/jobs/reconcile-reservations` on the hosting platform.
- Add formal LINE Login binding instead of manual ID entry.

