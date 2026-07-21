// firebase-config.js
// ВАЖНО: Замените эти значения на ваши реальные ключи из Firebase Console
// 1. Зайдите на console.firebase.google.com
// 2. Создайте проект и добавьте веб-приложение (</>)
// 3. Скопируйте объект firebaseConfig сюда:

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCKoKHxpbKGaxVtFeEQZ2mvqssMcoaKXnM",
  authDomain: "learning-journal-b066d.firebaseapp.com",
  projectId: "learning-journal-b066d",
  storageBucket: "learning-journal-b066d.firebasestorage.app",
  messagingSenderId: "250507693268",
  appId: "1:250507693268:web:8bb036a783bd54b396ff41",
  measurementId: "G-9WEFRJ5DNQ"
};

// Инициализация Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { db, auth, googleProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, doc, getDoc, setDoc };
