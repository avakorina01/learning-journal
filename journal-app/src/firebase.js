// Firebase configuration
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCKoKHxpbKGaxVtFeEQZ2mvqssMcoaKXnM",
  authDomain: "learning-journal-b066d.firebaseapp.com",
  projectId: "learning-journal-b066d",
  storageBucket: "learning-journal-b066d.firebasestorage.app",
  messagingSenderId: "250507693268",
  appId: "1:250507693268:web:8bb036a783bd54b396ff41",
  measurementId: "G-9WEFRJ5DNQ"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
