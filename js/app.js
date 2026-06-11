import { db, auth } from "./firebase-config.js";

import {
    collection,
    addDoc,
    getDocs,
    query,
    where,
    orderBy,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

let usuarioActual = null;

function toggleSidebar(){
    document.body.classList.toggle("sidebar-mini");
}

function openModal(id){
    if(!usuarioActual){
        alert("Debes iniciar sesión para usar esta función.");
        window.location.href = "login.html";
        return;
    }

    const modal = document.getElementById(id);
    if(modal){
        modal.classList.add("show");
    }
}

function closeModal(id){
    const modal = document.getElementById(id);
    if(modal){
        modal.classList.remove("show");
    }
}

function goLogin(){
    if(!usuarioActual){
        window.location.href = "login.html";
    }
}

async function logoutUser(){
    await signOut(auth);
    window.location.href = "login.html";
}

function setNotice(id, msg, ok = true){
    const box = document.getElementById(id);
    if(!box) return;
    box.textContent = msg;
    box.className = ok ? "modal-notice ok" : "modal-notice error";
}

function limpiarCampos(ids){
    ids.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.value = "";
    });
}

function generarIdOficial(){
    const numero = Math.floor(1000 + Math.random() * 9000);
    return "OF-" + numero;
}

async function guardarOficial(){
    const nombre = document.getElementById("oficialNombre").value.trim();
    const email = document.getElementById("oficialEmail").value.trim();
    const municipio = document.getElementById("oficialMunicipio").value.trim();
    const provincia = document.getElementById("oficialProvincia").value.trim();
    const categoria = document.getElementById("oficialCategoria").value;

    if(!nombre || !municipio || !provincia || !categoria){
        setNotice("noticeOficial", "Rellena nombre, municipio, provincia y categoría.", false);
        return;
    }

    try{
        await addDoc(collection(db, "oficiales"), {
            idOficial: generarIdOficial(),
            nombre,
            email,
            municipio,
            provincia,
            categoria,
            disponible: true,
            activo: true,
            creadoPor: usuarioActual.uid,
            fechaAlta: serverTimestamp()
        });

        setNotice("noticeOficial", "Oficial guardado correctamente.");
        limpiarCampos(["oficialNombre","oficialEmail","oficialMunicipio"]);
        cargarDashboard();

    }catch(error){
        console.error(error);
        setNotice("noticeOficial", "Error al guardar oficial: " + error.code, false);
    }
}

async function guardarPrueba(){
    const nombre = document.getElementById("pruebaNombre").value.trim();
    const fecha = document.getElementById("pruebaFecha").value;
    const municipio = document.getElementById("pruebaMunicipio").value.trim();
    const provincia = document.getElementById("pruebaProvincia").value.trim();

    if(!nombre || !fecha || !municipio || !provincia){
        setNotice("noticePrueba", "Rellena todos los campos.", false);
        return;
    }

    try{
        await addDoc(collection(db, "pruebas"), {
            nombre,
            fecha,
            municipio,
            provincia,
            estado: "Programada",
            creadoPor: usuarioActual.uid,
            fechaAlta: serverTimestamp()
        });

        setNotice("noticePrueba", "Prueba creada correctamente.");
        limpiarCampos(["pruebaNombre","pruebaFecha","pruebaMunicipio"]);
        cargarDashboard();

    }catch(error){
        console.error(error);
        setNotice("noticePrueba", "Error al crear prueba: " + error.code, false);
    }
}

async function guardarConvocatoria(){
    const pruebaId = document.getElementById("convocatoriaPrueba").value;
    const pruebaTexto = document.getElementById("convocatoriaPrueba").selectedOptions[0]?.textContent || "";
    const categoria = document.getElementById("convocatoriaCategoria").value;
    const cantidad = Number(document.getElementById("convocatoriaCantidad").value);

    if(!pruebaId || !categoria || !cantidad){
        setNotice("noticeConvocatoria", "Selecciona prueba, categoría y cantidad.", false);
        return;
    }

    try{
        await addDoc(collection(db, "convocatorias"), {
            pruebaId,
            pruebaNombre: pruebaTexto,
            categoria,
            cantidad,
            estado: "Pendiente",
            confirmadas: 0,
            creadoPor: usuarioActual.uid,
            fechaAlta: serverTimestamp()
        });

        setNotice("noticeConvocatoria", "Convocatoria creada correctamente.");
        limpiarCampos(["convocatoriaCantidad"]);
        cargarDashboard();

    }catch(error){
        console.error(error);
        setNotice("noticeConvocatoria", "Error al crear convocatoria: " + error.code, false);
    }
}

async function cargarDashboard(){
    try{
        const oficialesSnap = await getDocs(collection(db, "oficiales"));
        const pruebasSnap = await getDocs(collection(db, "pruebas"));
        const convocatoriasSnap = await getDocs(collection(db, "convocatorias"));

        document.getElementById("statOficiales").textContent = oficialesSnap.size;
        document.getElementById("statPruebas").textContent = pruebasSnap.size;

        let pendientes = 0;
        let confirmadas = 0;

        convocatoriasSnap.forEach(docu => {
            const data = docu.data();
            if(data.estado === "Pendiente") pendientes++;
            if(data.estado === "Confirmada" || data.estado === "Completa") confirmadas++;
        });

        document.getElementById("statPendientes").textContent = pendientes;
        document.getElementById("statConfirmadas").textContent = confirmadas;

        cargarZonas(oficialesSnap);
        cargarPruebas(pruebasSnap);
        cargarSelectorPruebas(pruebasSnap);

    }catch(error){
        console.error("Error cargando dashboard", error);
        const lista = document.getElementById("listaPruebas");
        if(lista){
            lista.innerHTML = `<div class="empty-state"><i class="bi bi-exclamation-triangle"></i><p>Error cargando Firebase: ${error.code}</p></div>`;
        }
    }
}

function cargarZonas(oficialesSnap){
    const zonas = {
        aviles: 0,
        oviedo: 0,
        gijon: 0,
        llanes: 0,
        oriente: 0
    };

    oficialesSnap.forEach(docu => {
        const data = docu.data();
        const municipio = (data.municipio || "").toLowerCase();

        if(municipio.includes("aviles") || municipio.includes("avilés")) zonas.aviles++;
        else if(municipio.includes("oviedo")) zonas.oviedo++;
        else if(municipio.includes("gijon") || municipio.includes("gijón")) zonas.gijon++;
        else if(municipio.includes("llanes")) zonas.llanes++;
        else zonas.oriente++;
    });

    document.getElementById("zonaAviles").textContent = zonas.aviles;
    document.getElementById("zonaOviedo").textContent = zonas.oviedo;
    document.getElementById("zonaGijon").textContent = zonas.gijon;
    document.getElementById("zonaLlanes").textContent = zonas.llanes;
    document.getElementById("zonaOriente").textContent = zonas.oriente;
}

function cargarPruebas(pruebasSnap){
    const lista = document.getElementById("listaPruebas");
    if(!lista) return;

    if(pruebasSnap.empty){
        lista.innerHTML = `<div class="empty-state"><i class="bi bi-calendar-x"></i><p>No hay pruebas todavía. Crea la primera desde “Nueva Prueba”.</p></div>`;
        return;
    }

    let html = "";

    pruebasSnap.forEach(docu => {
        const p = docu.data();
        const fecha = p.fecha || "";
        const partes = fecha.split("-");
        const dia = partes[2] || "--";
        const mes = obtenerMes(partes[1]);

        html += `
        <div class="event-row">
            <div class="date"><span>${mes}</span>${dia}</div>
            <div>
                <strong>${p.nombre || "Prueba sin nombre"}</strong>
                <small>${p.municipio || ""}, ${p.provincia || ""}</small>
            </div>
            <em>${p.estado || "Programada"}</em>
            <i class="bi bi-chevron-right"></i>
        </div>`;
    });

    lista.innerHTML = html;
}

function cargarSelectorPruebas(pruebasSnap){
    const selector = document.getElementById("convocatoriaPrueba");
    if(!selector) return;

    selector.innerHTML = `<option value="">Seleccionar prueba</option>`;

    pruebasSnap.forEach(docu => {
        const p = docu.data();
        const opt = document.createElement("option");
        opt.value = docu.id;
        opt.textContent = p.nombre || "Prueba sin nombre";
        selector.appendChild(opt);
    });
}

function obtenerMes(mes){
    const meses = {
        "01":"ENE","02":"FEB","03":"MAR","04":"ABR","05":"MAY","06":"JUN",
        "07":"JUL","08":"AGO","09":"SEP","10":"OCT","11":"NOV","12":"DIC"
    };
    return meses[mes] || "---";
}

document.addEventListener("click", function(e){
    if(e.target.classList.contains("modal")){
        e.target.classList.remove("show");
    }
});

onAuthStateChanged(auth, (user) => {
    usuarioActual = user;

    const userName = document.getElementById("userName");
    const welcomeText = document.getElementById("welcomeText");
    const heroText = document.getElementById("heroText");
    const logoutBtn = document.getElementById("logoutBtn");

    if(user){
        userName.textContent = user.email;
        welcomeText.textContent = "Sesión iniciada · " + user.email;
        heroText.textContent = "Ya puedes crear oficiales, pruebas y convocatorias conectadas a Firestore.";
        logoutBtn.style.display = "inline-grid";
        cargarDashboard();
    }else{
        userName.textContent = "Entrar";
        welcomeText.textContent = "Modo consulta · inicia sesión para gestionar datos";
        heroText.textContent = "Accede para gestionar oficiales, pruebas y convocatorias por cercanía.";
        logoutBtn.style.display = "none";
        cargarDashboard();
    }
});

window.toggleSidebar = toggleSidebar;
window.openModal = openModal;
window.closeModal = closeModal;
window.goLogin = goLogin;
window.logoutUser = logoutUser;
window.guardarOficial = guardarOficial;
window.guardarPrueba = guardarPrueba;
window.guardarConvocatoria = guardarConvocatoria;
