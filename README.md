# نظام إدارة الأداء — Alamah PMS

Performance Management System for Alamah Marketing (alamah.om)

---

## Monorepo Structure

```
alamah-pms/
├── frontend/          # Next.js 14 (App Router) → Vercel
├── backend/           # Node.js + Express → Railway
├── shared/            # Shared TypeScript types
├── package.json       # Workspace root
└── tsconfig.base.json
```

---

## Railway Deployment (Backend + Database)

### 1. Create a Railway project
- Go to [railway.app](https://railway.app) and create a new project.

### 2. Add PostgreSQL plugin
- Click **+ New** → **Database** → **PostgreSQL** inside your Railway project.
- Railway will automatically inject `DATABASE_URL` into your backend service.

### 3. Create the backend service
- Click **+ New** → **GitHub Repo** and connect this repository.
- Set the **Root Directory** to `/backend`.
- Railway will detect the `package.json` and build automatically.

### 4. Set environment variables on the backend service

| Variable | Description |
|---|---|
| `DATABASE_URL` | Auto-injected by Railway PostgreSQL plugin |
| `JWT_SECRET` | Random 64-char string |
| `JWT_REFRESH_SECRET` | Random 64-char string (different from JWT_SECRET) |
| `JWT_EXPIRES_IN` | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | `7d` |
| `ALLOWED_ORIGIN` | Your Vercel frontend URL (e.g. `https://alamah-pms.vercel.app`) |
| `SEED_ADMIN_EMAIL` | Initial HR Admin email address |
| `SEED_ADMIN_PASSWORD` | Initial HR Admin password |
| `PORT` | `3001` |
| `NODE_ENV` | `production` |

### 5. Deploy
Railway will run the start script automatically:
```
prisma migrate deploy && prisma db seed && node dist/server.js
```
This runs database migrations and seeds the initial HR Admin + competency templates on first deploy.

---

## Vercel Deployment (Frontend)

### 1. Connect repository to Vercel
- Import this repository on [vercel.com](https://vercel.com).
- Set the **Root Directory** to `frontend`.

### 2. Set environment variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Your Railway backend URL (e.g. `https://alamah-backend.railway.app`) |

### 3. Deploy
Vercel will build and deploy the Next.js frontend automatically.

---

## First Login

1. Go to your Vercel frontend URL.
2. Log in with the credentials you set in `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD`.
3. You are now logged in as HR Admin (`force_password_change: false` for the seeded admin).

---

## Creating Your First Cycle and Assigning Cards

1. **Log in** as HR Admin.
2. Navigate to **دورات التقييم** (Performance Cycles).
3. Click **إنشاء دورة جديدة** (Create New Cycle) — enter a name and year.
4. Click **تفعيل** (Activate) on the new cycle.
5. Click **عرض البطاقات** (View Cards) on the cycle.
6. Click **تعيين موظفين** (Assign Employees) — select employees and confirm.
7. Cards are now created. Click any card to set the 3 goals and 3 competencies.
8. Employees can now log in to see their card and submit self-assessments.

---

## Scoring Logic

- **Goals score** = average of 3 goal scores × 60%
- **Competencies score** = average of 3 competency scores × 40%
- **Total score** = Goals score + Competencies score (out of 5.0)
- Each goal/competency score = `final_score` if set by HR, otherwise `(employee_rating + manager_rating) / 2`

| Score Range | Label |
|---|---|
| 4.5 – 5.0 | استثنائي (Exceptional) |
| 3.5 – 4.4 | يتخطى التوقعات (Exceeds Expectations) |
| 2.5 – 3.4 | يحقق التوقعات (Meets Expectations) |
| 1.5 – 2.4 | دون التوقعات (Below Expectations) |
| 1.0 – 1.4 | غير مقبول (Unsatisfactory) |
