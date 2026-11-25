import { useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "../context/ToastContext";
import {
  STUDENT_COLUMNS,
  buildTemplateCsv,
  filterStudents,
  firebaseSyncHint,
  importStudentRows,
  importSummary,
  loadStudents,
  loadStudentsFromFirestore,
  rowsFromWorkbook,
  saveStudents,
  saveStudentsToFirestore,
  sortStudents
} from "../lib/students";

const MAX_FILE_SIZE = 12 * 1024 * 1024;

export default function StudentsPanel() {
  const toast = useToast();
  const fileRef = useRef(null);

  const [students, setStudents] = useState(loadStudents);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState("");
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    let active = true;

    loadStudentsFromFirestore()
      .then((remote) => {
        if (!active) return;

        const local = loadStudents();
        const remoteIds = new Set(remote.map((student) => student.studentId));
        const localOnly = local.filter(
          (student) => !remoteIds.has(student.studentId)
        );
        const byId = new Map();

        local.forEach((student) => byId.set(student.studentId, student));
        remote.forEach((student) => byId.set(student.studentId, student));

        const merged = Array.from(byId.values());
        saveStudents(merged);
        setStudents(merged);

        if (remote.length) {
          setMessage("Synced with Firebase.");
          setTone("success");
        }

        if (localOnly.length) {
          // Backfill records that were imported before Firebase sync existed.
          saveStudentsToFirestore(localOnly)
            .then(() => {
              if (active && !remote.length) {
                setMessage(
                  `Saved ${localOnly.length} local record(s) to Firebase.`
                );
                setTone("success");
              }
            })
            .catch((error) => {
              if (!active) return;
              console.warn("[students] Firebase backfill failed:", error);
              setMessage(firebaseSyncHint(error));
              setTone("error");
            });
        }
      })
      .catch((error) => {
        if (!active) return;
        console.warn("[students] Firebase load failed:", error);
        setMessage(firebaseSyncHint(error));
        setTone("error");
      });

    return () => {
      active = false;
    };
  }, []);

  const visible = useMemo(
    () => filterStudents(sortStudents(students), query),
    [students, query]
  );

  const report = (text, nextTone = "") => {
    setMessage(text);
    setTone(nextTone);
  };

  const handleImportClick = () => {
    if (importing) return;
    fileRef.current?.click();
  };

  const handleFile = async (event) => {
    const input = event.target;
    const file = input.files && input.files[0];
    input.value = "";
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      report("That file is too large. Keep it under 12 MB.", "error");
      return;
    }

    setImporting(true);
    report(`Reading ${file.name}…`);

    try {
      const XLSX = await import("xlsx");
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(new Uint8Array(buffer), { type: "array" });
      const rows = rowsFromWorkbook(XLSX, workbook);

      if (!rows) {
        report(
          "No student sheet found. The first rows need STUDENTID, LASTNAME, and FIRSTNAME headers.",
          "error"
        );
        return;
      }

      const result = importStudentRows(rows, students);

      if (!result.ok) {
        report(result.error, "error");
        return;
      }

      if (!saveStudents(result.students)) {
        report(
          "Imported rows couldn't be saved because browser storage is full. Clear some records and try again.",
          "error"
        );
        return;
      }

      const summary = importSummary(result);
      setStudents(result.students);
      report(`Import complete: ${summary}`, "success");
      toast("Import complete", summary, "success");

      saveStudentsToFirestore(result.students)
        .then(() => {
          report(`Import complete: ${summary} Saved to Firebase.`, "success");
        })
        .catch((error) => {
          console.warn("[students] Firebase save failed:", error);
          report(
            `Import complete: ${summary} Saved locally; Firebase sync failed. ${firebaseSyncHint(
              error
            )}`,
            "error"
          );
        });
    } catch (error) {
      console.error("[students] Could not read file:", error);
      report(
        "We couldn't read that file. Save it as .xlsx, .xls, or .csv and try again.",
        "error"
      );
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const blob = new Blob(["\uFEFF" + buildTemplateCsv()], {
      type: "text/csv;charset=utf-8"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "tcgc-students-template.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    report("Template downloaded. Fill it in, then import it.", "success");
  };

  return (
    <section className="dash-view" aria-label="Students">
      <div className="view-head">
        <div>
          <h1>Students</h1>
        </div>
        <span className="dash-count">
          {students.length} {students.length === 1 ? "student" : "students"}
        </span>
      </div>

      <div className="records-toolbar">
        <div className="records-actions">
          <button
            className="btn btn--primary btn--sm"
            type="button"
            onClick={handleImportClick}
            disabled={importing}
          >
            {importing ? "Importing…" : "Import Excel"}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            hidden
            onChange={handleFile}
          />
          <button
            className="btn btn--outline btn--sm"
            type="button"
            onClick={downloadTemplate}
          >
            Download template
          </button>
        </div>

        <label className="records-search">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m21 21-4.3-4.3" />
            <circle cx="10.5" cy="10.5" r="7.5" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search students"
            autoComplete="off"
            aria-label="Search students"
          />
        </label>
      </div>

      {message ? (
        <p className="records-status" data-state={tone || undefined} role="status">
          {message}
        </p>
      ) : null}

      {visible.length ? (
        <>
          <div className="accounts-table-wrap">
            <div className="accounts-table-scroll">
              <table className="accounts-table students-table">
                <thead>
                  <tr>
                    {STUDENT_COLUMNS.map((column) => (
                      <th key={column.key} scope="col">
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visible.map((student) => (
                    <tr key={student.studentId}>
                      {STUDENT_COLUMNS.map((column) => (
                        <td key={column.key}>{student[column.key] || "—"}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="records-empty">
          {students.length ? (
            <>
              <p>No students match your search.</p>
              <small>
                Try a different name, ID, program, year, or classification.
              </small>
            </>
          ) : (
            <>
              <p>No student records yet.</p>
              <small>
                Use <strong>Import Excel</strong> or download the template to get
                started.
              </small>
            </>
          )}
        </div>
      )}
    </section>
  );
}
