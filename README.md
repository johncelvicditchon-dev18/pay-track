# TCGC PayTrack

Static officer/student portal for the Tangub City Global College payment
tracking system. All pages, styles, and scripts live in **`site/`**; there is no
framework or bundler build step beyond copying that folder to `dist/`.

## Run locally

```bash
npm run dev
```

Or serve the folder directly:

```bash
npx serve site
```

## Build / deploy

```bash
npm run build
```

`scripts/build-site.mjs` copies `site/` into `dist/`, and Vercel serves `dist/`.

## Features

- **Officer portal** (`/pages/dashboard.html`): Analytics, Accounts, Students,
  and Payment Record tabs.
  - Students are imported from Excel/CSV and scoped to the officer's council.
  - Payment types are created with a name and amount.
  - Record Payment on a student selects a payment type + amount, records the
    receipt, and stores which officer assisted.
  - Each payment row can be locked or unlocked.
- **Student portal** (`/pages/student.html`): enter a Student ID to see balances,
  charges by semester/type, and official receipts.
- **Accounts** are Firebase Authentication users with a Firestore `users`
  profile; data is council-scoped in Firestore.

## Firebase setup

1. Enable **Email/Password** in Firebase Authentication.
2. Add your domain under Authentication → Settings → Authorized domains.
3. Deploy the rules in `firestore.rules`:

   ```bash
   firebase deploy --only firestore:rules
   ```

See [`site/README.md`](site/README.md) for the Firestore document shapes and
page-level details.
