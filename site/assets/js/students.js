/* =========================================================
   TCGC PayTrack — student records (Excel / CSV import)
   Rows are stored in this browser and rendered automatically.
   ========================================================= */

(function () {
  "use strict";

  var api = window.TCGC;
  var STORAGE_KEY = "tcgc_paytrack_students";
  var session = api && api.getSession ? api.getSession() : null;
  var COUNCIL = session && session.council ? api.normalizeCouncil(session.council) : "";
  var STORE_KEY = STORAGE_KEY + (COUNCIL ? ":" + COUNCIL : "");

  function actionIcon(name) {
    var paths = {
      edit:
        '<path d="M12 20h9" />' +
        '<path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />',
      delete:
        '<path d="M3 6h18" />' +
        '<path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />' +
        '<path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />' +
        '<path d="M10 11v6M14 11v6" />'
    };

    return (
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ' +
      'aria-hidden="true">' +
      paths[name] +
      "</svg>"
    );
  }

  var fileInput = document.getElementById("students-file");
  var importButton = document.getElementById("students-import");
  var templateButton = document.getElementById("students-template");
  var searchInput = document.getElementById("students-search");
  var tableWrap = document.getElementById("students-table-wrap");
  var tableBody = document.getElementById("students-body");
  var emptyState = document.getElementById("students-empty");
  var statusEl = document.getElementById("students-status");
  var countEl = document.getElementById("students-count");

  if (!tableBody) return;

  var FIELD_ALIASES = {
    studentId: ["studentid", "studentnumber", "studentno", "studentcode", "idnumber", "id"],
    lastName: ["lastname", "surname", "familyname"],
    firstName: ["firstname", "givenname"],
    middleName: ["middlename", "middleinitial", "mi"],
    program: ["program", "course", "degree"],
    year: ["year", "yearlevel", "level"],
    classification: ["classification", "class", "category", "status"]
  };

  var COLUMN_ORDER = [
    "studentId",
    "lastName",
    "firstName",
    "middleName",
    "program",
    "year",
    "classification"
  ];

  var TEMPLATE_HEADERS = [
    "STUDENTID",
    "LASTNAME",
    "FIRSTNAME",
    "MIDDLE NAME",
    "PROGRAM",
    "YEAR",
    "CLASSIFICATION"
  ];

  /* ---------- helpers ---------- */
  function normalizeHeader(value) {
    return String(value == null ? "" : value)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
  }

  function normalizeId(value) {
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

  function readStore() {
    try {
      var raw = window.localStorage.getItem(STORE_KEY);
      var list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch (error) {
      return [];
    }
  }

  function writeStore(list) {
    try {
      window.localStorage.setItem(STORE_KEY, JSON.stringify(list));
      return true;
    } catch (error) {
      return false;
    }
  }

  function setStatus(message, state) {
    if (!statusEl) return;
    statusEl.textContent = message;
    if (state) statusEl.setAttribute("data-state", state);
    else statusEl.removeAttribute("data-state");
  }

  /* ---------- Firebase ---------- */
  function firebaseHint(error) {
    var code = error && error.code ? String(error.code) : "";
    var authError = window.TCGCFirebase && window.TCGCFirebase.authError;

    if (code === "auth" || (authError && code === "permission-denied")) {
      return "Enable Anonymous sign-in in Firebase Authentication, then reload.";
    }

    if (code === "permission-denied") {
      return "Firestore denied access. Deploy the updated students rules.";
    }

    if (code === "unavailable") {
      return "Firebase is unreachable. Check your connection.";
    }

    return error && error.message ? error.message : "Firebase sync failed.";
  }

  function mergeStudents(local, remote) {
    var byId = {};

    local.forEach(function (student) {
      byId[student.studentId] = student;
    });

    remote.forEach(function (student) {
      byId[student.studentId] = student;
    });

    return Object.keys(byId).map(function (key) {
      return byId[key];
    });
  }

  function syncImported(students, summaryText) {
    if (!window.TCGCFirebase || !window.TCGCFirebase.available) {
      setStatus(
        "Import complete: " + summaryText + ". Saved in this browser only (Firebase unavailable).",
        "success"
      );
      return;
    }

    window.TCGCFirebase.saveStudents(students)
      .then(function () {
        setStatus("Import complete: " + summaryText + ". Saved to Firebase.", "success");
      })
      .catch(function (error) {
        console.warn("[students] Firebase save failed:", error);
        setStatus(
          "Import complete: " +
            summaryText +
            ". Saved in this browser, but Firebase sync failed. " +
            firebaseHint(error),
          "error"
        );
      });
  }

  function syncFromFirebase() {
    if (!window.TCGCFirebase || !window.TCGCFirebase.available) return;

    window.TCGCFirebase.loadStudents(COUNCIL)
      .then(function (remote) {
        var local = readStore();
        var remoteIds = {};

        remote.forEach(function (student) {
          remoteIds[student.studentId] = true;
        });

        var localOnly = local.filter(function (student) {
          return !remoteIds[student.studentId];
        });

        if (remote.length) {
          var merged = mergeStudents(local, remote);
          writeStore(merged);
          render();
        }

        if (localOnly.length) {
          // Backfill records that were imported before Firebase sync existed.
          window.TCGCFirebase.saveStudents(localOnly)
            .then(function () {
              if (!statusEl.textContent.trim()) {
                setStatus(
                  "Saved " + localOnly.length + " local record(s) to Firebase.",
                  "success"
                );
              }
            })
            .catch(function (error) {
              console.warn("[students] Firebase backfill failed:", error);
              if (!statusEl.textContent.trim()) {
                setStatus(firebaseHint(error), "error");
              }
            });
        }

        if (remote.length && !statusEl.textContent.trim()) {
          setStatus("Synced " + remote.length + " record(s) from Firebase.", "success");
        }
      })
      .catch(function (error) {
        console.warn("[students] Firebase load failed:", error);

        if (!statusEl.textContent.trim()) {
          setStatus(firebaseHint(error), "error");
        }
      });
  }

  /* ---------- parsing ---------- */
  function headerScore(row) {
    var score = 0;

    (row || []).forEach(function (cell) {
      var header = normalizeHeader(cell);
      if (!header) return;

      var matched = Object.keys(FIELD_ALIASES).some(function (field) {
        return FIELD_ALIASES[field].indexOf(header) !== -1;
      });

      if (matched) score += 1;
    });

    return score;
  }

  function findHeaderRow(rows) {
    var best = { index: -1, score: 0 };
    var limit = Math.min(rows.length, 25);

    for (var i = 0; i < limit; i += 1) {
      var score = headerScore(rows[i]);
      if (score > best.score) best = { index: i, score: score };
    }

    return best.score >= 2 ? best.index : -1;
  }

  function mapColumns(headerRow) {
    var map = {};

    (headerRow || []).forEach(function (cell, index) {
      var header = normalizeHeader(cell);
      if (!header) return;

      Object.keys(FIELD_ALIASES).forEach(function (field) {
        if (map[field] == null && FIELD_ALIASES[field].indexOf(header) !== -1) {
          map[field] = index;
        }
      });
    });

    return map;
  }

  function readCell(row, index) {
    return index == null ? "" : cleanText(row[index]);
  }

  function rowsFromSheet(workbook) {
    var bestRows = null;

    workbook.SheetNames.forEach(function (name) {
      if (bestRows) return;

      var sheet = workbook.Sheets[name];
      if (!sheet) return;

      var rows = window.XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        defval: "",
        raw: false,
        blankrows: false
      });

      var headerIndex = findHeaderRow(rows);
      if (headerIndex === -1) return;

      var map = mapColumns(rows[headerIndex]);
      if (map.studentId != null && map.lastName != null && map.firstName != null) {
        bestRows = rows;
      }
    });

    return bestRows;
  }

  function importRows(rows) {
    if (!Array.isArray(rows) || !rows.length) {
      setStatus("That file looks empty. Add a header row and at least one student.", "error");
      return { ok: false };
    }

    var headerIndex = findHeaderRow(rows);
    if (headerIndex === -1) {
      setStatus(
        "No column headers found. Use the template headers: " +
          TEMPLATE_HEADERS.join(", ") +
          ".",
        "error"
      );
      return { ok: false };
    }

    var map = mapColumns(rows[headerIndex]);

    if (map.studentId == null) {
      setStatus("The file needs a STUDENTID column. Download the template for the expected layout.", "error");
      return { ok: false };
    }

    if (map.lastName == null || map.firstName == null) {
      setStatus("The file needs LASTNAME and FIRSTNAME columns. Download the template for the expected layout.", "error");
      return { ok: false };
    }

    var students = readStore();
    var indexById = {};

    students.forEach(function (student, index) {
      indexById[normalizeId(student.studentId)] = index;
    });

    var added = 0;
    var updated = 0;
    var skipped = 0;

    for (var i = headerIndex + 1; i < rows.length; i += 1) {
      var row = rows[i] || [];
      var studentId = normalizeId(readCell(row, map.studentId));

      if (!studentId) {
        skipped += 1;
        continue;
      }

      var student = {
        studentId: studentId,
        council: COUNCIL,
        lastName: readCell(row, map.lastName).toUpperCase(),
        firstName: readCell(row, map.firstName).toUpperCase(),
        middleName: readCell(row, map.middleName).toUpperCase(),
        program: readCell(row, map.program),
        year: readCell(row, map.year),
        classification: readCell(row, map.classification)
      };

      var existingIndex = indexById[studentId];

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
      setStatus("No student rows were found. Check that the STUDENTID column is filled in.", "error");
      return { ok: false };
    }

    if (!writeStore(students)) {
      setStatus(
        "Imported rows couldn't be saved because browser storage is full. Clear some records and try again.",
        "error"
      );
      return { ok: false };
    }

    var summaryText =
      added +
      " added" +
      (updated ? ", " + updated + " updated" : "") +
      (skipped ? ", " + skipped + " skipped" : "");
    var summary = summaryText + ".";

    setStatus("Import complete: " + summary, "success");

    if (api && api.toast) {
      api.toast("Import complete", summary, "success");
    }

    render();
    syncImported(students, summaryText);

    return { ok: true, added: added, updated: updated, skipped: skipped };
  }

  /* ---------- rendering ---------- */
  function sortStudents(a, b) {
    return (
      String(a.lastName || "").localeCompare(String(b.lastName || ""), "en", {
        sensitivity: "base"
      }) ||
      String(a.firstName || "").localeCompare(String(b.firstName || ""), "en", {
        sensitivity: "base"
      }) ||
      String(a.studentId || "").localeCompare(String(b.studentId || ""))
    );
  }

  function matchesQuery(student, query) {
    if (!query) return true;

    return COLUMN_ORDER.map(function (key) {
      return student[key] || "";
    })
      .join(" ")
      .toLowerCase()
      .indexOf(query) !== -1;
  }

  function render() {
    var all = readStore().sort(sortStudents);
    var query = searchInput ? searchInput.value.trim().toLowerCase() : "";
    var visible = all.filter(function (student) {
      return matchesQuery(student, query);
    });

    tableBody.innerHTML = "";

    visible.forEach(function (student) {
      var row = document.createElement("tr");

      COLUMN_ORDER.forEach(function (key) {
        var cell = document.createElement("td");
        cell.textContent = student[key] || "—";
        row.appendChild(cell);
      });

      var actionsCell = document.createElement("td");
      actionsCell.className = "cell-actions";

      var actions = document.createElement("span");
      actions.className = "row-actions";

      var editButton = document.createElement("button");
      editButton.type = "button";
      editButton.className = "row-action";
      editButton.setAttribute("data-action", "edit");
      editButton.setAttribute("data-id", student.studentId);
      editButton.setAttribute(
        "aria-label",
        "Edit " + student.firstName + " " + student.lastName
      );
      editButton.innerHTML = actionIcon("edit") + "<span>Edit</span>";

      var deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "row-action row-action--danger";
      deleteButton.setAttribute("data-action", "delete");
      deleteButton.setAttribute("data-id", student.studentId);
      deleteButton.setAttribute(
        "aria-label",
        "Delete " + student.firstName + " " + student.lastName
      );
      deleteButton.innerHTML = actionIcon("delete") + "<span>Delete</span>";

      actions.appendChild(editButton);
      actions.appendChild(deleteButton);
      actionsCell.appendChild(actions);
      row.appendChild(actionsCell);

      tableBody.appendChild(row);
    });

    if (countEl) {
      countEl.textContent = all.length + (all.length === 1 ? " student" : " students");
    }

    if (tableWrap) {
      tableWrap.hidden = visible.length === 0;
    }

    if (emptyState) {
      emptyState.hidden = visible.length !== 0;

      if (visible.length === 0) {
        emptyState.innerHTML =
          all.length === 0
            ? (COUNCIL
                ? "<p>No student records yet.</p><small>Use <strong>Import Excel</strong> or download the template to get started. Records are shared with every officer in " +
                  COUNCIL +
                  ".</small>"
                : "<p>No Council/Organization assigned.</p><small>Contact the Finance Office to assign your council or organization before importing students.</small>")
            : "<p>No students match your search.</p><small>Try a different name, ID, program, year, or classification.</small>";
      }
    }

    if (typeof window.TCGCRefreshAnalytics === "function") {
      window.TCGCRefreshAnalytics();
    }
    if (typeof window.TCGCRefreshPaymentTools === "function") {
      window.TCGCRefreshPaymentTools();
    }
  }

  /* ---------- editing & deleting ---------- */
  var editDialog = document.getElementById("student-dialog");
  var editForm = document.getElementById("student-form");
  var editError = document.getElementById("student-form-error");
  var editClose = document.getElementById("student-dialog-close");
  var editCancel = document.getElementById("student-form-cancel");
  var editFields = {
    studentId: document.getElementById("edit-student-id"),
    lastName: document.getElementById("edit-last-name"),
    firstName: document.getElementById("edit-first-name"),
    middleName: document.getElementById("edit-middle-name"),
    program: document.getElementById("edit-program"),
    year: document.getElementById("edit-year"),
    classification: document.getElementById("edit-classification")
  };
  var editingId = null;

  function findStudent(studentId) {
    var needle = normalizeId(studentId);
    var match = null;

    readStore().forEach(function (student) {
      if (!match && student.studentId === needle) match = student;
    });

    return match;
  }

  function setEditError(message) {
    if (!editError) return;
    editError.textContent = message || "";
    editError.hidden = !message;
  }

  function closeEditDialog() {
    if (!editDialog) return;
    if (typeof editDialog.close === "function") editDialog.close();
    else editDialog.removeAttribute("open");
    editingId = null;
  }

  function uppercaseField(input) {
    if (!input) return;

    input.addEventListener("input", function () {
      var start = input.selectionStart;
      var end = input.selectionEnd;
      input.value = input.value.toUpperCase();
      if (start !== null) input.setSelectionRange(start, end);
    });
  }

  function openEditDialog(studentId) {
    var student = findStudent(studentId);
    if (!student || !editDialog || !editForm) return;

    editingId = student.studentId;
    editFields.studentId.value = student.studentId;
    editFields.lastName.value = student.lastName || "";
    editFields.firstName.value = student.firstName || "";
    editFields.middleName.value = student.middleName || "";
    editFields.program.value = student.program || "";
    editFields.year.value = student.year || "";
    editFields.classification.value = student.classification || "";

    setEditError("");
    if (typeof editDialog.showModal === "function") editDialog.showModal();
    else editDialog.setAttribute("open", "open");

    window.setTimeout(function () {
      editFields.lastName.focus();
      if (editFields.lastName.select) editFields.lastName.select();
    }, 60);
  }

  function syncEditedStudent(oldId, student) {
    if (!window.TCGCFirebase || !window.TCGCFirebase.available) return;

    var tasks = [];
    if (oldId !== student.studentId && window.TCGCFirebase.deleteStudent) {
      tasks.push(window.TCGCFirebase.deleteStudent(oldId, COUNCIL));
    }
    tasks.push(window.TCGCFirebase.saveStudents([student]));

    Promise.all(tasks)
      .then(function () {
        setStatus("Student updated and saved to Firebase.", "success");
      })
      .catch(function (error) {
        console.warn("[students] Firebase update failed:", error);
        setStatus(
          "Student updated in this browser; Firebase sync failed. " +
            firebaseHint(error),
          "error"
        );
      });
  }

  function deleteStudentRecord(studentId) {
    var student = findStudent(studentId);
    if (!student) return;

    var label =
      (student.firstName + " " + student.lastName).trim() +
      " (" +
      student.studentId +
      ")";

    if (!window.confirm("Delete " + label + "?")) return;

    var remaining = readStore().filter(function (entry) {
      return entry.studentId !== student.studentId;
    });

    if (!writeStore(remaining)) {
      setStatus("Couldn't delete that record. Please try again.", "error");
      return;
    }

    render();
    setStatus("Student deleted.", "success");

    if (
      window.TCGCFirebase &&
      window.TCGCFirebase.available &&
      window.TCGCFirebase.deleteStudent
    ) {
      window.TCGCFirebase.deleteStudent(student.studentId, COUNCIL)
        .then(function () {
          setStatus("Student deleted from this browser and Firebase.", "success");
        })
        .catch(function (error) {
          console.warn("[students] Firebase delete failed:", error);
          setStatus(
            "Student deleted in this browser; Firebase delete failed. " +
              firebaseHint(error),
            "error"
          );
        });
    }
  }

  if (editForm) {
    editForm.addEventListener("submit", function (event) {
      event.preventDefault();
      if (!editingId) return;

      var studentId = normalizeId(editFields.studentId.value);
      var lastName = editFields.lastName.value.trim().toUpperCase();
      var firstName = editFields.firstName.value.trim().toUpperCase();
      var middleName = editFields.middleName.value.trim().toUpperCase();

      if (!studentId) {
        setEditError("Student ID is required.");
        editFields.studentId.focus();
        return;
      }

      if (!lastName || !firstName) {
        setEditError("Last name and first name are required.");
        (lastName ? editFields.firstName : editFields.lastName).focus();
        return;
      }

      var store = readStore();
      var duplicate = store.some(function (entry) {
        return entry.studentId === studentId && entry.studentId !== editingId;
      });

      if (duplicate) {
        setEditError("Another student already uses that Student ID.");
        editFields.studentId.focus();
        return;
      }

      var index = -1;
      store.forEach(function (entry, i) {
        if (entry.studentId === editingId) index = i;
      });

      if (index === -1) {
        setEditError("That record no longer exists.");
        return;
      }

      var oldId = editingId;
      var updated = {
        studentId: studentId,
        council: COUNCIL,
        lastName: lastName,
        firstName: firstName,
        middleName: middleName,
        program: editFields.program.value.trim(),
        year: editFields.year.value.trim(),
        classification: editFields.classification.value.trim()
      };

      store[index] = updated;

      if (!writeStore(store)) {
        setEditError("Couldn't save the changes. Browser storage may be full.");
        return;
      }

      render();
      closeEditDialog();
      setStatus("Student updated.", "success");
      syncEditedStudent(oldId, updated);
    });
  }

  if (editClose) editClose.addEventListener("click", closeEditDialog);
  if (editCancel) editCancel.addEventListener("click", closeEditDialog);

  if (editDialog) {
    editDialog.addEventListener("click", function (event) {
      if (event.target === editDialog) closeEditDialog();
    });

    editDialog.addEventListener("close", function () {
      editingId = null;
    });
  }

  if (editFields.studentId) uppercaseField(editFields.studentId);
  if (editFields.lastName) uppercaseField(editFields.lastName);
  if (editFields.firstName) uppercaseField(editFields.firstName);
  if (editFields.middleName) uppercaseField(editFields.middleName);

  /* ---------- file import ---------- */
  function importFile(file) {
    if (!file) return;

    if (!window.XLSX) {
      setStatus("Excel support didn't load. Reload the page and try again.", "error");
      return;
    }

    if (file.size > 12 * 1024 * 1024) {
      setStatus("That file is too large. Keep it under 12 MB.", "error");
      return;
    }

    setStatus("Reading " + file.name + "…");

    var reader = new FileReader();

    reader.onload = function (event) {
      try {
        var workbook = window.XLSX.read(new Uint8Array(event.target.result), {
          type: "array"
        });
        var rows = rowsFromSheet(workbook);

        if (!rows) {
          setStatus(
            "No student sheet found. The first rows need STUDENTID, LASTNAME, and FIRSTNAME headers.",
            "error"
          );
          return;
        }

        importRows(rows);
      } catch (error) {
        console.error("[students] Could not read file:", error);
        setStatus(
          "We couldn't read that file. Save it as .xlsx, .xls, or .csv and try again.",
          "error"
        );
      }
    };

    reader.onerror = function () {
      setStatus("The file couldn't be read. Please try again.", "error");
    };

    reader.readAsArrayBuffer(file);
  }

  /* ---------- template ---------- */
  function downloadTemplate() {
    var lines = [TEMPLATE_HEADERS.join(",")];

    var blob = new Blob(["\uFEFF" + lines.join("\r\n")], {
      type: "text/csv;charset=utf-8"
    });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");

    link.href = url;
    link.download = "tcgc-students-template.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    window.setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 1000);

    setStatus("Template downloaded. Fill it in, then import it.", "success");
  }

  /* ---------- events ---------- */
  if (importButton && fileInput) {
    importButton.addEventListener("click", function () {
      if (!COUNCIL) {
        setStatus(
          "Your account has no Council/Organization assigned. Contact the Finance Office.",
          "error"
        );
        return;
      }
      if (!window.XLSX) {
        setStatus("Excel support didn't load. Reload the page and try again.", "error");
        return;
      }
      fileInput.click();
    });
  }

  if (fileInput) {
    fileInput.addEventListener("change", function () {
      var file = fileInput.files && fileInput.files[0];
      if (file) importFile(file);
      fileInput.value = "";
    });
  }

  if (templateButton) {
    templateButton.addEventListener("click", downloadTemplate);
  }

  if (searchInput) {
    searchInput.addEventListener("input", render);
  }

  if (tableBody) {
    tableBody.addEventListener("click", function (event) {
      var button =
        event.target && event.target.closest
          ? event.target.closest("[data-action]")
          : null;
      if (!button) return;

      var studentId = button.getAttribute("data-id");
      var action = button.getAttribute("data-action");

      if (action === "edit") openEditDialog(studentId);
      else if (action === "delete") deleteStudentRecord(studentId);
    });
  }

  render();
  syncFromFirebase();

  if (!COUNCIL) {
    setStatus(
      "Your account has no Council/Organization assigned. Contact the Finance Office.",
      "error"
    );
  }

  // Exposed for console use and automated checks.
  window.TCGCStudents = {
    importRows: importRows,
    getStudents: readStore,
    render: render,
    sync: syncFromFirebase
  };
})();
