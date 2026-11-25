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

  function studentDocName(studentId) {
    return (
      "projects/" +
      PROJECT_ID +
      "/databases/(default)/documents/" +
      COLLECTION +
      "/" +
      encodeURIComponent(studentId)
    );
  }

  function studentFields(student) {
    return {
      studentId: { stringValue: String(student.studentId || "") },
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

  function fromDocument(document) {
    var fields = document.fields || {};
    var docId = String(document.name || "").split("/").pop();

    return {
      studentId: fieldValue(fields, "studentId") || decodeURIComponent(docId),
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

  function inChunks(items, size) {
    var chunks = [];

    for (var i = 0; i < items.length; i += size) {
      chunks.push(items.slice(i, i + size));
    }

    return chunks;
  }

  client.loadStudents = function () {
    var students = [];

    function loadPage(pageToken) {
      var url =
        BASE_URL +
        "/" +
        COLLECTION +
        KEY_PARAM +
        "&pageSize=500" +
        (pageToken ? "&pageToken=" + encodeURIComponent(pageToken) : "");

      return request(url)
        .then(function (data) {
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
          name: studentDocName(student.studentId),
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

  client.deleteStudent = function (studentId) {
    return request(BASE_URL + ":commit" + KEY_PARAM, {
      method: "POST",
      body: JSON.stringify({
        writes: [{ delete: studentDocName(studentId) }]
      })
    });
  };

  client.deleteAllStudents = function () {
    return client.loadStudents().then(function (students) {
      if (!students.length) return;

      var writes = students.map(function (student) {
        return { delete: studentDocName(student.studentId) };
      });

      return inChunks(writes, BATCH_SIZE).reduce(function (chain, chunk) {
        return chain.then(function () {
          return commit(chunk);
        });
      }, Promise.resolve());
    });
  };

  window.TCGCFirebase = client;
})();
