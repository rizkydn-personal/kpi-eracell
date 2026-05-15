import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getDatabase,
  ref,
  onValue
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";


const firebaseConfig = {
  apiKey: "AIzaSyC5u3IXNNC-ylYfT9aR7bjfAxNHv-8lCGI",
  authDomain: "kpi-eracell.firebaseapp.com",
  databaseURL: "https://kpi-eracell-default-rtdb.asia-southeast1.firebasedatabase.app/",
  projectId: "kpi-eracell",
  storageBucket: "kpi-eracell.firebasestorage.app",
  messagingSenderId: "993752642422",
  appId: "1:993752642422:web:83e917ec6953e4193e0057",
  measurementId: "G-LY19E0KTJ8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);


export {
  db,
  ref,
  onValue
};