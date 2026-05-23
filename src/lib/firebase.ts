import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA7vvjvtvRpaXFPCDLbU4bUIXg0z3UNM5k",
  authDomain: "projectmanager-48da1.firebaseapp.com",
  projectId: "projectmanager-48da1",
  storageBucket: "projectmanager-48da1.firebasestorage.app",
  messagingSenderId: "339696363887",
  appId: "1:339696363887:web:21ffd7bfe2581cc18c209a"
};

// Singleton pattern to prevent re-initialization errors
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);