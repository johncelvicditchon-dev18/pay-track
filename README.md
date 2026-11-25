# TCGC PayTrack

A React + Vite front-end for the Tangub City Global College payment tracking
system. PayTrack is all about tracing **institute and organization payments and
contributions** — activity fees, membership fees, t-shirt fees, and other
miscellaneous charges. Students can create an account, log in, and look up every
charge balance, payment, and official receipt with their student ID.

## What PayTrack tracks

- Activity fees
- Institute / organization membership fees
- T-shirt payments
- Other miscellaneous institute and organization charges
- Every charge balance, payment, and official receipt

Each charge is tagged with its **scope** (institute or organization) and the
collecting unit, so students can see exactly who is charging them and how much is
still unpaid. Each payment keeps its official receipt (OR) number.

## Run locally

```bash
npm install
npm run dev
```

Then open the URL printed by Vite (normally `http://localhost:5173`).

Production build:

```bash
npm run build
npm run preview
```

## Routes

| Route | Page |
| --- | --- |
| `/` | Welcome page with the student-ID payment tracker |
| `/login` | Student login — lands on `/dashboard` after success |
| `/signup` | Student registration |
| `/dashboard` | Signed-in dashboard with collapsible sidebar and Dashboard / Accounts tabs |
| `/accounts` | Standalone accounts roster (kept for direct links) |

## Dashboard

After a successful login the app opens `/dashboard`, which shows:

- A collapsible sidebar — hidden/shown with the top-left button, remembered on
  desktop and off-canvas (with scrim) on mobile.
- A **Dashboard** tab with the signed-in student's details and shortcuts.
- A **Students** tab — import a class list from `.xlsx`, `.xls`, or `.csv`
  (Student ID, Last Name, First Name, Middle Name, Program, Year, Classification).
  Rows are saved in this browser (`localStorage` key `tcgc_paytrack_students`) and
  re-importing a Student ID updates that row. Includes a CSV template download,
  search, and clear-all. The Excel parser (`xlsx`) is loaded lazily only when
  importing.
- An **Accounts** tab with the Firestore-backed roster; the signed-in student's
  row is highlighted.

Visiting `/dashboard` without a session redirects to `/login`.

## Sign-up fields

Registration collects, in order:

- Full name — displayed in uppercase
- Student ID — unique, and used as the username when logging in
- Position — displayed in uppercase
- Year level — `1ST YEAR`, `2ND YEAR`, `3RD YEAR`, `4TH YEAR`
- Institute
- Program — filtered by the selected institute
- Password and confirmation

There is no email field. Login accepts the **Student ID** plus password; students
never type or see an email address.

### Institute → program mapping

| Institute | Programs |
| --- | --- |
| ICS | BSCS |
| IAS | AB COMM, AB ENGLISH, AB POLSCI |
| ITE | BEED, BSED-ENGLISH, BSED-FILIPINO, BSED-MATH, BSED-SOCSTUD |
| IHS | BS-MIDWIFERY |
| IBFS | BSBA-FM, BSBA-HRM, BSBA-MM, BSOA |
| ICJE | BS-CRIM, BSISM |

The mapping lives in `javascript/data/academic.js` and is used by both the program
dropdown and form validation. Changing the institute clears the selected
program.

## Firebase setup

Authentication and student profiles run on Firebase:

- **Firebase Auth** (email/password provider) handles login, account creation,
  session persistence (`Keep me signed in`), and sign-out.
- **Cloud Firestore** stores each student profile in the `users` collection,
  using the Firebase Auth UID as the document ID.
- The student's **Student ID is the username**. Because Firebase Auth needs an
  email-shaped identifier, each account gets a deterministic internal address
  (`2024-00123@students.tcgc.local`) built in `javascript/lib/auth.js`. That
  address is never shown, never stored as a profile field, and cannot receive
  mail — so password resets are handled by the Finance Office.
- On sign-up the app also writes a verifiable password hash to the `users`
  document: `hashPassword` (PBKDF2-SHA256 of the password), `passwordSalt`,
  `passwordAlgorithm`, and `passwordIterations`. The plain password is never
  written to Firestore. `verifyPassword()` in `javascript/lib/auth.js` can check
  a typed password against those fields from a trusted server later.

> Important: Firebase Auth hashed the password the moment the account was
> created. The extra `hashPassword` field is for your own records/verification —
> it does not replace Auth's hash, and it cannot be reversed to show a password.
> Because the current rules let every signed-in student read the roster, treat
> those hashes as sensitive and tighten the rules (or move them to a
> server-only collection) before using real student data.

The project keys live in `javascript/lib/firebase.js` (override them with
`VITE_FIREBASE_*` environment variables if you move to another Firebase project).

Before the app can log people in, in the
[Firebase console](https://console.firebase.google.com/project/tcgc-payment-tracking-system):

1. **Authentication → Sign-in method**: enable **Email/Password**.
2. **Authentication → Settings → Authorized domains**: add `localhost` and your
   production domain.
3. **Firestore Database**: create the database, then deploy the bundled rules:

   ```bash
   npm install -g firebase-tools
   firebase login
   firebase use tcgc-payment-tracking-system
   firebase deploy --only firestore:rules
   ```

The rules in `firestore.rules` let a signed-in student read the roster (used by
`/accounts`), but only create or edit their own profile document. Restrict reads
further with an admin custom claim if the roster should not be visible to every
student.

The Firebase web API key is public by design, but you should restrict it in the
Google Cloud console to your own domains and to the Firebase APIs this app uses.

## Demo data

The payment tracker is backed by demo records in
`javascript/data/paymentRecords.js`. Student IDs:

- `2024-00123` — with an outstanding balance
- `2023-00456` — with an outstanding balance
- `2025-00789` — fully paid

The tracker shows the overall balance, separate institute and organization
subtotals, every charge with its own amount/paid/balance, and every payment with
its official receipt (OR) number. Charges are grouped by category (Activity,
Membership, T-shirt, Miscellaneous) and tagged by scope.

Accounts created through `/signup` are real Firebase accounts, so there is no
shared demo login. Create your own account from the sign-up page.

## Project structure

```
html/                   HTML entry
  index.html            Vite entry page
  main.jsx              Entry bridge to the React source

design/                 Shared design system and page styles
  style.css
  welcome.css
  auth.css

javascript/             React application code
  components/           Header, footer, auth layout, payment tracker
  context/              Auth session and toast providers
  data/                 Institute/program mapping and demo payment records
  lib/                  Firebase config and auth/profile helpers
  pages/                Welcome, Login, Signup, Accounts
  App.jsx
  main.jsx

assets/logo/            TCGC logo used by the public site

archive/legacy-static/  Earlier plain HTML/CSS/JavaScript version (archived)
```

The root also keeps the project configuration (`package.json`,
`vite.config.js`, `firebase.json`, `firestore.rules`, `.gitignore`) and this
README, as required by Vite/npm.

## Important note

Authentication is real (Firebase Auth), and profile records live in Firestore,
but **payment records are still demo data**. Connect
`javascript/data/paymentRecords.js` to a server-side collection of charges and
receipts — and never trust student-side writes for payment amounts — before
using this with real financial data.

## Legacy version

`archive/legacy-static/` contains the earlier plain HTML/CSS/JavaScript version
for reference only. It is not used by the React application.
