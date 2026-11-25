# Archived static version

This folder is the original plain HTML/CSS/JavaScript version of TCGC PayTrack,
kept for reference only.

The live application is now the React + Vite app in the project root:

- `javascript/pages/Welcome.jsx`
- `javascript/pages/Login.jsx`
- `javascript/pages/Signup.jsx`
- `javascript/components/PaymentTracker.jsx`
- `html/index.html`

Run `npm run dev` from the project root to use the current app. The files in
this folder are not loaded by the React build.

## Student records (dashboard)

The dashboard's **Students** tab imports class lists from Excel (`.xlsx`, `.xls`)
or CSV, using the bundled SheetJS 0.18.5 library
(`assets/vendor/xlsx.full.min.js`, Apache-2.0 — see `xlsx.LICENSE`). Imported
rows are stored in `localStorage` under `tcgc_paytrack_students` and re-importing
a Student ID updates that row. Columns: Student ID, Last Name, First Name,
Middle Name, Program, Year, Classification. A starter CSV is available from the
**Download template** button.
