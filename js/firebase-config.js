import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";

import { getAuth } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

import { getFirestore } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyATxYXL4Qvh8FYOso2L5sHIPg4Xx2EZpQs",
  authDomain: "appoficiales-8acbd.firebaseapp.com",
  projectId: "appoficiales-8acbd",
  storageBucket: "appoficiales-8acbd.firebasestorage.app",
  messagingSenderId: "483230341029",
  appId: "1:483230341029:web:c9a4eecbf31946e3f9ba4c"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
