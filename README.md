# Upstars Assistant

A web app for Upstars, a volunteer tutoring programme in Singapore. Tutors record each lesson, admins plan the syllabus and pair tutors with students, and students see their own goals and progress.

People using it range from primary-school students to retired volunteers, many on phones. **Every design decision favours being easy to read and hard to get lost in** (see [Design system](#design-system)).

Built with Next.js 16 (App Router, Cache Components, Server Actions), React 19, Tailwind CSS 4, Drizzle ORM on Postgres, and better-auth for email/password sign-in.

> **This Next.js has breaking changes from older versions.** Read the guides in `node_modules/next/dist/docs/` before writing code (see `AGENTS.md`).

## Roles

| Role        | Can do                                                                                                                                            |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Admin**   | Everything: add/edit users, pair tutors with students, edit the syllabus, worksheets, tests and resources, check in lessons, set goals.           |
| **Tutor**   | Check in lessons with any student, browse profiles and pairings, and set goals and tick off progress for the students they're paired with. Read-only syllabus. |
| **Student** | See their own profile, goals, progress and the syllabus. Can't edit anything.                                                                     |

Admins have no profile page. Permission checks live in `lib/session.ts` (`requireUser`, `getAdminUser`, `isAdmin`) and are repeated in each Server Action.

## Features

### Sign in (`app/(auth)`)

- **Try a demo** tab: one tap signs in as a shared Demo Admin, Tutor or Student (`lib/demo-accounts.ts`, `demo-actions.ts`). Shared accounts mean other visitors see your changes.
- **My account** tab: email and password sign-in and sign-up, with a Show/Hide password toggle.

### Home (`app/page.tsx`)

- Greeting, a **Help** button that reopens the onboarding guide, and Sign out at the bottom.
- **Lesson check-in** (tutors and admins only), described below.
- One large tile per section, each with its own colour and icon. Students get their own tiles in their own order: My progress, Syllabus, My profile, Resources.

### Onboarding guide (`app/onboarding-guide.tsx`, `content/onboarding.md`)

- A step-by-step modal that opens on first sign-in. Real accounts store `user.onboardedAt`. Demo accounts use `localStorage`, so every visitor sees it.
- Content is plain markdown that anyone can edit. `#`/`##` headings start pages, and `[admin, tutor]` after a heading limits that page to those roles. Paragraphs, `- ` lists and `**bold**` are supported. The parser is in `lib/guide.ts`.

### Lesson check-in (`app/check-in`)

- **Check in a lesson** opens a full-screen form. The student and subject are folded into a "Change" row, and the tutor's own students are listed first.
- Five tabs: **Concepts** (by chapter and week, opening on the chapter the student is up to), **Worksheets**, **Tests**, **Rewards** (attendance, behaviour and bonus, 0–2 each, for a score out of 6) and **Remarks** (required).
- Save is pinned to the bottom, with a running summary and a "Still needed" hint. Closing with unsaved ticks asks for confirmation first.
- After saving, **Share on WhatsApp** opens an editable message for the student's parents (via `wa.me`).
- **Past check-ins** pages through a student's lessons one at a time, newest first.
- Saving a check-in marks the ticked concepts, worksheets and tests as done for that student.

### People (`app/volunteers`, route kept as `/volunteers`)

- **Users** tab: search by name or email and filter by role. Admins can add users (with a temporary password) and edit them. Changing someone's role removes their pairings.
- **Pairings** tab: tutors grouped with their students. A student has at most one main tutor. Admins can create pairings and unpair.
- **Profile** (`/volunteers/[id]`):
  - Student profiles show their main tutor, others who've taught them, goals, and a past-lessons carousel.
  - Tutor profiles show their main tutees and other students they've tutored.
  - Students can only open their own profile, which is shown to them as "My profile".

### Syllabus (`app/syllabus`)

- Pick a level and subject. All views are filtered by them through URL params (`?subject=`).
- **Syllabus** tab: the **standard** syllabus, as chapters → weeks → concepts, with teaching time. Admins tap **Edit syllabus** to add, edit, delete and reorder items. Changes save as they go. Tutors see a pointer to customising it per student (below).
- **Worksheets** and **Tests** tabs: lists, plus builders (`/new`, `/[id]`).
  - Worksheets cover concepts.
  - Tests cover chapters and are either Capstone checks or Monthly checks.
- **Edit levels & subjects** modal (admins).
- Seed data is in `seed_data/syllabus/*.csv`. Load it with `npm run db:seed:syllabus`.

### Goals & progress (`app/goals`; shown to students as "My progress")

- Pick a student (students see only themselves), then a level and subject. Three summary tiles show the % of concepts, worksheets and tests done.
- **Goals** tab: quarterly exam goals with target marks and a result. Each goal shows a status of Waiting for result, Target met, or N marks short.
- **Syllabus** tab: tick concepts done, or a whole week at once. "Taught 24 Oct" opens the lessons that covered a concept.
- **Custom syllabus**: each student follows the standard syllabus for a subject until an editor taps **Customise for {name}**. That makes the student their own copy, which they can then edit: move chapters, add, remove and reorder weeks, change teaching time, and reorder, move, remove, add back or add new concepts. **Reset to standard syllabus** puts them back.
  - The copy is independent: later changes to the standard syllabus don't flow in, apart from renames and deletions. Standard concepts added later appear under **Add back a concept**.
  - Concepts are shared, so Done ticks, check-in history, worksheets and tests keep working. A concept added for one student is a `concept` row with `student_id` set and no week. Taking a concept out of a syllabus keeps the row, so past lessons still name it.
  - Tables: `student_syllabus` (exists = custom), `student_week` (ordered by `position`, shown as the week number) and `student_week_concept`. `getStudentPlan` in `app/syllabus/queries.ts` returns the plan a student follows, in the same shape as the standard one. Progress tabs and lesson check-in use it.
- **Worksheets** and **Tests** tabs: tick-lists with the date each one was done.
- Editors are admins and the student's paired tutor (`canEditStudent` in `lib/students.ts`). Ticks save optimistically and roll back on error.

### Resources (`app/resources`)

- A list of external links (guides, forms) that open in a new tab. Admins can add, edit, reorder and delete them.

## Design system

The audience is **young students and older volunteers**, so the rule is: large, high-contrast and plainly worded.

- **Typeface:** Atkinson Hyperlegible Next (`app/layout.tsx`), designed for low-vision readers. It's the only family.
- **Size:** The root font size is 17px on phones and 18px on wider screens (`app/globals.css`). All Tailwind rem sizes, gaps and touch targets scale with it. Body copy is `text-base` or larger, and errors, hints and toasts are never small text.
- **Colour:** Tailwind's `zinc` scale is remapped in `globals.css` to a navy "night sky" neutral, so every `zinc-*` class uses the brand colours. `zinc-900` (#18204A) is the ink and primary-button colour. `zinc-600` is the minimum for secondary text (7:1 on white). `text-star` (#FFC53D) is reserved for the brand star.
- **Sections:** `lib/sections.tsx` gives each area a colour and icon: People is sky, Syllabus violet, Goals emerald, Resources amber. The home tile and `PageHeader section="…"` share them, so people can tell where they are without reading. **New pages in a section should pass `section`.**
- **Controls:** Shared class strings live in `components/form.tsx`: primary, secondary, danger, compact, add and inline-edit buttons, plus inputs and selects. Inputs and outlined buttons use 2px `zinc-500` borders (3:1 or better) and touch targets are at least 44px. Reuse these rather than restyling.
- **Patterns:**
  - `PageHeader` has a sticky "Back to …" link.
  - `Modal` is a native `<dialog>`: a bottom sheet on phones, centred on desktop.
  - `FormDialog` handles add/edit modals with Delete.
  - `Tabs`, `FilterPanel` + `FilterSelect` (URL-backed pickers), `Accordion`/`EmptyState` (`app/syllabus/ui.tsx`), `MoveButtons` (reorder) and `Toast`.
- **Copy:** Sentence case, plain words ("People", not "Volunteer management"). Buttons say what they do ("Save check-in"). Empty states say what to do next.
- **Accessibility:** There's a visible focus ring everywhere and reduced motion is respected. Status changes use `aria-live`, and colour is always paired with text or an icon.

## Code map

```
app/            routes; each feature folder holds its page, client components, actions.ts (Server Actions) and queries.ts
components/     shared UI (form classes, modal, page header, tabs, icons, toast…)
lib/            session/auth, sections, guide parser, formatting, role and test-type constants
db/             Drizzle schema (schema.ts: syllabus, custom student syllabuses, pairings, goals, completion, check-ins, resources; auth-schema.ts: better-auth)
drizzle/        migrations
content/        onboarding.md (first-login guide)
scripts/        seed.mjs (wipe and refill demo data), seed-syllabus.mjs
seed_data/      syllabus CSVs
```

Conventions:
- Pages wrap their data loading in `<Suspense>` (Cache Components).
- Selections are kept in search params.
- Next keeps visited pages alive in hidden `<Activity>` boundaries, so forms reset themselves when hidden, and modals close on unmount.
- Dates are shown in Singapore time.

## Getting started

Create `.env.local` with `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL`. Then:

```bash
npm install
npx drizzle-kit migrate   # apply migrations
npm run db:reset          # WIPES every table, then loads demo users, syllabus, check-ins…
npm run dev               # http://localhost:3000
```

Seeded non-demo accounts sign in with the shared password in `scripts/seed.mjs`.

Type-check with `npx tsc --noEmit`. Don't run `next build` while `next dev` is running, because it overwrites `.next`.
