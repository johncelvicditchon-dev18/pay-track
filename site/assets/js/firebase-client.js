/* =========================================================
   TCGC PayTrack — Firestore client for the static dashboard
   Uses the Firestore REST API (no SDK bundle). Writes the
   imported class list to the shared "students" collection.
   ========================================================= */

(function () {
  "use strict";

  var PROJECT_ID = "tcgc-payment-tracking-system";
  var API_KEY = "AIzaSyB0CH4x8ORDadrG2Q7J8v4DR7Mj3UGCZ2M";
  var COLLECTION = "students";
  var PAYMENTS_COLLECTION = "paymentRecords";
  var TYPES_COLLECTION = "paymentTypes";
  var BATCH_SIZE = 450;
  var BASE_URL =
    "https://firestore.googleapis.com/v1/projects/" +
    PROJECT_ID +
    "/databases/(default)/documents";
  var KEY_PARAM = "?key=" + API_KEY;

  var token = null;
  var tokenPromise = null;

  var client = {
    available: typeof window.fetch === "function",
    authError: null
  };

  client.setAuthToken = function (value) {
    token = value || null;
    tokenPromise = value ? Promise.resolve(value) : null;
    return client;
  };

  // Reuse the signed-in account's token when the page reloads.
  try {
    var storedSession =
      window.localStorage.getItem("tcgc_paytrack_session") ||
      window.sessionStorage.getItem("tcgc_paytrack_session");
    var storedSessionData = storedSession ? JSON.parse(storedSession) : null;
    if (storedSessionData && storedSessionData.idToken) {
      client.setAuthToken(storedSessionData.idToken);
    }
  } catch (error) {
    /* ignore unreadable sessions */
  }

  function makeError(message, code) {
    var error = new Error(message || "Firebase request failed.");
    error.code = code || "unknown";
    return error;
  }

  function statusCodeToError(response) {
    if (response.status === 401 || response.status === 403) {
      return "permission-denied";
    }
    if (response.status === 404) return "not-found";
    if (response.status === 429) return "resource-exhausted";
    if (response.status >= 500) return "unavailable";
    return "invalid-argument";
  }

  // Anonymous sign-in is only needed when the deployed rules require auth.
  // If it is disabled, requests continue unauthenticated (test-mode rules).
  function ensureToken() {
    if (token) return Promise.resolve(token);

    if (!tokenPromise) {
      tokenPromise = window
        .fetch(
          "https://identitytoolkit.googleapis.com/v1/accounts:signUp" + KEY_PARAM,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ returnSecureToken: true })
          }
        )
        .then(function (response) {
          return response.json().then(function (data) {
            if (!response.ok) {
              throw makeError(
                (data.error && data.error.message) || "Anonymous sign-in failed.",
                "auth"
              );
            }
            token = data.idToken || null;
            return token;
          });
        })
        .catch(function (error) {
          tokenPromise = null;
          client.authError = error;
          console.warn("[firebase] Anonymous sign-in unavailable:", error.message);
          return null;
        });
    }

    return tokenPromise;
  }

  function readJson(response) {
    return response
      .json()
      .catch(function () {
        return {};
      })
      .then(function (data) {
        if (!response.ok) {
          throw makeError(
            (data.error && data.error.message) || "Firestore request failed.",
            statusCodeToError(response)
          );
        }
        return data;
      });
  }

  function perform(url, options, authToken) {
    var settings = options || {};
    var headers = { "Content-Type": "application/json" };

    if (authToken) {
      headers.Authorization = "Bearer " + authToken;
    }

    settings.headers = Object.assign({}, headers, settings.headers || {});

    return window
      .fetch(url, settings)
      .catch(function (error) {
        throw makeError(error.message, "unavailable");
      })
      .then(readJson);
  }

  function request(url, options) {
    // Try without auth first (works while Firestore is in test mode). If the
    // rules reject it, sign in anonymously and retry once.
    return perform(url, options, token).catch(function (error) {
      if (error.code !== "permission-denied") throw error;

      token = null;
      tokenPromise = null;

      return ensureToken().then(function (authToken) {
        if (!authToken) throw error;
        return perform(url, options, authToken);
      });
    });
  }

  function studentDocName(council, studentId) {
    var docId = String(council || "").toUpperCase() + "::" + String(studentId || "");
    return (
      "projects/" +
      PROJECT_ID +
      "/databases/(default)/documents/" +
      COLLECTION +
      "/" +
      encodeURIComponent(docId)
    );
  }

  function studentFields(student) {
    return {
      studentId: { stringValue: String(student.studentId || "") },
      council: { stringValue: String(student.council || "").toUpperCase() },
      lastName: { stringValue: student.lastName || "" },
      firstName: { stringValue: student.firstName || "" },
      middleName: { stringValue: student.middleName || "" },
      program: { stringValue: student.program || "" },
      year: { stringValue: student.year || "" },
      classification: { stringValue: student.classification || "" },
      updatedAt: { timestampValue: new Date().toISOString() }
    };
  }

  function fieldValue(fields, key) {
    var field = fields && fields[key];
    return field && typeof field.stringValue === "string" ? field.stringValue : "";
  }

  function decodeValue(value) {
    if (!value) return null;
    if (typeof value.stringValue === "string") return value.stringValue;
    if (typeof value.booleanValue === "boolean") return value.booleanValue;
    if (value.integerValue != null) return Number(value.integerValue);
    if (value.doubleValue != null) return Number(value.doubleValue);
    if (value.timestampValue != null) return value.timestampValue;
    if (value.arrayValue) {
      return (value.arrayValue.values || []).map(decodeValue);
    }
    if (value.mapValue) {
      return decodeFields(value.mapValue.fields || {});
    }
    return null;
  }

  function decodeFields(fields) {
    var out = {};
    Object.keys(fields || {}).forEach(function (key) {
      out[key] = decodeValue(fields[key]);
    });
    return out;
  }

  function fromDocument(document) {
    var fields = document.fields || {};
    var docId = String(document.name || "").split("/").pop();

    return {
      studentId:
        fieldValue(fields, "studentId") ||
        decodeURIComponent(docId).split("::").pop(),
      council: fieldValue(fields, "council") || decodeURIComponent(docId).split("::")[0],
      lastName: fieldValue(fields, "lastName"),
      firstName: fieldValue(fields, "firstName"),
      middleName: fieldValue(fields, "middleName"),
      program: fieldValue(fields, "program"),
      year: fieldValue(fields, "year"),
      classification: fieldValue(fields, "classification")
    };
  }

  function commit(writes) {
    if (!writes.length) return Promise.resolve();

    return request(BASE_URL + ":commit" + KEY_PARAM, {
      method: "POST",
      body: JSON.stringify({ writes: writes })
    });
  }

  // Firestore rules are not filters: a council-scoped read must use a query
  // that already filters by council, so use runQuery instead of listing all.
  function queryDocuments(collectionId, field, value) {
    return request(BASE_URL + ":runQuery" + KEY_PARAM, {
      method: "POST",
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: collectionId }],
          where: {
            fieldFilter: {
              field: { fieldPath: field },
              op: "EQUAL",
              value: { stringValue: value }
            }
          }
        }
      })
    }).then(function (rows) {
      return (rows || [])
        .map(function (row) {
          return row && row.document;
        })
        .filter(Boolean);
    });
  }

  function inChunks(items, size) {
    var chunks = [];

    for (var i = 0; i < items.length; i += size) {
      chunks.push(items.slice(i, i + size));
    }

    return chunks;
  }

  client.loadStudents = function (council) {
    var filter = String(council || "").toUpperCase();

    if (filter) {
      return queryDocuments(COLLECTION, "council", filter).then(function (documents) {
        return documents.map(fromDocument);
      });
    }

    var students = [];

    function loadPage(pageToken) {
      var url =
        BASE_URL +
        "/" +
        COLLECTION +
        KEY_PARAM +
        "&pageSize=500" +
        (pageToken ? "&pageToken=" + encodeURIComponent(pageToken) : "");

      return request(url).then(function (data) {
        (data.documents || []).forEach(function (document) {
          students.push(fromDocument(document));
        });

        if (data.nextPageToken) return loadPage(data.nextPageToken);
        return students;
      });
    }

    return loadPage(null);
  };

  client.saveStudents = function (students) {
    if (!students || !students.length) return Promise.resolve();

    var writes = students.map(function (student) {
      return {
        update: {
          name: studentDocName(student.council, student.studentId),
          fields: studentFields(student)
        }
      };
    });

    return inChunks(writes, BATCH_SIZE).reduce(function (chain, chunk) {
      return chain.then(function () {
        return commit(chunk);
      });
    }, Promise.resolve());
  };

  client.loadPayments = function (council) {
    var filter = String(council || "").toUpperCase();

    function recordFromDocument(document) {
      var record = decodeFields(document.fields || {});
      var docId = String(document.name || "").split("/").pop();
      var parts = decodeURIComponent(docId).split("::");
      var councilFromId = parts.length > 1 ? parts[0] : "";
      var studentFromId =
        parts.length > 1 ? parts.slice(1).join("::") : parts[0] || "";
      record.studentId = record.studentId || studentFromId;
      record.council = record.council || councilFromId;
      return record;
    }

    if (filter) {
      return queryDocuments(PAYMENTS_COLLECTION, "council", filter).then(
        function (documents) {
          return documents.map(recordFromDocument);
        }
      );
    }

    var records = [];

    function loadPage(pageToken) {
      var url =
        BASE_URL +
        "/" +
        PAYMENTS_COLLECTION +
        KEY_PARAM +
        "&pageSize=300" +
        (pageToken ? "&pageToken=" + encodeURIComponent(pageToken) : "");

      return request(url).then(function (data) {
        (data.documents || []).forEach(function (document) {
          records.push(recordFromDocument(document));
        });

        if (data.nextPageToken) return loadPage(data.nextPageToken);
        return records;
      });
    }

    return loadPage(null);
  };

  client.deleteStudent = function (studentId, council) {
    return request(BASE_URL + ":commit" + KEY_PARAM, {
      method: "POST",
      body: JSON.stringify({
        writes: [{ delete: studentDocName(council, studentId) }]
      })
    });
  };

  client.deleteAllStudents = function () {
    return client.loadStudents().then(function (students) {
      if (!students.length) return;

      var writes = students.map(function (student) {
        return { delete: studentDocName(student.council, student.studentId) };
      });

      return inChunks(writes, BATCH_SIZE).reduce(function (chain, chunk) {
        return chain.then(function () {
          return commit(chunk);
        });
      }, Promise.resolve());
    });
  };

  /* ---------- accounts (Firebase Auth + Firestore users) ---------- */
  var AUTH_BASE = "https://identitytoolkit.googleapis.com/v1/accounts:";
  var USERS_COLLECTION = "users";
  var STUDENT_EMAIL_DOMAIN = "students.tcgc.local";

  function studentEmail(studentId) {
    return String(studentId || "").trim().toLowerCase() + "@" + STUDENT_EMAIL_DOMAIN;
  }

  function authErrorCode(message) {
    var text = String(message || "").toUpperCase();
    if (text.indexOf("EMAIL_EXISTS") !== -1) return "email-in-use";
    if (text.indexOf("WEAK_PASSWORD") !== -1) return "weak-password";
    if (text.indexOf("INVALID_LOGIN_CREDENTIALS") !== -1 ||
        text.indexOf("INVALID_PASSWORD") !== -1 ||
        text.indexOf("EMAIL_NOT_FOUND") !== -1) {
      return "invalid-credentials";
    }
    if (text.indexOf("OPERATION_NOT_ALLOWED") !== -1) return "auth-disabled";
    if (text.indexOf("UNAUTHORIZED_DOMAIN") !== -1) return "unauthorized-domain";
    if (text.indexOf("TOO_MANY_ATTEMPTS") !== -1) return "too-many-requests";
    return "auth";
  }

  function authRequest(path, payload) {
    return window
      .fetch(AUTH_BASE + path + KEY_PARAM, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
      .catch(function (error) {
        throw makeError(error.message, "unavailable");
      })
      .then(function (response) {
        return response
          .json()
          .catch(function () {
            return {};
          })
          .then(function (data) {
            if (!response.ok) {
              var message =
                (data.error && data.error.message) || "Firebase sign-in failed.";
              throw makeError(message, authErrorCode(message));
            }
            return data;
          });
      });
  }

  function userFields(profile) {
    return {
      name: { stringValue: profile.name || "" },
      studentId: { stringValue: profile.studentId || "" },
      position: { stringValue: profile.position || "" },
      yearLevel: { stringValue: profile.yearLevel || "" },
      council: { stringValue: profile.council || "" },
      createdAt: {
        timestampValue: profile.createdAt || new Date().toISOString()
      }
    };
  }

  function profileFromDocument(document) {
    var fields = document.fields || {};
    return {
      uid: String(document.name || "").split("/").pop(),
      name: fieldValue(fields, "name"),
      studentId: fieldValue(fields, "studentId"),
      position: fieldValue(fields, "position"),
      yearLevel: fieldValue(fields, "yearLevel"),
      council: fieldValue(fields, "council")
    };
  }

  function userDocUrl(uid) {
    return (
      BASE_URL +
      "/" +
      USERS_COLLECTION +
      "/" +
      encodeURIComponent(uid) +
      KEY_PARAM
    );
  }

  client.createAccount = function (account) {
    var email = studentEmail(account.studentId);

    function signUp() {
      return authRequest("signUp", {
        email: email,
        password: account.password,
        returnSecureToken: true
      }).catch(function (error) {
        if (error.code !== "email-in-use") throw error;

        // A previous attempt may have created the Auth login without the
        // Firestore profile. If the password matches and no profile exists,
        // finish that account instead of reporting a duplicate.
        return authRequest("signInWithPassword", {
          email: email,
          password: account.password,
          returnSecureToken: true
        })
          .then(function (data) {
            return window
              .fetch(userDocUrl(data.localId), {
                headers: { Authorization: "Bearer " + data.idToken }
              })
              .then(function (response) {
                if (response.ok) throw error;
                return data;
              });
          })
          .catch(function (recoveryError) {
            if (recoveryError === error) throw error;
            throw error;
          });
      });
    }

    return signUp().then(function (data) {
      var profile = {
        name: account.name || "",
        studentId: account.studentId || "",
        position: account.position || "",
        yearLevel: account.yearLevel || "",
        council: account.council || "",
        createdAt: new Date().toISOString()
      };

      return window
        .fetch(userDocUrl(data.localId), {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + data.idToken
          },
          body: JSON.stringify({ fields: userFields(profile) })
        })
        .then(readJson)
        .then(function () {
          return {
            uid: data.localId,
            idToken: data.idToken,
            profile: profile,
            profileSaved: true
          };
        })
        .catch(function (error) {
          // The Auth login exists; the Firestore profile can be retried later.
          console.warn("[firebase] Could not save the user profile:", error);
          return {
            uid: data.localId,
            idToken: data.idToken,
            profile: profile,
            profileSaved: false
          };
        });
    });
  };

  client.signInAccount = function (studentId, password) {
    return authRequest("signInWithPassword", {
      email: studentEmail(studentId),
      password: password,
      returnSecureToken: true
    }).then(function (data) {
      return window
        .fetch(userDocUrl(data.localId), {
          headers: { Authorization: "Bearer " + data.idToken }
        })
        .then(readJson)
        .then(function (document) {
          var profile = profileFromDocument(document);
          if (!profile.studentId) profile.studentId = studentId;
          return { uid: data.localId, idToken: data.idToken, profile: profile };
        })
        .catch(function () {
          return {
            uid: data.localId,
            idToken: data.idToken,
            profile: {
              uid: data.localId,
              name: "",
              studentId: studentId,
              position: "",
              yearLevel: "",
              council: ""
            }
          };
        });
    });
  };

  client.listUserAccounts = function (idToken) {
    var users = [];

    if (!idToken) return Promise.resolve(users);

    function loadPage(pageToken) {
      var url =
        BASE_URL +
        "/" +
        USERS_COLLECTION +
        KEY_PARAM +
        "&pageSize=300" +
        (pageToken ? "&pageToken=" + encodeURIComponent(pageToken) : "");

      return window
        .fetch(url, { headers: { Authorization: "Bearer " + idToken } })
        .then(readJson)
        .then(function (data) {
          (data.documents || []).forEach(function (document) {
            users.push(profileFromDocument(document));
          });
          if (data.nextPageToken) return loadPage(data.nextPageToken);
          return users;
        });
    }

    return loadPage(null);
  };

  client.findStudentPayment = function (studentId) {
    var id = String(studentId || "").trim().toUpperCase();
    if (!id) return Promise.resolve(null);

    return request(BASE_URL + ":runQuery" + KEY_PARAM, {
      method: "POST",
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: PAYMENTS_COLLECTION }],
          where: {
            fieldFilter: {
              field: { fieldPath: "studentId" },
              op: "EQUAL",
              value: { stringValue: id }
            }
          },
          limit: 1
        }
      })
    }).then(function (rows) {
      var found = (rows || [])
        .map(function (row) {
          return row && row.document;
        })
        .filter(Boolean)[0];

      if (!found) return null;

      var record = decodeFields(found.fields || {});
      record.studentId = record.studentId || id;
      return record;
    });
  };

  client.findPaymentRecord = function (studentId, council) {
    var code = String(council || "").toUpperCase();
    var id = String(studentId || "").trim().toUpperCase();
    if (!code || !id) return Promise.resolve(null);

    var docId = code + "::" + id;
    var url =
      BASE_URL +
      "/" +
      PAYMENTS_COLLECTION +
      "/" +
      encodeURIComponent(docId) +
      KEY_PARAM;

    return request(url)
      .then(function (document) {
        var record = decodeFields(document.fields || {});
        record.studentId = record.studentId || id;
        record.council = record.council || code;
        return record;
      })
      .catch(function (error) {
        if (error && error.code === "not-found") return null;
        throw error;
      });
  };

  client.findStudentRecord = function (studentId) {
    var id = String(studentId || "").trim().toUpperCase();
    if (!id) return Promise.resolve(null);

    return request(BASE_URL + ":runQuery" + KEY_PARAM, {
      method: "POST",
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: COLLECTION }],
          where: {
            fieldFilter: {
              field: { fieldPath: "studentId" },
              op: "EQUAL",
              value: { stringValue: id }
            }
          },
          limit: 1
        }
      })
    }).then(function (rows) {
      var found = (rows || [])
        .map(function (row) {
          return row && row.document;
        })
        .filter(Boolean)[0];

      return found ? decodeFields(found.fields || {}) : null;
    });
  };

  client.findStudentPayments = function (studentId) {
    var id = String(studentId || "").trim().toUpperCase();
    if (!id) return Promise.resolve([]);

    return request(BASE_URL + ":runQuery" + KEY_PARAM, {
      method: "POST",
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: PAYMENTS_COLLECTION }],
          where: {
            fieldFilter: {
              field: { fieldPath: "studentId" },
              op: "EQUAL",
              value: { stringValue: id }
            }
          }
        }
      })
    }).then(function (rows) {
      return (rows || [])
        .map(function (row) {
          return row && row.document;
        })
        .filter(Boolean)
        .map(function (document) {
          var record = decodeFields(document.fields || {});
          record.studentId = record.studentId || id;
          return record;
        });
    });
  };

  function typeFromDocument(document) {
    var type = decodeFields(document.fields || {});
    type.id = String(document.name || "").split("/").pop();
    type.locked = Boolean(type.locked);
    return type;
  }

  client.listPaymentTypes = function (council) {
    var code = String(council || "").toUpperCase();
    if (!code) return Promise.resolve([]);

    return queryDocuments(TYPES_COLLECTION, "council", code).then(
      function (documents) {
        return documents.map(typeFromDocument);
      }
    );
  };

  client.createPaymentType = function (type) {
    var payload = Object.assign({ locked: false }, type, {
      locked: Boolean(type.locked)
    });

    return window
      .fetch(BASE_URL + "/" + TYPES_COLLECTION + KEY_PARAM, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + (token || "")
        },
        body: JSON.stringify({ fields: encodeFields(payload) })
      })
      .then(readJson)
      .then(typeFromDocument);
  };

  client.setPaymentTypeLock = function (typeId, locked) {
    var path = TYPES_COLLECTION + "/" + encodeURIComponent(typeId);

    return getDocumentOrNull(path).then(function (document) {
      if (!document) throw makeError("Payment type not found.", "not-found");

      var type = decodeFields(document.fields || {});
      type.locked = Boolean(locked);

      return patchDocument(path, type).then(function () {
        return type;
      });
    });
  };

  client.deletePaymentType = function (typeId) {
    return window
      .fetch(
        BASE_URL +
          "/" +
          TYPES_COLLECTION +
          "/" +
          encodeURIComponent(typeId) +
          KEY_PARAM,
        {
          method: "DELETE",
          headers: { Authorization: "Bearer " + (token || "") }
        }
      )
      .then(function (response) {
        if (!response.ok) {
          throw makeError("Could not delete the payment type.", "delete-failed");
        }
        return true;
      });
  };

  client.addCharge = function (options) {
    var council = String(options.council || "").toUpperCase();
    var studentId = String(options.studentId || "").trim().toUpperCase();
    var type = options.type || {};
    var student = options.student || {};
    var amount = Number(options.amount || 0);
    var paid = Number(options.paid || 0);
    var dueDate = String(options.dueDate || "");
    var docId = council + "::" + studentId;
    var path = PAYMENTS_COLLECTION + "/" + encodeURIComponent(docId);

    if (!council || !studentId) {
      return Promise.reject(
        makeError("Missing council or Student ID.", "invalid-argument")
      );
    }

    return getDocumentOrNull(path).then(function (document) {
      var record = document ? decodeFields(document.fields || {}) : {};
      var charges = Array.isArray(record.charges) ? record.charges.slice() : [];
      var payments = Array.isArray(record.payments) ? record.payments.slice() : [];

      charges.push({
        id: "charge-" + Date.now(),
        label: type.name || "Payment",
        category: type.category || "Miscellaneous",
        scope: type.scope || "Organization",
        unit: type.council || council,
        semester: type.semester || "",
        academicYear: type.academicYear || "",
        typeLabel: type.label || type.name || "Payment",
        amount: amount,
        paid: Math.min(paid, amount),
        dueDate: dueDate
      });

      var total = charges.reduce(function (sum, charge) {
        return sum + Number(charge.amount || 0);
      }, 0);
      var paidTotal = charges.reduce(function (sum, charge) {
        return sum + Number(charge.paid || 0);
      }, 0);
      var openDates = charges
        .filter(function (charge) {
          return Number(charge.amount || 0) - Number(charge.paid || 0) > 0;
        })
        .map(function (charge) {
          return charge.dueDate || "";
        })
        .filter(Boolean)
        .sort();

      var fullName = [student.firstName, student.middleName, student.lastName]
        .filter(Boolean)
        .join(" ")
        .trim();

      var nextRecord = Object.assign({}, record, {
        council: council,
        studentId: studentId,
        name: record.name || fullName || studentId,
        institute: record.institute || student.institute || "",
        program: record.program || student.program || "",
        yearLevel: record.yearLevel || student.year || "",
        statement:
          record.statement ||
          [type.semester, type.academicYear].filter(Boolean).join(" - "),
        updated: new Date().toLocaleDateString("en-PH", {
          year: "numeric",
          month: "long",
          day: "numeric"
        }),
        nextDue:
          total - paidTotal > 0
            ? openDates[0] || "See charges"
            : "Fully paid for this semester",
        charges: charges,
        payments: payments
      });

      return patchDocument(path, nextRecord).then(function () {
        return nextRecord;
      });
    });
  };

  client.recordPayment = function (options) {
    var council = String(options.council || "").toUpperCase();
    var studentId = String(options.studentId || "").trim().toUpperCase();
    var amount = Number(options.amount || 0);
    var date = String(options.date || "");
    var ref = String(options.ref || "").trim();
    var method = String(options.method || "").trim();
    var docId = council + "::" + studentId;
    var path = PAYMENTS_COLLECTION + "/" + encodeURIComponent(docId);

    if (!council || !studentId) {
      return Promise.reject(
        makeError("Missing council or Student ID.", "invalid-argument")
      );
    }

    return getDocumentOrNull(path).then(function (document) {
      if (!document) {
        throw makeError("No payment record was found for that student.", "not-found");
      }

      var record = decodeFields(document.fields || {});
      var charges = (Array.isArray(record.charges) ? record.charges : []).map(
        function (charge) {
          return Object.assign({}, charge, {
            amount: Number(charge.amount || 0),
            paid: Number(charge.paid || 0)
          });
        }
      );

      var remaining = amount;
      var anyOpen = charges.some(function (charge) {
        return charge.amount - charge.paid > 0;
      });
      var openCharges = charges
        .map(function (charge, index) {
          return { charge: charge, index: index };
        })
        .filter(function (entry) {
          return !entry.charge.locked && entry.charge.amount - entry.charge.paid > 0;
        })
        .sort(function (a, b) {
          var da = Date.parse(a.charge.dueDate || "");
          var db = Date.parse(b.charge.dueDate || "");
          if (isNaN(da) && isNaN(db)) return a.index - b.index;
          if (isNaN(da)) return 1;
          if (isNaN(db)) return -1;
          return da - db;
        });

      if (anyOpen && !openCharges.length) {
        throw makeError("All open charges are locked.", "locked");
      }

      openCharges.forEach(function (entry) {
        if (remaining <= 0) return;
        var charge = entry.charge;
        var due = charge.amount - charge.paid;
        var apply = Math.min(due, remaining);
        charge.paid += apply;
        remaining -= apply;
      });

      var payments = (Array.isArray(record.payments) ? record.payments : []).slice();
      payments.push({
        id: "pay-" + Date.now(),
        label: "Payment",
        date: date,
        ref: ref,
        method: method,
        amount: amount,
        status: "Verified"
      });

      var total = charges.reduce(function (sum, charge) {
        return sum + charge.amount;
      }, 0);
      var paidTotal = charges.reduce(function (sum, charge) {
        return sum + charge.paid;
      }, 0);
      var openDates = charges
        .filter(function (charge) {
          return charge.amount - charge.paid > 0;
        })
        .map(function (charge) {
          return charge.dueDate || "";
        })
        .filter(Boolean)
        .sort();

      var nextRecord = Object.assign({}, record, {
        council: council,
        studentId: studentId,
        charges: charges,
        payments: payments,
        updated: new Date().toLocaleDateString("en-PH", {
          year: "numeric",
          month: "long",
          day: "numeric"
        }),
        nextDue:
          total - paidTotal > 0
            ? openDates[0] || "See charges"
            : "Fully paid for this semester"
      });

      return patchDocument(path, nextRecord).then(function () {
        return nextRecord;
      });
    });
  };

  function paymentDocName(council, studentId) {
    return (
      "projects/" +
      PROJECT_ID +
      "/databases/(default)/documents/" +
      PAYMENTS_COLLECTION +
      "/" +
      encodeURIComponent(String(council) + "::" + String(studentId))
    );
  }

  client.applyPaymentType = function (options) {
    var council = String(options.council || "").toUpperCase();
    var name = String(options.name || "").trim();
    var amount = Number(options.amount || 0);
    var students = Array.isArray(options.students) ? options.students : [];

    if (!council || !name || !(amount > 0) || !students.length) {
      return Promise.reject(
        makeError("Missing payment type, amount, or students.", "invalid-argument")
      );
    }

    return client.loadPayments(council).then(function (records) {
      var byStudent = {};
      records.forEach(function (record) {
        byStudent[String(record.studentId || "").toUpperCase()] = record;
      });

      var seen = {};
      var writes = [];
      var now = new Date().toISOString();

      students.forEach(function (student, index) {
        var studentId = String(student.studentId || "").trim().toUpperCase();
        if (!studentId || seen[studentId]) return;
        seen[studentId] = true;

        var record =
          byStudent[studentId] ||
          {
            council: council,
            studentId: studentId,
            name: "",
            charges: [],
            payments: []
          };

        var charges = (Array.isArray(record.charges) ? record.charges : []).slice();
        charges.push({
          id: "charge-" + Date.now() + "-" + index,
          label: name,
          category: "Miscellaneous",
          scope: "Organization",
          unit: council,
          typeLabel: name,
          semester: "",
          academicYear: "",
          amount: amount,
          paid: 0,
          dueDate: "",
          locked: false
        });

        var fullName = [student.firstName, student.middleName, student.lastName]
          .filter(Boolean)
          .join(" ")
          .trim();

        var nextRecord = Object.assign({}, record, {
          council: council,
          studentId: studentId,
          name: record.name || fullName || studentId,
          statement: record.statement || "",
          updated: now.slice(0, 10),
          nextDue: "See charges",
          charges: charges,
          payments: Array.isArray(record.payments) ? record.payments : []
        });

        writes.push({
          update: {
            name: paymentDocName(council, studentId),
            fields: encodeFields(nextRecord)
          }
        });
      });

      return inChunks(writes, BATCH_SIZE).reduce(function (chain, chunk) {
        return chain.then(function () {
          return commit(chunk);
        });
      }, Promise.resolve()).then(function () {
        return { students: Object.keys(seen).length };
      });
    });
  };

  client.recordTypedPayment = function (options) {
    var council = String(options.council || "").toUpperCase();
    var studentId = String(options.studentId || "").trim().toUpperCase();
    var type = options.type || {};
    var amount = Number(options.amount || 0);
    var date = String(options.date || "");
    var ref = String(options.ref || "").trim();
    var method = String(options.method || "").trim();
    var officer = options.officer || {};
    var typeName = String(type.name || type.label || "Payment").trim();
    var chargeAmount = Number(type.amount || 0) || amount;
    var docId = council + "::" + studentId;
    var path = PAYMENTS_COLLECTION + "/" + encodeURIComponent(docId);

    if (!council || !studentId || !typeName || !(amount > 0)) {
      return Promise.reject(
        makeError("Missing student, payment type, or amount.", "invalid-argument")
      );
    }

    if (type.locked) {
      return Promise.reject(
        makeError("That payment type is locked.", "locked-type")
      );
    }

    return getDocumentOrNull(path).then(function (document) {
      var record = document ? decodeFields(document.fields || {}) : {
        council: council,
        studentId: studentId,
        name: "",
        charges: [],
        payments: []
      };

      var charges = (Array.isArray(record.charges) ? record.charges : []).map(
        function (charge) {
          return Object.assign({}, charge, {
            amount: Number(charge.amount || 0),
            paid: Number(charge.paid || 0)
          });
        }
      );

      var existing = charges.filter(function (charge) {
        var label = String(charge.typeLabel || charge.label || "");
        return (
          !charge.locked &&
          label.toLowerCase() === typeName.toLowerCase() &&
          charge.paid < charge.amount
        );
      })[0];

      if (existing) {
        existing.paid = Math.min(existing.amount, existing.paid + amount);
        existing.assessedBy = officer.name || existing.assessedBy || "";
        existing.assessedById = officer.studentId || existing.assessedById || "";
      } else {
        charges.push({
          id: "charge-" + Date.now(),
          label: typeName,
          category: type.category || "Miscellaneous",
          scope: type.scope || "Organization",
          unit: type.council || council,
          typeLabel: typeName,
          semester: type.semester || "",
          academicYear: type.academicYear || "",
          amount: chargeAmount,
          paid: Math.min(amount, chargeAmount),
          dueDate: "",
          locked: false,
          assessedBy: officer.name || "",
          assessedById: officer.studentId || ""
        });
      }

      var payments = (Array.isArray(record.payments) ? record.payments : []).slice();
      payments.push({
        id: "pay-" + Date.now(),
        label: typeName,
        date: date,
        ref: ref,
        method: method,
        amount: amount,
        status: "Verified",
        recordedBy: officer.name || "",
        recordedByPosition: officer.position || "",
        recordedById: officer.studentId || "",
        recordedAt: new Date().toISOString()
      });

      var total = charges.reduce(function (sum, charge) {
        return sum + charge.amount;
      }, 0);
      var paidTotal = charges.reduce(function (sum, charge) {
        return sum + charge.paid;
      }, 0);

      var nextRecord = Object.assign({}, record, {
        council: council,
        studentId: studentId,
        charges: charges,
        payments: payments,
        updated: new Date().toLocaleDateString("en-PH", {
          year: "numeric",
          month: "long",
          day: "numeric"
        }),
        nextDue:
          total - paidTotal > 0
            ? "See charges"
            : "Fully paid for this semester"
      });

      return patchDocument(path, nextRecord).then(function () {
        return nextRecord;
      });
    });
  };

  client.setChargeLock = function (options) {
    var council = String(options.council || "").toUpperCase();
    var studentId = String(options.studentId || "").trim().toUpperCase();
    var locked = Boolean(options.locked);
    var path = PAYMENTS_COLLECTION + "/" + encodeURIComponent(council + "::" + studentId);

    return getDocumentOrNull(path).then(function (document) {
      if (!document) throw makeError("No payment record found.", "not-found");

      var record = decodeFields(document.fields || {});
      var charges = (Array.isArray(record.charges) ? record.charges : []).map(
        function (charge) {
          return Object.assign({}, charge);
        }
      );

      var target = null;
      if (options.chargeId) {
        target = charges.filter(function (charge) {
          return charge.id === options.chargeId;
        })[0];
      }
      if (!target && typeof options.index === "number") {
        target = charges[options.index];
      }
      if (!target) throw makeError("Charge not found.", "not-found");

      target.locked = locked;
      record.charges = charges;

      return patchDocument(path, record).then(function () {
        return record;
      });
    });
  };

  function encodeValue(value) {
    if (value === null || value === undefined) return { nullValue: null };
    if (typeof value === "string") return { stringValue: value };
    if (typeof value === "boolean") return { booleanValue: value };
    if (typeof value === "number") {
      return Number.isInteger(value)
        ? { integerValue: String(value) }
        : { doubleValue: value };
    }
    if (Array.isArray(value)) {
      return { arrayValue: { values: value.map(encodeValue) } };
    }
    if (typeof value === "object") {
      return { mapValue: { fields: encodeFields(value) } };
    }
    return { nullValue: null };
  }

  function encodeFields(object) {
    var fields = {};
    Object.keys(object || {}).forEach(function (key) {
      fields[key] = encodeValue(object[key]);
    });
    return fields;
  }

  function patchDocument(path, data) {
    return window
      .fetch(BASE_URL + "/" + path + KEY_PARAM, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + (token || "")
        },
        body: JSON.stringify({ fields: encodeFields(data) })
      })
      .then(readJson);
  }

  function getDocumentOrNull(path) {
    return window
      .fetch(BASE_URL + "/" + path + KEY_PARAM, {
        headers: token ? { Authorization: "Bearer " + token } : {}
      })
      .then(readJson)
      .catch(function (error) {
        if (error && error.code === "not-found") return null;
        throw error;
      });
  }

  window.TCGCFirebase = client;
})();
