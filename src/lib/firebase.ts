import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, signOut, onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { initializeFirestore, getFirestore, doc, getDocFromServer, Firestore } from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

// Initialize Firebase App singleton
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

const databaseId = firebaseConfig.firestoreDatabaseId || "ai-studio-6f3899c6-4891-40d1-b569-afb78466e4b7";

let db: Firestore;
try {
  db = initializeFirestore(app, {
    experimentalAutoDetectLongPolling: true
  }, databaseId);
} catch {
  db = getFirestore(app, databaseId);
}

const auth = getAuth(app);

// Connection test with silent fallback for offline/sandboxed environments
async function testConnection() {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
  } catch (error) {
    if (error instanceof Error) {
      console.warn("Firestore connection notice (operating with local/offline fallback):", error.message);
    }
  }
}
testConnection();

export { app, db, auth, signOut, onAuthStateChanged, signInAnonymously };

