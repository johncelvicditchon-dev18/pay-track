import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  where,
  writeBatch
} from "firebase/firestore";
import { db } from "./firebase";
import { normalizeCouncil } from "../data/councils";

export const STUDENTS_KEY = "tcgc_paytrack_students";
const STUDENTS_COLLECTION = "students";
const FIRESTORE_BATCH_SIZE = 450;

export const STUDENT_COLUMNS = [
  { key: "studentId", label: "Student ID" },
  { key: "lastName", label: "Last Name" },
  { key: "firstName", label: "First Name" },
  { key: "middleName", label: "Middle Name" },
  { key: "program", label: "Program" },
  { key: "year", label: "Year" },
  { key: "classification", label: "Classification" }
];

const TEMPLATE_HEADERS = [
  "STUDENTID",
  "LASTNAME",
  "FIRSTNAME",
  "MIDDLE NAME",
  "PROGRAM",
  "YEAR",
  "CLASSIFICATION"
];

const FIELD_ALIASES = {
  studentId: ["studentid", "studentnumber", "studentno", "studentcode", "idnumber", "id"],
  lastName: ["lastname", "surname", "familyname"],
  firstName: ["firstname", "givenname"],
  middleName: ["middlename", "middleinitial", "mi"],
  program: ["program", "course", "degree"],
  year: ["year", "yearlevel", "level"],
  classification: ["classification", "class", "category", "status"]
};

function normalizeHeader(value) {
  return String(value == null ? "" : value)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export function normalizeStudentId(value) {
  return String(value == null ? "" : value)
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function cleanText(value) {
  return String(value == null ? "" : value)
    .replace(/\s+/g, " ")
    .trim();
}

function headerScore(row) {
  let score = 0;

  (row || []).forEach((cell) => {
    const header = normalizeHeader(cell);
    if (!header) return;

    const matched = Object.keys(FIELD_ALIASES).some((field) =>
      FIELD_ALIASES[field].includes(header)
    );

    if (matched) score += 1;
  });

  return score;
}

export function findHeaderRow(rows) {
  let best = { index: -1, score: 0 };
  const limit = Math.min(rows.length, 25);

  for (let i = 0; i < limit; i += 1) {
    const score = headerScore(rows[i]);
    if (score > best.score) best = { index: i, score };
  }

  return best.score >= 2 ? best.index : -1;
}

export function mapColumns(headerRow) {
  const map = {};

  (headerRow || []).forEach((cell, index) => {
    const header = normalizeHeader(cell);
    if (!header) return;

    Object.keys(FIELD_ALIASES).forEach((field) => {
      if (map[field] == null && FIELD_ALIASES[field].includes(header)) {
        map[field] = index;
      }
    });
  });

  return map;
}

function readCell(row, index) {
  return index == null ? "" : cleanText(row[index]);
}

export function rowsFromWorkbook(XLSX, workbook) {
  let bestRows = null;

  (workbook.SheetNames || []).forEach((name) => {
    if (bestRows) return;

    const sheet = workbook.Sheets[name];
    if (!sheet) return;

    const rows = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: "",
      raw: false,
      blankrows: false
    });

    const headerIndex = findHeaderRow(rows);
    if (headerIndex === -1) return;

    const map = mapColumns(rows[headerIndex]);
    if (map.studentId != null && map.lastName != null && map.firstName != null) {
      bestRows = rows;
    }
  });

  return bestRows;
}

export function importStudentRows(rows, existing = [], council = "") {
  if (!Array.isArray(rows) || !rows.length) {
    return {
      ok: false,
      error: "That file looks empty. Add a header row and at least one student."
    };
  }

  const councilCode = normalizeCouncil(council);
  if (!councilCode) {
    return {
      ok: false,
      error: "Your account has no Council/Organization assigned. Contact the Finance Office."
    };
  }

  const headerIndex = findHeaderRow(rows);
  if (headerIndex === -1) {
    return {
      ok: false,
      error: `No column headers found. Use the template headers: ${TEMPLATE_HEADERS.join(", ")}.`
    };
  }

  const map = mapColumns(rows[headerIndex]);

  if (map.studentId == null) {
    return {
      ok: false,
      error: "The file needs a STUDENTID column. Download the template for the expected layout."
    };
  }

  if (map.lastName == null || map.firstName == null) {
    return {
      ok: false,
      error: "The file needs LASTNAME and FIRSTNAME columns. Download the template for the expected layout."
    };
  }

  const students = existing.map((student) => ({ ...student }));
  const indexById = {};

  students.forEach((student, index) => {
    indexById[normalizeStudentId(student.studentId)] = index;
  });

  let added = 0;
  let updated = 0;
  let skipped = 0;

  for (let i = headerIndex + 1; i < rows.length; i += 1) {
    const row = rows[i] || [];
    const studentId = normalizeStudentId(readCell(row, map.studentId));

    if (!studentId) {
      skipped += 1;
      continue;
    }

    const student = {
      studentId,
      council: councilCode,
      lastName: readCell(row, map.lastName).toUpperCase(),
      firstName: readCell(row, map.firstName).toUpperCase(),
      middleName: readCell(row, map.middleName).toUpperCase(),
      program: readCell(row, map.program),
      year: readCell(row, map.year),
      classification: readCell(row, map.classification)
    };

    const existingIndex = indexById[studentId];

    if (existingIndex == null) {
      indexById[studentId] = students.length;
      students.push(student);
      added += 1;
    } else {
      students[existingIndex] = student;
      updated += 1;
    }
  }

  if (!added && !updated) {
    return {
      ok: false,
      error: "No student rows were found. Check that the STUDENTID column is filled in."
    };
  }

  return { ok: true, students, added, updated, skipped };
}

function storageKey(council) {
  const code = normalizeCouncil(council);
  return code ? `${STUDENTS_KEY}:${code}` : STUDENTS_KEY;
}

export function loadStudents(council = "") {
  try {
    const raw = window.localStorage.getItem(storageKey(council));
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function saveStudents(students, council = "") {
  try {
    window.localStorage.setItem(storageKey(council), JSON.stringify(students));
    return true;
  } catch {
    return false;
  }
}

export function sortStudents(students) {
  return [...students].sort(
    (a, b) =>
      String(a.lastName || "").localeCompare(String(b.lastName || ""), "en", {
        sensitivity: "base"
      }) ||
      String(a.firstName || "").localeCompare(String(b.firstName || ""), "en", {
        sensitivity: "base"
      }) ||
      String(a.studentId || "").localeCompare(String(b.studentId || ""))
  );
}

export function filterStudents(students, query) {
  const needle = String(query || "").trim().toLowerCase();
  if (!needle) return students;

  return students.filter((student) =>
    STUDENT_COLUMNS.map((column) => student[column.key] || "")
      .join(" ")
      .toLowerCase()
      .includes(needle)
  );
}

export function buildTemplateCsv() {
  const lines = [
    TEMPLATE_HEADERS.join(","),
    "2024-00123,SANTOS,MARIA,CRUZ,BS Information Technology,4TH YEAR,REGULAR",
    "2024-00124,DELA CRUZ,JUAN,REYES,BS Computer Science,3RD YEAR,IRREGULAR"
  ];

  return lines.join("\r\n");
}

export function importSummary({ added, updated, skipped }) {
  return (
    added +
    " added" +
    (updated ? ", " + updated + " updated" : "") +
    (skipped ? ", " + skipped + " skipped" : "") +
    "."
  );
}

/* ---------- Firestore sync ---------- */
function studentDocId(student) {
  return `${normalizeCouncil(student.council)}::${normalizeStudentId(
    student.studentId
  )}`;
}

function docIdToStudent(docId) {
  try {
    const decoded = decodeURIComponent(docId);
    const separator = decoded.indexOf("::");
    if (separator === -1) {
      return { council: "", studentId: normalizeStudentId(decoded) };
    }
    return {
      council: normalizeCouncil(decoded.slice(0, separator)),
      studentId: normalizeStudentId(decoded.slice(separator + 2))
    };
  } catch {
    return { council: "", studentId: normalizeStudentId(docId) };
  }
}

export async function loadStudentsFromFirestore(council) {
  const code = normalizeCouncil(council);
  if (!code) return [];

  const snapshot = await getDocs(
    query(collection(db, STUDENTS_COLLECTION), where("council", "==", code))
  );

  return snapshot.docs.map((entry) => {
    const data = entry.data() || {};
    const fallback = docIdToStudent(entry.id);
    return {
      studentId: data.studentId || fallback.studentId,
      council: normalizeCouncil(data.council) || code,
      lastName: data.lastName || "",
      firstName: data.firstName || "",
      middleName: data.middleName || "",
      program: data.program || "",
      year: data.year || "",
      classification: data.classification || ""
    };
  });
}

export async function saveStudentsToFirestore(students) {
  const valid = (students || []).filter(
    (student) =>
      normalizeCouncil(student.council) && normalizeStudentId(student.studentId)
  );
  const chunks = [];

  for (let i = 0; i < valid.length; i += FIRESTORE_BATCH_SIZE) {
    chunks.push(valid.slice(i, i + FIRESTORE_BATCH_SIZE));
  }

  for (const chunk of chunks) {
    const batch = writeBatch(db);

    chunk.forEach((student) => {
      batch.set(
        doc(db, STUDENTS_COLLECTION, studentDocId(student)),
        {
          studentId: normalizeStudentId(student.studentId),
          council: normalizeCouncil(student.council),
          lastName: student.lastName || "",
          firstName: student.firstName || "",
          middleName: student.middleName || "",
          program: student.program || "",
          year: student.year || "",
          classification: student.classification || "",
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );
    });

    await batch.commit();
  }
}

export async function deleteStudentsFromFirestore() {
  const snapshot = await getDocs(collection(db, STUDENTS_COLLECTION));
  const docs = snapshot.docs;

  for (let i = 0; i < docs.length; i += FIRESTORE_BATCH_SIZE) {
    const batch = writeBatch(db);

    docs.slice(i, i + FIRESTORE_BATCH_SIZE).forEach((entry) => {
      batch.delete(entry.ref);
    });

    await batch.commit();
  }
}

export async function deleteStudentFromFirestore(student) {
  const target =
    typeof student === "string"
      ? { studentId: student, council: "" }
      : student || {};
  const code = normalizeCouncil(target.council);
  const studentId = normalizeStudentId(target.studentId);

  if (!code || !studentId) return;
  await deleteDoc(doc(db, STUDENTS_COLLECTION, studentDocId(target)));
}

export function firebaseSyncHint(error) {
  const code = String(error?.code || "").replace(/^firestore\//, "");

  if (code === "permission-denied") {
    return "Firestore denied access. Deploy the updated students rules.";
  }

  if (code === "unavailable") {
    return "Firebase is unreachable. Check your connection.";
  }

  if (code === "failed-precondition") {
    return "Firestore needs additional setup before students can sync.";
  }

  return "Firebase sync failed.";
}
