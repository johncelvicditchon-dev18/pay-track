const USERS_KEY = "tcgc_paytrack_users";
const SESSION_KEY = "tcgc_paytrack_session";
const memory = Object.create(null);

export const DEMO_ACCOUNT = {
  name: "Maria Santos",
  email: "student@tcgc.edu",
  password: "tcgc1234",
  studentId: "2024-00123",
  institute: "ICS",
  program: "BSCS",
  yearLevel: "4TH YEAR",
};

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function parse(raw, fallback) {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function readStorage(storage, key, fallback) {
  try {
    return parse(storage.getItem(key), fallback);
  } catch {
    return memory[key] ?? fallback;
  }
}

function writeStorage(storage, key, value) {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    memory[key] = value;
  }
}

function removeStorage(storage, key) {
  try {
    storage.removeItem(key);
  } catch {
    delete memory[key];
  }
}

export function getUsers() {
  const users = readStorage(window.localStorage, USERS_KEY, []);
  return Array.isArray(users) ? users : [];
}

export function saveUsers(users) {
  writeStorage(window.localStorage, USERS_KEY, users);
}

export function findUser(email) {
  const needle = String(email || "").trim().toLowerCase();
  return (
    getUsers().find((user) => user.email && user.email.toLowerCase() === needle) ||
    null
  );
}

export function findUserByStudentId(studentId) {
  const needle = String(studentId || "").trim().toUpperCase();
  return (
    getUsers().find(
      (user) => user.studentId && user.studentId.toUpperCase() === needle
    ) || null
  );
}

export function authenticate(email, password) {
  const normalized = String(email || "").trim().toLowerCase();

  if (
    normalized === DEMO_ACCOUNT.email &&
    password === DEMO_ACCOUNT.password
  ) {
    return DEMO_ACCOUNT;
  }

  const user = findUser(normalized);
  if (user && user.password === password) return user;

  return null;
}

export function registerAccount(account) {
  const email = String(account.email || "").trim().toLowerCase();

  if (email === DEMO_ACCOUNT.email) {
    return { ok: false, error: "email-taken" };
  }

  if (findUser(email)) {
    return { ok: false, error: "email-taken" };
  }

  const users = getUsers();
  users.push({
    name: account.name.trim(),
    studentId: account.studentId.trim(),
    institute: account.institute,
    program: account.program,
    yearLevel: account.yearLevel,
    email,
    password: account.password,
    createdAt: new Date().toISOString(),
  });
  saveUsers(users);

  return { ok: true };
}

export function readSession() {
  let session = readStorage(window.localStorage, SESSION_KEY, null);
  if (!session) {
    session = readStorage(window.sessionStorage, SESSION_KEY, null);
  }
  return session && session.email ? session : null;
}

export function persistSession(account, remember) {
  clearSession();

  const session = {
    name: account.name,
    email: account.email,
    studentId: account.studentId || "",
    institute: account.institute || "",
    program: account.program || "",
    yearLevel: account.yearLevel || "",
    signedInAt: new Date().toISOString(),
  };

  const storage = remember ? window.localStorage : window.sessionStorage;
  writeStorage(storage, SESSION_KEY, session);
  return session;
}

export function clearSession() {
  removeStorage(window.localStorage, SESSION_KEY);
  removeStorage(window.sessionStorage, SESSION_KEY);
}

export function initials(name) {
  return String(name || "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}
