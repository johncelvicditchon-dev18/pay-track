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
| `/dashboard` | Signed-in dashboard with collapsible sidebar and Students / Accounts tabs |
| `/accounts` | Standalone accounts roster (kept for direct links) |

## Dashboard

After a successful login the app opens `/dashboard`, which shows:

- A collapsible sidebar — hidden/shown with the top-left button, remembered on
  desktop and off-canvas (with scrim) on mobile. Tabs, in order: **Analytics**,
  **Accounts**, **Students**, **Payments**.
- The **Analytics** tab (default) — a line chart of enrollment by year level
  (1st–4th year) for the officer's council, with total students, the
  highest-enrollment year, and the average per year.
- The **Accounts** tab with the Firestore-backed roster; the signed-in
  officer's row is highlighted.
- The **Students** tab — import a class list from `.xlsx`, `.xls`, or `.csv`
  (Student ID, Last Name, First Name, Middle Name, Program, Year,
  Classification). Rows are scoped to the officer's council, written to the
  Firestore `students` collection (document ID = `COUNCIL::STUDENTID`) and
  cached in `localStorage` per council; re-importing a Student ID updates that
  row. Includes a CSV template download and search. The Excel parser (`xlsx`)
  is loaded lazily only when importing.
- The **Payments** tab — council-scoped payment records with total billed,
  paid, and outstanding balances, receipts count, next due date, and status.

Visiting `/dashboard` without a session redirects to `/login`.

## Sign-up fields

Registration collects, in order:

- Full name — displayed in uppercase
- Student ID — unique, and used as the username when logging in
- Position — displayed in uppercase
- Year level — `1ST YEAR`, `2ND YEAR`, `3RD YEAR`, `4TH YEAR`
- Council / Organization
- Password and confirmation

There is no email field. Login accepts the **Student ID** plus password; students
never type or see an email address.

### Council / Organization

Officer accounts pick one council or organization. The options live in
`javascript/data/councils.js` and are used by both sign-up validation and the
dashboard:

| Group | Options |
| --- | --- |
| Institute student councils | `ISC-ICS`, `ISC-IAS`, `ISC-IHS`, `ISC-ITE`, `ISC-IBFS`, `ISC-ICJE` |
| Student organizations | `SRO-JPEG.COM`, `SRO-ISMTSU`, `SRO-VOSS`, `SRO-CITU`, `SRO-AYOA`, `SRO-GLEE-C`, `SRO-PSC`, `SRO-YLS`, `SRO-JEHRO`, `SRO-TMS-FIL`, `SRO-JFINEX`, `SRO-COMMUNITY`, `SRO-GAME`, `SRO-CRCYC`, `SRO-TEEM`, `SRO-JAMEX` |

Student and payment records are scoped to the officer's council. Officers with
the same council share the same roster and payment records; officers from a
different council see a different set.

> Existing accounts created before this change have no `council` field. Set it
> in Firestore (`users/{uid}.council`) before that officer can see records.
> Student and payment documents that have no `council` field are also hidden by
> the rules until they are reassigned.

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
- On sign-up the app also writes one verifiable field to the `users` document:
  `hashPassword` (PBKDF2-SHA256 of the password, with the Student ID as the
  salt). No salt, algorithm, or iteration fields are stored — the salt is
  re-derived from the Student ID when checking. The plain password is never
  written to Firestore. `verifyPassword()` in `javascript/lib/auth.js` can
  check a typed password against `hashPassword` from a trusted server later.

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

1. **Authentication → Sign-in method**: enable **Email/Password**. If you use the
   archived static dashboard's Firebase sync, enable **Anonymous** as well.
2. **Authentication → Settings → Authorized domains**: add `localhost` and your
   production domain.
3. **Firestore Database**: create the database, then deploy the bundled rules:

   ```bash
   npm install -g firebase-tools
   firebase login
   firebase use tcgc-payment-tracking-system
   firebase deploy --only firestore:rules
   ```

The rules in `firestore.rules` scope the roster and payment records to the
signed-in officer's council: reads and writes only succeed when the document's
`council` field matches the `council` on the caller's `users` profile. Payment
records are read-only from the app. Restrict profile reads further with an admin
custom claim if the roster should not be visible to every officer.

The Firebase web API key is public by design, but you should restrict it in the
Google Cloud console to your own domains and to the Firebase APIs this app uses.

## Payment records

The payment tracker reads the Firestore `paymentRecords` collection. Each
document ID is `<council>::<studentId>` (for example `ISC-ICS::2024-00123`), so
each council keeps its own record for a student. The document holds the
`council` plus that student's charges and official receipts:

```json
{
  "council": "ISC-ICS",
  "name": "Maria Santos",
  "institute": "ICS",
  "program": "BSCS",
  "yearLevel": "4TH YEAR",
  "organization": "ICS Student Council",
  "statement": "A.Y. 2026–2027 · 1st Semester",
  "updated": "October 9, 2026",
  "nextDue": "October 15, 2026",
  "charges": [
    {
      "id": "ics-tshirt",
      "label": "T-shirt fee",
      "category": "T-shirt",
      "scope": "Institute",
      "unit": "ICS",
      "amount": 750,
      "paid": 500,
      "dueDate": "October 15, 2026"
    }
  ],
  "payments": [
    {
      "id": "ics-tshirt-1",
      "label": "T-shirt fee (partial)",
      "date": "September 28, 2026",
      "ref": "OR-2026-10702",
      "amount": 500,
      "method": "GCash · Finance Office",
      "status": "Verified"
    }
  ]
}
```

Balances are derived from `charges`, so `amount` and `paid` are the only money
fields you need to maintain. `scope` is either `Institute` or `Organization`,
and `category` drives the tag color (Activity, Membership, T-shirt,
Miscellaneous).

Records are created in the Firebase console (or by a trusted admin tool) — the
rules deny client-side writes. The tracker requires a signed-in session and
looks records up by exact Student ID. Create a real account from `/signup`;
there are no shared demo logins.

The tracker shows the overall balance, separate institute and organization
subtotals, every charge with its own amount/paid/balance, and every payment with
its official receipt (OR) number.

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
  data/                 Year levels and the council/organization list
  lib/                  Firebase config, auth/profile, student, and payment-record helpers
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

Authentication is real (Firebase Auth), profile records live in Firestore, and
the tracker reads live payment records from the `paymentRecords` collection.
Keep payment amounts out of student-side writes — the rules already deny them —
and maintain those documents only from the Firebase console or a trusted admin
tool before using this with real financial data.

## Legacy version

`archive/legacy-static/` contains the earlier plain HTML/CSS/JavaScript version
for reference only. It is not used by the React application.
