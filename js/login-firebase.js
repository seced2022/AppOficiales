import { auth, db } from "./firebase-config.js";

import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

import {
    doc,
    setDoc,
    getDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

// Pestañas
const btnTabLogin = document.getElementById("btnTabLogin");
const btnTabRegistro = document.getElementById("btnTabRegistro");

const formLogin = document.getElementById("formLogin");
const formRegistro = document.getElementById("formRegistro");

btnTabLogin.addEventListener("click", function(){
    formLogin.classList.remove("oculto");
    formRegistro.classList.add("oculto");

    btnTabLogin.classList.add("activo");
    btnTabRegistro.classList.remove("activo");
});

btnTabRegistro.addEventListener("click", function(){
    formLogin.classList.add("oculto");
    formRegistro.classList.remove("oculto");

    btnTabLogin.classList.remove("activo");
    btnTabRegistro.classList.add("activo");
});

// Avisos
function mostrarAviso(id, mensaje, tipo){
    const aviso = document.getElementById(id);
    aviso.style.display = "block";
    aviso.className = "aviso " + tipo;
    aviso.innerText = mensaje;
}

function limpiarRegistro(){
    document.getElementById("registroNombre").value = "";
    document.getElementById("registroEmail").value = "";
    document.getElementById("registroPassword").value = "";
    document.getElementById("registroRol").value = "oficial";
}

// Crear usuario en Firebase
document.getElementById("btnCrearCuenta").addEventListener("click", async function(){
    const boton = document.getElementById("btnCrearCuenta");

    const nombre = document.getElementById("registroNombre").value.trim();
    const email = document.getElementById("registroEmail").value.trim();
    const password = document.getElementById("registroPassword").value;
    const rol = document.getElementById("registroRol").value;

    if(!nombre || !email || !password || !rol){
        mostrarAviso("avisoRegistro", "Rellena todos los campos.", "error");
        return;
    }

    if(password.length < 6){
        mostrarAviso("avisoRegistro", "La contraseña debe tener al menos 6 caracteres.", "error");
        return;
    }

    try{
        boton.disabled = true;
        boton.innerText = "Creando cuenta...";

        const credenciales = await createUserWithEmailAndPassword(auth, email, password);
        const usuario = credenciales.user;

        await setDoc(doc(db, "usuarios", usuario.uid), {
            uid: usuario.uid,
            nombre: nombre,
            email: email,
            rol: rol,
            activo: true,
            fechaAlta: serverTimestamp()
        });

        mostrarAviso("avisoRegistro", "Cuenta creada correctamente en Firebase.", "ok");
        limpiarRegistro();

    }catch(error){
        console.error(error);
        mostrarAviso("avisoRegistro", traducirError(error.code), "error");
    }finally{
        boton.disabled = false;
        boton.innerText = "Crear cuenta";
    }
});

// Login sencillo
document.getElementById("btnEntrar").addEventListener("click", async function(){
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    if(!email || !password){
        mostrarAviso("avisoLogin", "Introduce email y contraseña.", "error");
        return;
    }

    try{
        const credenciales = await signInWithEmailAndPassword(auth, email, password);
        const usuario = credenciales.user;

        const documento = await getDoc(doc(db, "usuarios", usuario.uid));

        if(!documento.exists()){
            mostrarAviso("avisoLogin", "Usuario autenticado, pero no existe en Firestore.", "error");
            return;
        }

        const datos = documento.data();

        mostrarAviso("avisoLogin", "Acceso correcto. Rol: " + datos.rol, "ok");

    }catch(error){
        console.error(error);
        mostrarAviso("avisoLogin", traducirError(error.code), "error");
    }
});

function traducirError(codigo){
    const errores = {
        "auth/email-already-in-use": "Este email ya está registrado.",
        "auth/invalid-email": "El email no es válido.",
        "auth/weak-password": "La contraseña es débil.",
        "auth/invalid-credential": "Email o contraseña incorrectos.",
        "auth/user-not-found": "No existe un usuario con ese email.",
        "auth/wrong-password": "Contraseña incorrecta.",
        "permission-denied": "Firestore no permite escribir. Revisa las reglas."
    };

    return errores[codigo] || "Error: " + codigo;
}

console.log("Login Firebase cargado correctamente");
