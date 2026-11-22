# TCGC PayTrack

A React + Vite front-end for the Tangub City Global College payment tracking
system. PayTrack is all about tracing **institute payments and contributions** —
activity contributions, membership fees, t-shirt fees, and other miscellaneous
charges. Students can create an account, log in, and look up their balance, due
dates, and receipt history with their student ID.

## What PayTrack tracks

- Activity contributions
- Institute / organization membership fees
- T-shirt fees
- Other miscellaneous institute charges
- Payments, balances, and official receipts

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
| `/login` | Student login |
| `/signup` | Student registration |

## Sign-up fields

Registration collects:

- Full name
- Student ID
- Institute
- Year level — `1ST YEAR`, `2ND YEAR`, `3RD YEAR`, `4TH YEAR`
- Program — filtered by the selected institute
- School email, password, and confirmation

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

## Demo data

Login:

- Email: `student@tcgc.edu`
- Password: `tcgc1234`

Payment tracker student IDs:

- `2024-00123` — with an outstanding balance
- `2023-00456` — with an outstanding balance
- `2025-00789` — fully paid

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
  lib/                  Local account/session helpers
  pages/                Welcome, Login, Signup
  App.jsx
  main.jsx

assets/logo/            TCGC logo used by the public site

archive/legacy-static/  Earlier plain HTML/CSS/JavaScript version (archived)
```

The root also keeps the project configuration (`package.json`,
`vite.config.js`, `.gitignore`) and this README, as required by Vite/npm.

## Important note

This is still a front-end demo: accounts are stored in the browser's
`localStorage`, and passwords are not hashed. Connect `javascript/lib/auth.js`
and `javascript/data/paymentRecords.js` to a real API and server-side
authentication before using this with real student data.

## Legacy version

`archive/legacy-static/` contains the earlier plain HTML/CSS/JavaScript version
for reference only. It is not used by the React application.
