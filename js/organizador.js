import { auth, db } from "./firebase-config.js?v=3";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

import {
    collection,
    addDoc,
    getDocs,
    query,
    where,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

const CATEGORIAS = [
    "Director de Carrera",
    "Director Adjunto",
    "Director de Prueba",
    "Comisario Deportivo",
    "Secretario de Carrera",
    "Cronometrador",
    "Jefe de Cronometraje",
    "Jefe de Tramo",
    "Jefe de Tramo Adjunto",
    "Comisario de Ruta",
    "Comisario Técnico",
    "Relaciones con los Participantes",
    "Médico",
    "Prensa",
    "SP (Servicios Profesionales)",
    "Voluntario",
    "Radio",
    "Cortes"
];

let usuarioActual = null;

function pintarNecesidades(){
    const contenedor = document.getElementById("listaNecesidades");
    contenedor.innerHTML = "";

    CATEGORIAS.forEach(cat => {
        const id = crearId(cat);

        const div = document.createElement("div");
        div.className = "item-necesidad";
        div.innerHTML = `
            <span>${cat}</span>
            <button type="button" data-action="menos" data-id="${id}">-</button>
            <input id="${id}" data-categoria="${cat}" type="number" value="0" min="0">
            <button type="button" data-action="mas" data-id="${id}">+</button>
        `;

        contenedor.appendChild(div);
    });

    contenedor.addEventListener("click", function(e){
        if(e.target.tagName !== "BUTTON") return;

        const id = e.target.dataset.id;
        const action = e.target.dataset.action;
        const input = document.getElementById(id);
        let valor = Number(input.value || 0);

        if(action === "mas") valor++;
        if(action === "menos" && valor > 0) valor--;

        input.value = valor;
        actualizarTotalNecesidades();
    });

    contenedor.addEventListener("input", actualizarTotalNecesidades);
}

function crearId(texto){
    return "cat_" + texto
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\\u0300-\\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "_");
}

function recogerNecesidades(){
    const necesidades = {};

    document.querySelectorAll("#listaNecesidades input").forEach(input => {
        const valor = Number(input.value || 0);
        if(valor > 0){
            necesidades[input.dataset.categoria] = valor;
        }
    });

    return necesidades;
}

function actualizarTotalNecesidades(){
    let total = 0;

    document.querySelectorAll("#listaNecesidades input").forEach(input => {
        total += Number(input.value || 0);
    });

    document.getElementById("totalNecesidades").innerText = total;
}

function mostrarAviso(mensaje, tipo){
    const aviso = document.getElementById("aviso");
    aviso.style.display = "block";
    aviso.className = "aviso " + tipo;
    aviso.innerText = mensaje;
}

function limpiarFormulario(){
    document.getElementById("nombrePrueba").value = "";
    document.getElementById("fechaPrueba").value = "";
    document.getElementById("provinciaPrueba").value = "";
    document.getElementById("municipioPrueba").value = "";
    document.getElementById("latitud").value = "";
    document.getElementById("longitud").value = "";
    document.getElementById("observaciones").value = "";

    document.querySelectorAll("#listaNecesidades input").forEach(input => input.value = 0);
    actualizarTotalNecesidades();
}

async function guardarPrueba(){
    if(!usuarioActual){
        mostrarAviso("No hay sesión iniciada.", "error");
        return;
    }

    const nombre = document.getElementById("nombrePrueba").value.trim();
    const tipo = document.getElementById("tipoPrueba").value;
    const fecha = document.getElementById("fechaPrueba").value;
    const provincia = document.getElementById("provinciaPrueba").value.trim();
    const municipio = document.getElementById("municipioPrueba").value.trim();
    const latitud = document.getElementById("latitud").value.trim();
    const longitud = document.getElementById("longitud").value.trim();
    const observaciones = document.getElementById("observaciones").value.trim();
    const necesidades = recogerNecesidades();

    if(!nombre || !tipo || !fecha || !provincia || !municipio){
        mostrarAviso("Rellena nombre, tipo, fecha, provincia y municipio.", "error");
        return;
    }

    if(Object.keys(necesidades).length === 0){
        mostrarAviso("Indica al menos una necesidad de personal.", "error");
        return;
    }

    try{
        await addDoc(collection(db, "pruebas"), {
            nombre,
            tipo,
            fecha,
            provincia,
            municipio,
            latitud: latitud ? Number(latitud) : null,
            longitud: longitud ? Number(longitud) : null,
            observaciones,
            estado: "Borrador",
            necesidades,
            organizadorUid: usuarioActual.uid,
            organizadorEmail: usuarioActual.email,
            fechaCreacion: serverTimestamp()
        });

        mostrarAviso("Prueba guardada correctamente en Firebase.", "ok");
        limpiarFormulario();
        await cargarResumen();

    }catch(error){
        console.error(error);
        mostrarAviso("Error al guardar: " + error.code, "error");
    }
}

function obtenerUbicacion(){
    if(!navigator.geolocation){
        mostrarAviso("Este navegador no permite geolocalización.", "error");
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (pos) => {
            document.getElementById("latitud").value = pos.coords.latitude.toFixed(6);
            document.getElementById("longitud").value = pos.coords.longitude.toFixed(6);
            mostrarAviso("Ubicación obtenida correctamente.", "ok");
        },
        () => {
            mostrarAviso("No se pudo obtener la ubicación.", "error");
        }
    );
}

async function cargarResumen(){
    if(!usuarioActual) return;

    try{
        const q = query(collection(db, "pruebas"), where("organizadorUid", "==", usuarioActual.uid));
        const snap = await getDocs(q);

        document.getElementById("totalPruebas").innerText = snap.size;

        const ultimas = document.getElementById("ultimasPruebas");

        if(snap.empty){
            ultimas.innerHTML = "<p>Todavía no has creado pruebas.</p>";
            return;
        }

        let html = "<ul>";
        snap.forEach(docu => {
            const p = docu.data();
            html += `<li><strong>${p.nombre}</strong> · ${p.fecha} · ${p.municipio}</li>`;
        });
        html += "</ul>";

        ultimas.innerHTML = html;

    }catch(error){
        console.error(error);
    }
}

document.getElementById("btnGuardarPrueba").addEventListener("click", guardarPrueba);
document.getElementById("btnUbicacion").addEventListener("click", obtenerUbicacion);
document.getElementById("btnCerrarSesion").addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = "login.html";
});

pintarNecesidades();

onAuthStateChanged(auth, async (user) => {
    if(!user){
        window.location.href = "login.html";
        return;
    }

    usuarioActual = user;
    document.getElementById("usuarioInfo").innerText = "Sesión iniciada: " + user.email;

    await cargarResumen();
});

console.log("Panel organizador cargado correctamente");
