import { auth, db } from "./firebase-config.js";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import { doc, setDoc, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

function showLogin(){
    document.getElementById("loginForm").classList.remove("hidden");
    document.getElementById("registerForm").classList.add("hidden");
    document.getElementById("tabLogin").classList.add("active");
    document.getElementById("tabRegister").classList.remove("active");
}

function showRegister(){
    document.getElementById("loginForm").classList.add("hidden");
    document.getElementById("registerForm").classList.remove("hidden");
    document.getElementById("tabLogin").classList.remove("active");
    document.getElementById("tabRegister").classList.add("active");
}

function showNotice(id, message, type){
    const box = document.getElementById(id);
    box.textContent = message;
    box.className = "notice " + type;
}

function redirectByRole(role){
    if(role === "admin"){
        window.location.href = "index.html";
    } else if(role === "organizador"){
        window.location.href = "pages/convocatorias.html";
    } else {
        window.location.href = "pages/oficiales.html";
    }
}

async function registerUser(){
    const nombre = document.getElementById("registerName").value.trim();
    const email = document.getElementById("registerEmail").value.trim();
    const password = document.getElementById("registerPassword").value;
    const rol = document.getElementById("registerRole").value;

    if(!nombre || !email || !password || !rol){
        showNotice("registerNotice", "Rellena todos los campos.", "error");
        return;
    }

    if(password.length < 6){
        showNotice("registerNotice", "La contraseña debe tener al menos 6 caracteres.", "error");
        return;
    }

    try{
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        await setDoc(doc(db, "usuarios", user.uid), {
            uid: user.uid,
            nombre: nombre,
            email: email,
            rol: rol,
            activo: true,
            fechaAlta: serverTimestamp()
        });

        showNotice("registerNotice", "Usuario creado correctamente. Redirigiendo...", "ok");
        setTimeout(() => redirectByRole(rol), 900);

    }catch(error){
        showNotice("registerNotice", traducirError(error.code), "error");
        console.error(error);
    }
}

async function loginUser(){
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    if(!email || !password){
        showNotice("loginNotice", "Introduce email y contraseña.", "error");
        return;
    }

    try{
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        const userRef = doc(db, "usuarios", user.uid);
        const userSnap = await getDoc(userRef);

        if(!userSnap.exists()){
            showNotice("loginNotice", "El usuario existe, pero no tiene perfil en Firestore.", "error");
            return;
        }

        const data = userSnap.data();

        if(data.activo !== true){
            showNotice("loginNotice", "Usuario desactivado. Contacta con la federación.", "error");
            return;
        }

        showNotice("loginNotice", "Acceso correcto. Redirigiendo...", "ok");
        setTimeout(() => redirectByRole(data.rol), 700);

    }catch(error){
        showNotice("loginNotice", traducirError(error.code), "error");
        console.error(error);
    }
}

function traducirError(code){
    const errores = {
        "auth/email-already-in-use": "Este email ya está registrado.",
        "auth/invalid-email": "El email no es válido.",
        "auth/weak-password": "La contraseña es demasiado débil.",
        "auth/user-not-found": "No existe ningún usuario con ese email.",
        "auth/wrong-password": "La contraseña no es correcta.",
        "auth/invalid-credential": "Email o contraseña incorrectos.",
        "permission-denied": "No tienes permisos en Firestore. Revisa las reglas."
    };
    return errores[code] || "Error: " + code;
}

window.showLogin = showLogin;
window.showRegister = showRegister;
window.registerUser = registerUser;
window.loginUser = loginUser;
