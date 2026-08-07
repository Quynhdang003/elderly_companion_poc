import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyBwxdj444iUoWgbdrTrnFZnqJtfVJgrFHk",
    authDomain: "elderly-companion-poc.firebaseapp.com",
    projectId: "elderly-companion-poc",
    storageBucket: "elderly-companion-poc.firebasestorage.app",
    messagingSenderId: "712212321648",
    appId: "1:712212321648:web:6699c647798ee523c22bb5",
    measurementId: "G-MDEWMGEZMM"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);