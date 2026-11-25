/* =========================================================
   TCGC PayTrack — student records (Excel / CSV import)
   Rows are stored in this browser and rendered automatically.
   ========================================================= */

(function () {
  "use strict";

  var api = window.TCGC;
  var STORAGE_KEY = "tcgc_paytrack_students";

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
      var raw = window.localStorage.getItem(STORAGE_KEY);
      var list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch (error) {
      return [];
    }
  }

  function writeStore(list) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
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

    window.TCGCFirebase.loadStudents()
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
            ? "<p>No student records yet.</p><small>Use <strong>Import Excel</strong> or download the template to get started.</small>"
            : "<p>No students match your search.</p><small>Try a different name, ID, program, year, or classification.</small>";
      }
    }
  }

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
    var lines = [
      TEMPLATE_HEADERS.join(","),
      "2024-00123,SANTOS,MARIA,CRUZ,BS Information Technology,4TH YEAR,REGULAR",
      "2024-00124,DELA CRUZ,JUAN,REYES,BS Computer Science,3RD YEAR,IRREGULAR"
    ];

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

  render();
  syncFromFirebase();

  // Exposed for console use and automated checks.
  window.TCGCStudents = {
    importRows: importRows,
    getStudents: readStore,
    render: render,
    sync: syncFromFirebase
  };
})();
