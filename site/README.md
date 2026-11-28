# Static student portal

This folder contains the standalone HTML/CSS/JavaScript student portal for TCGC
PayTrack. It is the site deployed at the root of the domain: `npm run build`
copies this folder into `dist/`, and Vercel serves `dist/` at `/`.

Run it locally with `npx serve site` and open `index.html`.

## Accounts

Sign-up creates a real **Firebase Authentication** login and a Firestore profile
in the `users` collection (document ID = the Auth UID). Because Firebase Auth
needs an email-shaped identifier, each Student ID gets a deterministic internal
address (`<student-id>@students.tcgc.local`) built in
`assets/js/firebase-client.js`. The plain password is never stored locally or in
Firestore — Firebase Auth keeps its own hash.

Login checks Firebase first; legacy browser-only accounts (created before this
change) still work as a fallback. After login, the session keeps the Firebase ID
token so the dashboard can read the council-scoped Firestore data, and the
**Accounts** tab lists Firebase profiles (marked “Synced”, read-only) alongside
local accounts.

Enable **Email/Password** under Authentication → Sign-in method, add the site's
domain under Authentication → Settings → Authorized domains, and deploy
`firestore.rules` so the `users` profile write and council-scoped reads work.

## Student records (dashboard)

The dashboard's **Students** tab imports class lists from Excel (`.xlsx`, `.xls`)
or CSV, using the bundled SheetJS 0.18.5 library
(`assets/vendor/xlsx.full.min.js`, Apache-2.0 — see `xlsx.LICENSE`). Imported
rows are written to the Firestore `students` collection (document ID =
`COUNCIL::STUDENTID`) through the REST client in `assets/js/firebase-client.js`,
with a per-council `localStorage` cache under
`tcgc_paytrack_students:<council>`. Re-importing a Student ID updates that row.
Columns: Student ID, Last Name, First Name, Middle Name, Program, Year,
Classification. A starter CSV is available from the **Download template** button.

The dashboard requires a signed-in account and uses that account's Firebase
token for its Firestore reads and writes, so records stay scoped to the
officer's council. If no Firebase session is available, imports are saved
locally and the page explains what to enable.

## Student payment lookup

Students don't create accounts. On the home page they enter their Student ID;
the tracker matches it against the `students` roster (imported by officers) and
only then opens `pages/student.html`, which shows their balance and charges
grouped by semester and payment type, plus official receipts. Unknown Student
IDs stay on the landing page with an error, and `pages/student.html` re-checks
the ID before showing the portal, so it cannot be opened without a record.

Both lookups use public reads of `students`/`paymentRecords`, so
`firestore.rules` keeps writes disabled — only signed-in officers can add or
change data.

## Payment types and charges

Officers use the **Payments** tab to:

- create payment types such as `2ND SEMESTER - 2026-2027 | MEMBERSHIP FEE`
  (semester, academic year, name, scope, category), stored in `paymentTypes`;
- post a charge to one of their council's students, which merges a new entry
  into that student's `paymentRecords/<council>::<studentId>` document with the
  semester, academic year, type label, amount, paid amount, and due date.

Students then see those charges grouped by semester and type in their portal.
