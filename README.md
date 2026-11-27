# TCGC PayTrack

A React + Vite portal for tracking Tangub City Global College institute and
organization payments, balances, and official receipts.

## Stack

- **React 19 + Vite** single-page app
- **Firebase Authentication** for officer accounts (Student ID becomes an
  internal email address)
- **Cloud Firestore** for profiles, student rosters, payment types, and payment
  records

## Run

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
npm run preview
```

## Project layout

```
index.html                 Vite entry
src/
  App.jsx                  Routes
  main.jsx                 Providers + styles
  components/              Shared UI (header, auth layout, panels, dialogs)
  context/                 Auth + toast providers
  data/councils.js         Councils, positions, and validation helpers
  lib/                     Firebase config and Firestore services
  pages/                   Welcome, Login, Signup, Dashboard, StudentPortal, Accounts
  styles/                  Design system and page styles
public/logo/               TCGC logo
firestore.rules            Firestore security rules
vercel.json                Vercel build + SPA rewrites
```

## Features

### Landing page
- Student enters a Student ID in “Track your payment” and opens the student
  portal.

### Officer portal (`/dashboard`)
- **Analytics** — enrollment by year level with a hover/focus card.
- **Accounts** — Firebase accounts registry.
- **Students** — import Excel/CSV class lists, edit/delete students, and
  **Record Payment** per row.
- **Payment Record** — create payment types (name + amount), review recorded
  charges, see who recorded each payment, and **Lock/Unlock** rows.

### Student portal (`/student`)
- Enter a Student ID to see balances, charges grouped by semester and payment
  type, and official receipts (including which officer assisted).

## Firebase setup

1. Enable **Email/Password** under Authentication → Sign-in method.
2. Add your domain under Authentication → Settings → Authorized domains.
3. Create a Firestore database and deploy the rules:

   ```bash
   firebase deploy --only firestore:rules
   ```

The current rules keep student/payment reads public for the Student ID lookup,
allow officer writes only within their council, and store officer tracking on
payments.
