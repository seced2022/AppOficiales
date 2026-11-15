import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";

import { getAuth } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

import { getFirestore } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";


const firebaseConfig = {
  apiKey: "AIzaSyAIDbnO_g09VTwgeRSmxyTnSpdFUMrBOsQ",
  authDomain: "g6k-bolsaoficiales-v2-pruebas.firebaseapp.com",
  projectId: "g6k-bolsaoficiales-v2-pruebas",
  storageBucket: "g6k-bolsaoficiales-v2-pruebas.firebasestorage.app",
  messagingSenderId: "651345929642",
  appId: "1:651345929642:web:b3fe4d091baaa83edb37d3"
};


const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
