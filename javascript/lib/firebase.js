import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Firebase project credentials. These are safe to ship in a web client, but you
// should restrict the API key to your domains in the Google Cloud console.
// VITE_FIREBASE_* environment variables override these defaults when present.
const firebaseConfig = {
  apiKey:
    import.meta.env.VITE_FIREBASE_API_KEY ||
    "AIzaSyB0CH4x8ORDadrG2Q7J8v4DR7Mj3UGCZ2M",
  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ||
    "tcgc-payment-tracking-system.firebaseapp.com",
  projectId:
    import.meta.env.VITE_FIREBASE_PROJECT_ID || "tcgc-payment-tracking-system",
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ||
    "tcgc-payment-tracking-system.firebasestorage.app",
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "406213002539",
  appId:
    import.meta.env.VITE_FIREBASE_APP_ID ||
    "1:406213002539:web:c5c8942f424811bbde716e",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-HXMHWLC2X7",
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Analytics is optional: it is unavailable in some browsers and during SSR,
// and it must never stop the app from booting.
export async function initAnalytics() {
  if (typeof window === "undefined") return null;

  try {
    const { getAnalytics, isSupported } = await import("firebase/analytics");
    if (!(await isSupported())) return null;
    return getAnalytics(app);
  } catch (error) {
    console.warn("[firebase] Analytics unavailable:", error);
    return null;
  }
}
