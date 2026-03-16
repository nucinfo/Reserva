import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDNyrUhp6otXLO2LmBVMW7S2PCRqQUZaWs",
  authDomain: "reserva-a381c.firebaseapp.com",
  projectId: "reserva-a381c",
  storageBucket: "reserva-a381c.firebasestorage.app",
  messagingSenderId: "559920317916",
  appId: "1:559920317916:web:0f5bdcb8a9f6c135047b19",
  measurementId: "G-W75YGQ07C5",
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

