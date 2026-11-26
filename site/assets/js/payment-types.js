/* =========================================================
   TCGC PayTrack — payment types and charge posting (officers)
   ========================================================= */

(function () {
  "use strict";

  var api = window.TCGC;
  if (!api) return;

  var session = api.getSession ? api.getSession() : null;
  var COUNCIL = session && session.council ? api.normalizeCouncil(session.council) : "";

  var typeForm = document.getElementById("type-form");
  var typeSemester = document.getElementById("type-semester");
  var typeYear = document.getElementById("type-year");
  var typeName = document.getElementById("type-name");
  var typeScope = document.getElementById("type-scope");
  var typeCategory = document.getElementById("type-category");
  var typeHint = document.getElementById("type-hint");
  var typeList = document.getElementById("type-list");

  var chargeForm = document.getElementById("charge-form");
  var chargeStudent = document.getElementById("charge-student");
  var chargeType = document.getElementById("charge-type");
  var chargeAmount = document.getElementById("charge-amount");
  var chargePaid = document.getElementById("charge-paid");
  var chargeDue = document.getElementById("charge-due");
  var chargeHint = document.getElementById("charge-hint");

  if (!typeForm || !chargeForm) return;

  var types = [];
  var students = [];

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function setHint(element, message, tone) {
    if (!element) return;
    element.textContent = message || "";
    element.setAttribute("data-state", tone || "");
  }

  function studentLabel(student) {
    var name = [student.lastName, student.firstName, student.middleName]
      .filter(Boolean)
      .join(", ")
      .trim();
    return (name || "Student") + " · " + student.studentId;
  }

  function fillTypeSelect() {
    if (!chargeType) return;

    if (!types.length) {
      chargeType.innerHTML =
        '<option value="" disabled selected>Create a payment type first</option>';
      return;
    }

    chargeType.innerHTML =
      '<option value="" disabled selected>Select a payment type</option>' +
      types
        .map(function (type) {
          return (
            '<option value="' + esc(type.id) + '">' + esc(type.label) + "</option>"
          );
        })
        .join("");
  }

  function renderTypes() {
    if (!typeList) return;

    if (!types.length) {
      typeList.innerHTML =
        '<li class="type-list__empty">No payment types yet for ' +
        esc(COUNCIL || "this council") +
        ".</li>";
      return;
    }

    typeList.innerHTML = types
      .map(function (type) {
        return (
          '<li class="type-list__item" data-type-id="' +
          esc(type.id) +
          '">' +
          "<span><strong>" +
          esc(type.label) +
          "</strong><small>" +
          esc(type.scope || "—") +
          " · " +
          esc(type.category || "—") +
          "</small></span>" +
          '<button class="row-action row-action--danger" type="button" data-delete-type="' +
          esc(type.id) +
          '">Delete</button>' +
          "</li>"
        );
      })
      .join("");
  }

  function loadTypes() {
    if (!COUNCIL) {
      setHint(
        typeHint,
        "Your account has no Council/Organization assigned.",
        "error"
      );
      return;
    }

    window.TCGCFirebase.listPaymentTypes(COUNCIL)
      .then(function (rows) {
        types = rows || [];
        renderTypes();
        fillTypeSelect();
      })
      .catch(function (error) {
        console.warn("[payment-types] Could not load types:", error);
        setHint(
          typeHint,
          "Couldn't load payment types. Deploy the Firestore rules and try again.",
          "error"
        );
      });
  }

  function loadStudents() {
    if (!chargeStudent) return;

    students =
      window.TCGCStudents && window.TCGCStudents.getStudents
        ? window.TCGCStudents.getStudents()
        : [];

    if (!students.length) {
      chargeStudent.innerHTML =
        '<option value="" disabled selected>No students in your council yet</option>';
      return;
    }

    chargeStudent.innerHTML =
      '<option value="" disabled selected>Select a student</option>' +
      students
        .map(function (student) {
          return (
            '<option value="' +
            esc(student.studentId) +
            '">' +
            esc(studentLabel(student)) +
            "</option>"
          );
        })
        .join("");
  }

  if (typeForm) {
    typeForm.addEventListener("submit", function (event) {
      event.preventDefault();
      if (!COUNCIL) {
        setHint(
          typeHint,
          "Your account has no Council/Organization assigned.",
          "error"
        );
        return;
      }

      var semester = typeSemester ? typeSemester.value : "";
      var year = typeYear ? typeYear.value.trim() : "";
      var name = typeName ? typeName.value.trim().toUpperCase() : "";

      if (!year || !/^\d{4}\s*-\s*\d{4}$/.test(year)) {
        setHint(typeHint, "Use an academic year like 2026-2027.", "error");
        if (typeYear) typeYear.focus();
        return;
      }

      if (!name) {
        setHint(typeHint, "Enter the payment name.", "error");
        if (typeName) typeName.focus();
        return;
      }

      var label = semester + " - " + year + " | " + name;
      var submit = typeForm.querySelector('button[type="submit"]');
      if (submit) submit.disabled = true;

      window.TCGCFirebase.createPaymentType({
        label: label,
        semester: semester,
        academicYear: year,
        name: name,
        scope: typeScope ? typeScope.value : "Organization",
        category: typeCategory ? typeCategory.value : "Membership",
        council: COUNCIL,
        createdAt: new Date().toISOString()
      })
        .then(function () {
          if (typeName) typeName.value = "";
          setHint(typeHint, "Payment type created: " + label, "success");
          loadTypes();
        })
        .catch(function (error) {
          console.warn("[payment-types] Create failed:", error);
          setHint(
            typeHint,
            "Couldn't create the payment type. Check your session and Firestore rules.",
            "error"
          );
        })
        .then(function () {
          if (submit) submit.disabled = false;
        });
    });
  }

  if (typeList) {
    typeList.addEventListener("click", function (event) {
      var button =
        event.target && event.target.closest
          ? event.target.closest("[data-delete-type]")
          : null;
      if (!button) return;

      var typeId = button.getAttribute("data-delete-type");
      var type = types.filter(function (item) {
        return item.id === typeId;
      })[0];

      if (!window.confirm("Delete payment type “" + (type ? type.label : "") + "”?")) {
        return;
      }

      window.TCGCFirebase.deletePaymentType(typeId)
        .then(function () {
          setHint(typeHint, "Payment type deleted.", "success");
          loadTypes();
        })
        .catch(function (error) {
          console.warn("[payment-types] Delete failed:", error);
          setHint(typeHint, "Couldn't delete that payment type.", "error");
        });
    });
  }

  if (chargeForm) {
    chargeForm.addEventListener("submit", function (event) {
      event.preventDefault();
      if (!COUNCIL) return;

      var studentId = chargeStudent ? chargeStudent.value : "";
      var typeId = chargeType ? chargeType.value : "";
      var amount = chargeAmount ? Number(chargeAmount.value) : 0;
      var paid = chargePaid ? Number(chargePaid.value) : 0;
      var dueDate = chargeDue ? chargeDue.value : "";

      var student = students.filter(function (item) {
        return api.normalizeStudentId(item.studentId) === studentId;
      })[0];
      var type = types.filter(function (item) {
        return item.id === typeId;
      })[0];

      if (!student) {
        setHint(chargeHint, "Select a student.", "error");
        return;
      }
      if (!type) {
        setHint(chargeHint, "Select a payment type.", "error");
        return;
      }
      if (!(amount > 0)) {
        setHint(chargeHint, "Enter an amount greater than zero.", "error");
        return;
      }
      if (!dueDate) {
        setHint(chargeHint, "Select a due date.", "error");
        return;
      }

      var submit = chargeForm.querySelector('button[type="submit"]');
      if (submit) submit.disabled = true;

      window.TCGCFirebase.addCharge({
        council: COUNCIL,
        studentId: studentId,
        student: student,
        type: type,
        amount: amount,
        paid: paid,
        dueDate: dueDate
      })
        .then(function () {
          setHint(
            chargeHint,
            "Charge posted to " + studentLabel(student) + ".",
            "success"
          );
          if (chargeAmount) chargeAmount.value = "";
          if (chargePaid) chargePaid.value = "0";
          if (chargeDue) chargeDue.value = "";
          if (typeof window.TCGCRefreshPayments === "function") {
            window.TCGCRefreshPayments();
          }
        })
        .catch(function (error) {
          console.warn("[payment-types] Charge failed:", error);
          setHint(
            chargeHint,
            "Couldn't save the charge. Deploy the Firestore rules and try again.",
            "error"
          );
        })
        .then(function () {
          if (submit) submit.disabled = false;
        });
    });
  }

  function refresh() {
    loadTypes();
    loadStudents();
  }

  window.TCGCRefreshPaymentTools = refresh;
  refresh();
})();
