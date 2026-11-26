# Static student portal

This folder contains the standalone HTML/CSS/JavaScript student portal for TCGC
PayTrack. It is the site deployed at the root of the domain: `npm run build`
copies this folder into `dist/`, and Vercel serves `dist/` at `/`.

Run it locally with `npx serve site` and open `index.html`.

## Student records (dashboard)

The dashboard's **Students** tab imports class lists from Excel (`.xlsx`, `.xls`)
or CSV, using the bundled SheetJS 0.18.5 library
(`assets/vendor/xlsx.full.min.js`, Apache-2.0 — see `xlsx.LICENSE`). Imported
rows are written to the Firestore `students` collection (document ID = Student
ID) through the REST client in `assets/js/firebase-client.js`, with a
`localStorage` cache under `tcgc_paytrack_students`. Re-importing a Student ID
updates that row. Columns: Student ID, Last Name, First Name, Middle Name,
Program, Year, Classification. A starter CSV is available from the **Download
template** button.

The static dashboard has no Firebase login of its own, so it signs in
**anonymously** when the deployed rules require authentication. Enable
**Anonymous** under Authentication → Sign-in method if you deploy the bundled
`firestore.rules`. While Firestore is still in test mode, writes work without a
sign-in. If neither is available, records are saved locally and the page shows
what to enable.
