# TestSeries Admin Panel

Admin web application for managing the TestSeries platform.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: JavaScript (no TypeScript)
- **Styling**: Tailwind CSS
- **Icons**: React Icons
- **Database**: PostgreSQL via Prisma ORM
- **DB Host**: Supabase (change to Hetzner later — just update DATABASE_URL)
- **Auth**: JWT (hardcoded admin credentials via env)
- **File Storage**: Cloudflare R2 (switch to Bunny.net later — change STORAGE_PROVIDER)
- **Payments**: Razorpay
- **Toasts**: React Hot Toast

---

## Setup Instructions

### 1. Install dependencies
```bash
npm install
```

### 2. Setup environment variables
```bash
cp .env.example .env
```

Edit `.env` and fill in:
- `DATABASE_URL` — your Supabase PostgreSQL connection string
- `JWT_SECRET` — any long random string
- `ADMIN_EMAIL` — your admin login email
- `ADMIN_PASSWORD` — your admin login password
- Razorpay keys (from Razorpay dashboard)
- R2 credentials (from Cloudflare dashboard)

### 3. Push database schema
```bash
npm run db:push
```

### 4. Run development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

You will be redirected to `/admin/login`

---

## Project Structure

```
testseries-admin/
├── app/
│   ├── (auth)/login/          ← Login page
│   ├── (admin)/               ← All admin pages (protected)
│   │   ├── dashboard/
│   │   ├── exams/
│   │   ├── subjects/
│   │   ├── chapters/
│   │   ├── topics/
│   │   ├── questions/
│   │   ├── tests/
│   │   ├── live-exams/
│   │   ├── crash-courses/
│   │   ├── users/
│   │   ├── revenue/
│   │   ├── announcements/
│   │   ├── feedback/
│   │   └── settings/
│   └── api/                   ← All API routes
├── components/
│   ├── admin/                 ← Sidebar, Topbar, StatsCard, QuestionForm
│   └── ui/                    ← AlertDialog, Modal, Badge, EmptyState, Spinner, Pagination
├── lib/
│   ├── constants.js           ← All app constants
│   ├── prisma.js              ← Prisma client
│   ├── auth.js                ← JWT auth helpers
│   ├── storage.js             ← R2 file upload helpers
│   └── api.js                 ← API response helpers
├── prisma/
│   └── schema.prisma          ← Database schema
└── middleware.js              ← Route protection
```

---

## Switching Database (Supabase → Hetzner)

When you outgrow Supabase, just change one line in `.env`:
```
DATABASE_URL="postgresql://hetzner-connection-string"
```
No code changes needed. Prisma handles everything.

---

## Switching Storage (R2 → Bunny.net)

Change in Settings page or `.env`:
```
STORAGE_PROVIDER=bunny
```
Then add Bunny API keys in Settings page.

---

## Adding Admin Login

Currently uses hardcoded credentials from `.env`.
To change password: update `ADMIN_PASSWORD` in `.env` and restart server.

---

## Database Commands

```bash
npm run db:push      # Push schema to database
npm run db:studio    # Open Prisma Studio (visual DB browser)
npm run db:generate  # Regenerate Prisma client after schema changes
```
