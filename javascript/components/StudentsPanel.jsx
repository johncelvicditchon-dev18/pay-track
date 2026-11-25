import { useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "../context/ToastContext";
import { normalizeCouncil } from "../data/councils";
import {
  STUDENT_COLUMNS,
  buildTemplateCsv,
  deleteStudentFromFirestore,
  filterStudents,
  firebaseSyncHint,
  importStudentRows,
  importSummary,
  loadStudents,
  loadStudentsFromFirestore,
  normalizeStudentId,
  rowsFromWorkbook,
  saveStudents,
  saveStudentsToFirestore,
  sortStudents
} from "../lib/students";

const MAX_FILE_SIZE = 12 * 1024 * 1024;

const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": "true",
};

function UploadIcon() {
  return (
    <svg {...iconProps}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M12 3v13" />
      <path d="m7 8 5-5 5 5" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg {...iconProps}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M12 3v13" />
      <path d="m7 13 5 5 5-5" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg {...iconProps}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg {...iconProps}>
      <path d="M3 6h18" />
      <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg {...iconProps} strokeWidth={2.2}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export default function StudentsPanel({ council }) {
  const toast = useToast();
  const fileRef = useRef(null);
  const dialogRef = useRef(null);
  const activeCouncil = normalizeCouncil(council);

  const [students, setStudents] = useState(() => loadStudents(activeCouncil));
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState("");
  const [importing, setImporting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({
    studentId: "",
    lastName: "",
    firstName: "",
    middleName: "",
    program: "",
    year: "",
    classification: ""
  });

  useEffect(() => {
    if (!editingId) return;

    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();

      const input = dialog.querySelector("#react-edit-last-name");
      if (input) {
        input.focus();
        input.select?.();
      }
    }
  }, [editingId]);

  useEffect(() => {
    let active = true;

    setStudents(loadStudents(activeCouncil));
    setMessage("");
    setTone("");

    if (!activeCouncil) {
      setMessage(
        "Your account has no Council/Organization assigned. Contact the Finance Office."
      );
      setTone("error");
      return () => {
        active = false;
      };
    }

    loadStudentsFromFirestore(activeCouncil)
      .then((remote) => {
        if (!active) return;

        const local = loadStudents(activeCouncil);
        const remoteIds = new Set(remote.map((student) => student.studentId));
        const localOnly = local.filter(
          (student) => !remoteIds.has(student.studentId)
        );
        const byId = new Map();

        local.forEach((student) => byId.set(student.studentId, student));
        remote.forEach((student) => byId.set(student.studentId, student));

        const merged = Array.from(byId.values());
        saveStudents(merged, activeCouncil);
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
  }, [activeCouncil]);

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

  const openEdit = (student) => {
    setEditingId(student.studentId);
    setForm({
      studentId: student.studentId || "",
      lastName: student.lastName || "",
      firstName: student.firstName || "",
      middleName: student.middleName || "",
      program: student.program || "",
      year: student.year || "",
      classification: student.classification || ""
    });
    setFormError("");
  };

  const closeEdit = () => {
    if (dialogRef.current && dialogRef.current.open) {
      dialogRef.current.close();
    }
    setEditingId(null);
  };

  const updateField = (key, value) => {
    const upper = ["studentId", "lastName", "firstName", "middleName"].includes(
      key
    );

    setForm((current) => ({
      ...current,
      [key]: upper ? value.toUpperCase() : value
    }));

    if (formError) setFormError("");
  };

  const handleEditSubmit = (event) => {
    event.preventDefault();
    if (!editingId) return;

    const studentId = normalizeStudentId(form.studentId);
    const lastName = form.lastName.trim().toUpperCase();
    const firstName = form.firstName.trim().toUpperCase();
    const middleName = form.middleName.trim().toUpperCase();

    if (!studentId || !lastName || !firstName) {
      setFormError("Student ID, last name, and first name are required.");
      return;
    }

    const duplicate = students.some(
      (student) => student.studentId === studentId && student.studentId !== editingId
    );

    if (duplicate) {
      setFormError("Another student already uses that Student ID.");
      return;
    }

    const index = students.findIndex((student) => student.studentId === editingId);
    if (index === -1) {
      setFormError("That record no longer exists.");
      return;
    }

    const oldId = editingId;
    const updated = {
      studentId,
      council: activeCouncil,
      lastName,
      firstName,
      middleName,
      program: form.program.trim(),
      year: form.year.trim(),
      classification: form.classification.trim()
    };

    const next = students.slice();
    next[index] = updated;

    if (!saveStudents(next, activeCouncil)) {
      setFormError("Couldn't save the changes. Browser storage may be full.");
      return;
    }

    setStudents(next);
    closeEdit();
    report("Student updated.", "success");

    const tasks = [];
    if (oldId !== studentId) {
      tasks.push(
        deleteStudentFromFirestore({
          studentId: oldId,
          council: activeCouncil
        })
      );
    }
    tasks.push(saveStudentsToFirestore([updated]));

    Promise.all(tasks)
      .then(() => {
        report("Student updated and saved to Firebase.", "success");
      })
      .catch((error) => {
        console.warn("[students] Firebase update failed:", error);
        report(
          "Student updated in this browser; Firebase sync failed. " +
            firebaseSyncHint(error),
          "error"
        );
      });
  };

  const handleDelete = (student) => {
    const label = `${student.firstName} ${student.lastName} (${student.studentId})`.trim();
    if (!window.confirm(`Delete ${label}?`)) return;

    const next = students.filter(
      (entry) => entry.studentId !== student.studentId
    );

    if (!saveStudents(next, activeCouncil)) {
      report("Couldn't delete that record. Please try again.", "error");
      return;
    }

    setStudents(next);
    report("Student deleted.", "success");

    deleteStudentFromFirestore(student)
      .then(() => {
        report("Student deleted from this browser and Firebase.", "success");
      })
      .catch((error) => {
        console.warn("[students] Firebase delete failed:", error);
        report(
          "Student deleted in this browser; Firebase delete failed. " +
            firebaseSyncHint(error),
          "error"
        );
      });
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

      const result = importStudentRows(rows, students, activeCouncil);

      if (!result.ok) {
        report(result.error, "error");
        return;
      }

      if (!saveStudents(result.students, activeCouncil)) {
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
            disabled={importing || !activeCouncil}
          >
            <UploadIcon />
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
            <DownloadIcon />
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
                    <th scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((student) => (
                    <tr key={student.studentId}>
                      {STUDENT_COLUMNS.map((column) => (
                        <td key={column.key}>{student[column.key] || "—"}</td>
                      ))}
                      <td className="cell-actions">
                        <span className="row-actions">
                          <button
                            className="row-action"
                            type="button"
                            onClick={() => openEdit(student)}
                            aria-label={`Edit ${student.firstName} ${student.lastName}`}
                          >
                            <EditIcon />
                            Edit
                          </button>
                          <button
                            className="row-action row-action--danger"
                            type="button"
                            onClick={() => handleDelete(student)}
                            aria-label={`Delete ${student.firstName} ${student.lastName}`}
                          >
                            <DeleteIcon />
                            Delete
                          </button>
                        </span>
                      </td>
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
              <p>
                {activeCouncil
                  ? "No student records yet."
                  : "No Council/Organization assigned."}
              </p>
              <small>
                {activeCouncil ? (
                  <>
                    Use <strong>Import Excel</strong> or download the template to
                    get started. Records are shared with every officer account in{" "}
                    {activeCouncil}.
                  </>
                ) : (
                  "Contact the Finance Office to assign your council or organization before importing students."
                )}
              </small>
            </>
          )}
        </div>
      )}

      <dialog
        className="edit-dialog"
        ref={dialogRef}
        aria-labelledby="react-edit-student-title"
        onClose={() => setEditingId(null)}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeEdit();
        }}
      >
        <form className="edit-form" onSubmit={handleEditSubmit} noValidate>
          <header className="edit-form__head">
            <h2 id="react-edit-student-title">Edit student</h2>
            <button
              className="edit-form__close"
              type="button"
              onClick={closeEdit}
              aria-label="Close"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </header>

          <div className="edit-grid">
            <div className="field">
              <label htmlFor="react-edit-student-id">Student ID</label>
              <input
                type="text"
                id="react-edit-student-id"
                value={form.studentId}
                onChange={(event) => updateField("studentId", event.target.value)}
                autoComplete="off"
                spellCheck="false"
                required
              />
            </div>
            <div className="field">
              <label htmlFor="react-edit-last-name">Last name</label>
              <input
                type="text"
                id="react-edit-last-name"
                value={form.lastName}
                onChange={(event) => updateField("lastName", event.target.value)}
                autoComplete="off"
                required
              />
            </div>
            <div className="field">
              <label htmlFor="react-edit-first-name">First name</label>
              <input
                type="text"
                id="react-edit-first-name"
                value={form.firstName}
                onChange={(event) => updateField("firstName", event.target.value)}
                autoComplete="off"
                required
              />
            </div>
            <div className="field">
              <label htmlFor="react-edit-middle-name">Middle name</label>
              <input
                type="text"
                id="react-edit-middle-name"
                value={form.middleName}
                onChange={(event) => updateField("middleName", event.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="field">
              <label htmlFor="react-edit-program">Program</label>
              <input
                type="text"
                id="react-edit-program"
                value={form.program}
                onChange={(event) => updateField("program", event.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="field">
              <label htmlFor="react-edit-year">Year</label>
              <input
                type="text"
                id="react-edit-year"
                value={form.year}
                onChange={(event) => updateField("year", event.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="field">
              <label htmlFor="react-edit-classification">Classification</label>
              <input
                type="text"
                id="react-edit-classification"
                value={form.classification}
                onChange={(event) =>
                  updateField("classification", event.target.value)
                }
                autoComplete="off"
              />
            </div>
          </div>

          {formError ? (
            <p className="edit-form__error" role="alert">
              {formError}
            </p>
          ) : null}

          <footer className="edit-form__actions">
            <button
              className="btn btn--outline btn--sm"
              type="button"
              onClick={closeEdit}
            >
              Cancel
            </button>
            <button className="btn btn--primary btn--sm" type="submit">
              <CheckIcon />
              Save changes
            </button>
          </footer>
        </form>
      </dialog>
    </section>
  );
}
