import {
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { auth, db } from "./firebase";

export const USERS_COLLECTION = "users";

// Student IDs are the public username. Firebase Auth still needs an email, so
// each account gets a deterministic internal address that can never receive
// mail. Students never see or type it.
export const STUDENT_EMAIL_DOMAIN = "students.tcgc.local";
export const STUDENT_ID_RE = /^[A-Za-z0-9][A-Za-z0-9-]{2,13}[A-Za-z0-9]$/;

export function normalizeStudentId(value) {
  return String(value || "").trim().toUpperCase();
}

export function studentIdToEmail(studentId) {
  return `${normalizeStudentId(studentId).toLowerCase()}@${STUDENT_EMAIL_DOMAIN}`;
}

function studentIdFromAuthUser(user) {
  const email = String(user?.email || "");
  const suffix = `@${STUDENT_EMAIL_DOMAIN}`;

  if (!email.toLowerCase().endsWith(suffix)) return "";
  return normalizeStudentId(email.slice(0, -suffix.length));
}

/* ---------- password hashing ---------- */
// Firebase Auth already stores its own one-way hash. These fields are an
// additional, verifiable hash kept in the Firestore document so the password
// can later be checked by a custom backend. The plain password is never stored.
export const PASSWORD_HASH_ALGORITHM = "PBKDF2-SHA256";
export const PASSWORD_HASH_ITERATIONS = 150000;

function bytesToBase64(bytes) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return window.btoa(binary);
}

function base64ToBytes(value) {
  const binary = window.atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export async function computePasswordHash(password, saltBase64) {
  const salt = saltBase64
    ? base64ToBytes(saltBase64)
    : window.crypto.getRandomValues(new Uint8Array(16));

  const material = await window.crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const bits = await window.crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: PASSWORD_HASH_ITERATIONS,
      hash: "SHA-256",
    },
    material,
    256
  );

  return {
    hashPassword: bytesToBase64(new Uint8Array(bits)),
    passwordSalt: bytesToBase64(salt),
    passwordAlgorithm: PASSWORD_HASH_ALGORITHM,
    passwordIterations: PASSWORD_HASH_ITERATIONS,
  };
}

export async function verifyPassword(password, profile) {
  if (!profile?.hashPassword || !profile?.passwordSalt) return false;

  const { hashPassword: candidate } = await computePasswordHash(
    password,
    profile.passwordSalt
  );

  return candidate === profile.hashPassword;
}

const PROFILE_CACHE_KEY = "tcgc_paytrack_profiles";

const AUTH_ERRORS = {
  "auth/invalid-email":
    "We couldn't convert that student ID into a login. Contact the Finance Office if this keeps happening.",
  "auth/missing-email": "Enter your student ID.",
  "auth/missing-password": "Enter your password.",
  "auth/user-disabled":
    "This account has been disabled. Please contact the Finance Office.",
  "auth/user-not-found":
    "The student ID and password don't match our records. Please try again.",
  "auth/wrong-password":
    "The student ID and password don't match our records. Please try again.",
  "auth/invalid-credential":
    "The student ID and password don't match our records. Please try again.",
  "auth/invalid-login-credentials":
    "The student ID and password don't match our records. Please try again.",
  "auth/email-already-in-use":
    "That student ID is already registered. Try logging in instead.",
  "auth/weak-password":
    "Use at least 8 characters, including letters and numbers.",
  "auth/password-does-not-meet-requirements":
    "That password is too weak. Use at least 8 characters with letters and numbers.",
  "auth/too-many-requests":
    "Too many attempts. Please wait a moment and try again.",
  "auth/network-request-failed":
    "Network error. Check your connection and try again.",
  "auth/operation-not-allowed":
    "Email/password sign-in isn't enabled for this project yet. Enable it in the Firebase console.",
  "auth/configuration-not-found":
    "Firebase Authentication isn't set up for this project yet. Open the Firebase console, go to Authentication, and enable Email/Password.",
  "auth/requires-recent-login":
    "Please log in again before making this change.",
  "permission-denied":
    "Firestore blocked this request. Check your database security rules.",
  "not-found":
    "The Firestore database doesn't exist yet. Create it in the Firebase console.",
  "failed-precondition":
    "Firestore needs extra setup (for example an index) before this request can run.",
  unavailable:
    "Can't reach Firebase right now. Check your connection and try again.",
};

export function authErrorMessage(error, fallback = "Something went wrong. Please try again.") {
  const code = String(error?.code || "").replace(/^firestore\//, "");
  return AUTH_ERRORS[error?.code] || AUTH_ERRORS[code] || fallback;
}

function cacheKeyFor(user) {
  return user?.uid || user?.email || "";
}

function readProfileCache() {
  try {
    const raw = window.localStorage.getItem(PROFILE_CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function cacheProfile(profile) {
  const key = cacheKeyFor(profile);
  if (!key) return;

  try {
    const cache = readProfileCache();
    cache[key] = profile;
    window.localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Ignore storage failures (private mode, quota, etc.)
  }
}

function cachedProfile(user) {
  const cache = readProfileCache();
  return (
    cache[cacheKeyFor(user)] ||
    (user?.email ? cache[String(user.email).toLowerCase()] : null) ||
    null
  );
}

export function initials(name) {
  return String(name || "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function normalizeProfile(uid, data = {}) {
  return {
    uid,
    name: data.name || "",
    studentId: data.studentId || "",
    position: data.position || "",
    yearLevel: data.yearLevel || "",
    institute: data.institute || "",
    program: data.program || "",
    createdAt: data.createdAt || "",
  };
}

/**
 * Resolve the profile document for a Firebase user. Falls back to the local
 * cache (and then to the bare auth account) when Firestore is unreachable.
 */
async function resolveProfile(user) {
  const base = normalizeProfile(user.uid, {
    name: user.displayName || "",
    studentId: studentIdFromAuthUser(user),
  });

  try {
    const snapshot = await getDoc(doc(db, USERS_COLLECTION, user.uid));
    if (snapshot.exists()) {
      const profile = normalizeProfile(user.uid, snapshot.data());
      cacheProfile(profile);
      return profile;
    }
  } catch (error) {
    console.warn("[auth] Could not read profile from Firestore:", error);
  }

  const cached = cachedProfile(user);
  if (cached) return normalizeProfile(user.uid, cached);

  return base;
}

export async function login(studentId, password, remember) {
  await setPersistence(
    auth,
    remember ? browserLocalPersistence : browserSessionPersistence
  );

  const credential = await signInWithEmailAndPassword(
    auth,
    studentIdToEmail(studentId),
    password
  );

  return resolveProfile(credential.user);
}

export async function registerAccount(account) {
  const studentId = normalizeStudentId(account.studentId);
  const name = String(account.name || "").trim().toUpperCase();

  const credential = await createUserWithEmailAndPassword(
    auth,
    studentIdToEmail(studentId),
    account.password
  );

  let passwordFields = {};
  try {
    passwordFields = await computePasswordHash(account.password);
  } catch (error) {
    console.warn("[auth] Could not compute the stored password hash:", error);
  }

  const profile = {
    name,
    studentId,
    position: String(account.position || "").trim().toUpperCase(),
    yearLevel: account.yearLevel || "",
    institute: account.institute || "",
    program: account.program || "",
    ...passwordFields,
    createdAt: new Date().toISOString(),
  };

  try {
    await updateProfile(credential.user, { displayName: name });
  } catch (error) {
    console.warn("[auth] Could not set display name:", error);
  }

  let profileSaved = true;
  try {
    await setDoc(doc(db, USERS_COLLECTION, credential.user.uid), profile);
  } catch (error) {
    profileSaved = false;
    console.warn("[auth] Could not save profile to Firestore:", error);
  }

  const cached = { ...profile };
  delete cached.hashPassword;
  delete cached.passwordSalt;
  delete cached.passwordAlgorithm;
  delete cached.passwordIterations;
  cacheProfile({ uid: credential.user.uid, ...cached });

  // The app's flow is "create account, then log in", so don't leave the new
  // user signed in with a half-built profile.
  await signOut(auth);

  return { ok: true, profileSaved };
}

export async function logout() {
  await signOut(auth);
}

export function observeSession(callback) {
  return onAuthStateChanged(auth, async (user) => {
    if (!user) {
      callback(null);
      return;
    }
    callback(await resolveProfile(user));
  });
}

export async function listAccounts() {
  const snapshot = await getDocs(collection(db, USERS_COLLECTION));
  return snapshot.docs
    .map((entry) => normalizeProfile(entry.id, entry.data()))
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

export async function findUserByStudentId(studentId) {
  const needle = String(studentId || "").trim().toUpperCase();
  if (!needle) return null;

  try {
    const snapshot = await getDocs(
      query(
        collection(db, USERS_COLLECTION),
        where("studentId", "==", needle),
        limit(1)
      )
    );

    if (!snapshot.empty) {
      const entry = snapshot.docs[0];
      return normalizeProfile(entry.id, entry.data());
    }
  } catch (error) {
    console.warn("[auth] Student ID lookup failed:", error);
  }

  const cached = Object.values(readProfileCache()).find(
    (profile) =>
      String(profile?.studentId || "").trim().toUpperCase() === needle
  );
  return cached ? normalizeProfile(cached.uid, cached) : null;
}
