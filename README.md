# MathPortal — Student Dashboard

React 19 + Vite 7 + Tailwind 4 + react-router-dom. Talks to the Math House backend (`Math_house-main`).

## Run

```bash
npm install
npm run dev     # .env.development → VITE_API_URL=http://localhost:3000
npm run build   # .env.production  → VITE_API_URL=https://bcknd.mathshouse.net
```

Local demo login: run `npm run seed:teacher-demo` in `Math_house-main`; the demo students
(`demo.*@mathhouse.local`) use the password in `Math_house-main/src/seeds/teacherPortalDemo.ts`.

## Layout

- `src/Layout/AdminLayout.jsx` — the student shell from the design: sidebar (desktop), bottom bar (phones),
  top bar with notifications and the account menu. Wraps every `/user/*` page in `StudentDataProvider`.
- `src/context/StudentData.jsx` — profile, upcoming/finished sessions, cancel requests, ratings, homework and
  plan counts, notifications, toast.
- `src/lib/portal.js` — date/time helpers, session types and colours, `mapSession`.
- `src/components/portal/` — `Icon`, `HlsPlayer`, shared UI (`Kpi`, `Page`, `PageHead`, `Modal`, `StarRow`, …).
- `src/styles/portal.css` — the design's component classes (`card`, `btn-light`, `pl-btn`, `rp-card`, `s-side`, …),
  loaded in the Tailwind `components` layer so utilities still win.

## Screens in the new design

| Route | Screen |
|---|---|
| `/user/home` | Hero (next session, live sessions left, homework, plans) + quick access cards |
| `/user/upcoming` | Upcoming sessions by day, join link, cancel request (closes 24 h before) |
| `/user/history` | Attendance history table with ratings |
| `/user/session/:id` | One session: teacher PDFs, videos, idea sheets, quizzes; rate to open materials |
| `/user/materials` | Class materials by course and chapter |
| `/user/remaining` | Extra homework + quizzes to solve |
| `/user/exams`, `/user/diagnostic` | Exams | Diagnose tabs |

Other pages (store/payment, purchases, study plans, reports, wallet, promo codes, profile, lesson, chapters,
exam taking and review) keep their existing screens inside the new shell.
