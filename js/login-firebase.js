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

function mostrarAviso(id, mensaje, tipo){
    const aviso = document.getElementById(id);
    if(!aviso) return;

    aviso.style.display = "block";
    aviso.className = "aviso " + tipo;
    aviso.innerText = mensaje;
}

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

const btnCrearCuenta = document.getElementById("btnCrearCuenta");
const btnEntrar = document.getElementById("btnEntrar");

if(btnCrearCuenta){
    btnCrearCuenta.addEventListener("click", async function(){
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
            btnCrearCuenta.disabled = true;
            btnCrearCuenta.innerText = "Creando cuenta...";

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

            document.getElementById("registroNombre").value = "";
            document.getElementById("registroEmail").value = "";
            document.getElementById("registroPassword").value = "";
            document.getElementById("registroRol").value = "oficial";

        }catch(error){
            console.error(error);
            mostrarAviso("avisoRegistro", traducirError(error.code), "error");
        }finally{
            btnCrearCuenta.disabled = false;
            btnCrearCuenta.innerText = "Crear cuenta";
        }
    });
}

if(btnEntrar){
    btnEntrar.addEventListener("click", async function(){
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

            mostrarAviso("avisoLogin", "Acceso correcto. Redirigiendo...", "ok");

setTimeout(() => {

    if(datos.rol === "admin"){
        window.location.href = "admin.html";
    }

    else if(datos.rol === "organizador"){
        window.location.href = "organizador.html";
    }

    else{
        window.location.href = "oficial.html";
    }

}, 1000);

        }catch(error){
            console.error(error);
            mostrarAviso("avisoLogin", traducirError(error.code), "error");
        }
    });
}

console.log("Firebase login cargado");
