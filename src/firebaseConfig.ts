// src/firebaseConfig.ts
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBcomeZ1KIVa3586YCKW8S-LupHw73hewU",
  authDomain: "contactmanager-b0fc9.firebaseapp.com",
  projectId: "contactmanager-b0fc9",
  storageBucket: "contactmanager-b0fc9.firebasestorage.app",
  messagingSenderId: "569933473324",
  appId: "1:569933473324:web:54eae688d8c45ef6c59389",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
