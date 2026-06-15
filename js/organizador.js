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
    serverTimestamp,
    deleteDoc,
    doc,
    setDoc
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

function abrirPrueba(prueba){

    const detalle = document.getElementById("detallePrueba");

    let necesidadesHtml = "";

    if(prueba.necesidades){
        Object.entries(prueba.necesidades).forEach(([categoria,cantidad]) => {
            necesidadesHtml += `
                <li>${categoria}: <strong>${cantidad}</strong></li>
            `;
        });
    }

    detalle.innerHTML = `
        <h2>🏁 ${prueba.nombre}</h2>

        <p><strong>Tipo:</strong> ${prueba.tipo}</p>
        <p><strong>Fecha:</strong> ${prueba.fecha}</p>
        <p><strong>Municipio:</strong> ${prueba.municipio}</p>
        <p><strong>Provincia:</strong> ${prueba.provincia}</p>

        <h3>Necesidades</h3>
        <ul>${necesidadesHtml}</ul>

        <button
            type="button"
            onclick="buscarOficialesCompatibles(window.pruebaAbierta)"
            style="
                border:0;
                background:#0b6bff;
                color:white;
                border-radius:12px;
                padding:12px 16px;
                font-weight:bold;
                cursor:pointer;
                margin-top:12px;
            ">
            Buscar oficiales compatibles
        </button>

        <div id="resultadosOficiales" style="margin-top:20px;"></div>
    `;

    window.pruebaAbierta = prueba;
    detalle.style.display = "block";
}

window.abrirPrueba = abrirPrueba;

async function buscarOficialesCompatibles(prueba){

    const resultados = document.getElementById("resultadosOficiales");
    resultados.innerHTML = "<p>Buscando oficiales compatibles...</p>";

    const categoriasNecesarias = Object.keys(prueba.necesidades || {});

    try{
        const snap = await getDocs(collection(db, "oficiales"));

        let html = "<h3>Oficiales compatibles</h3>";
        let encontrados = 0;

        snap.forEach(docu => {
            const oficial = docu.data();

            if(oficial.disponible !== true) return;
            if(oficial.licenciaVigente !== true) return;

            const categoriasOficial = [
                ...(oficial.licenciasOficiales || []),
                ...(oficial.personalApoyo || [])
            ];

            const coincidencias = categoriasNecesarias.filter(cat =>
                categoriasOficial.includes(cat)
            );

            if(coincidencias.length > 0){
                encontrados++;

                html += `
    <div style="
        background:#f5f9ff;
        border:1px solid #d8e3f0;
        border-radius:14px;
        padding:14px;
        margin-bottom:10px;
    ">

        <strong>${oficial.idOficial || "Sin ID"}</strong>

        <p style="margin:5px 0;">
            📍 ${oficial.municipio || ""}, ${oficial.provincia || ""}
        </p>

        <p style="margin:5px 0;">
            🚗 Vehículo propio: ${oficial.vehiculoPropio || "No indicado"}
        </p>

        <p style="margin:5px 0;">
            📏 Distancia máxima: ${oficial.distanciaMaxima || "No indicada"} km
        </p>

        <p style="margin:5px 0;">
            Coincide: ${coincidencias.join(", ")}
        </p>

        <button
            type="button"
            onclick='seleccionarOficial(
                window.pruebaAbierta,
                ${JSON.stringify(oficial).replace(/'/g,"&#39;")},
                ${JSON.stringify(coincidencias).replace(/'/g,"&#39;")},
                this
            )'
            style="
                margin-top:10px;
                border:0;
                background:#0b6bff;
                color:white;
                border-radius:12px;
                padding:10px 14px;
                font-weight:bold;
                cursor:pointer;
            ">
            Seleccionar
        </button>

    </div>
`;
            }
        });

        if(encontrados === 0){
            html += "<p>No se encontraron oficiales compatibles.</p>";
        }

        resultados.innerHTML = html;

    }catch(error){
        console.error(error);
        resultados.innerHTML = "<p>Error buscando oficiales.</p>";
    }
}

window.buscarOficialesCompatibles = buscarOficialesCompatibles;

async function seleccionarOficial(prueba, oficial, coincidencias, boton){

    if(!prueba || !oficial){
        alert("Faltan datos para seleccionar.");
        return;
    }

    try{
        boton.disabled = true;
        boton.innerText = "Guardando...";

        const idPreseleccion = prueba.id + "_" + oficial.uid;

        await setDoc(doc(db, "preselecciones", idPreseleccion), {
            pruebaId: prueba.id,
            pruebaNombre: prueba.nombre,
            pruebaFecha: prueba.fecha,
            pruebaMunicipio: prueba.municipio,
            pruebaProvincia: prueba.provincia,

            organizadorUid: usuarioActual.uid,
            organizadorEmail: usuarioActual.email,

            oficialUid: oficial.uid,
            idOficial: oficial.idOficial,

            categoriasCoincidentes: coincidencias,
            estado: "Preseleccionado",

            fechaCreacion: serverTimestamp()
        });

        boton.innerText = "✓ Seleccionado";
        boton.style.background = "#137a34";
        boton.style.color = "white";

    }catch(error){
        console.error(error);
        boton.disabled = false;
        boton.innerText = "Seleccionar";
        alert("Error al seleccionar: " + error.code);
    }
}

window.seleccionarOficial = seleccionarOficial;

async function eliminarPrueba(idPrueba){

    const confirmar = confirm(
        "¿Seguro que quieres eliminar esta prueba?"
    );

    if(!confirmar) return;

    try{

        await deleteDoc(
            doc(db, "pruebas", idPrueba)
        );

        mostrarAviso(
            "Prueba eliminada correctamente.",
            "ok"
        );

        document.getElementById("detallePrueba").style.display = "none";

        await cargarResumen();

    }catch(error){

        console.error(error);

        mostrarAviso(
            "Error al eliminar: " + error.code,
            "error"
        );
    }
}

window.eliminarPrueba = eliminarPrueba;

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
        const q = query(
            collection(db, "pruebas"),
            where("organizadorUid", "==", usuarioActual.uid)
        );

        const snap = await getDocs(q);

        document.getElementById("totalPruebas").innerText = snap.size;

        const ultimas = document.getElementById("ultimasPruebas");

        if(snap.empty){
            ultimas.innerHTML = `
                <p>Todavía no has creado pruebas.</p>
            `;
            return;
        }

        let html = "";

        window.pruebasGuardadas = [];
        
        let indice = 0;

        snap.forEach(docu => {
            const p = docu.data();
            p.id = docu.id;
            
            window.pruebasGuardadas.push(p);

            html += `
                <div style="
                    background:#f5f9ff;
                    border:1px solid #d8e3f0;
                    border-radius:18px;
                    padding:18px;
                    margin-bottom:14px;
                ">
                    <h3 style="margin:0 0 10px;color:#063c8f;">
                        🏁 ${p.nombre || "Prueba sin nombre"}
                    </h3>

                    <p style="margin:5px 0;">
                        📅 <strong>Fecha:</strong> ${p.fecha || "Sin fecha"}
                    </p>

                    <p style="margin:5px 0;">
                        📍 <strong>Municipio:</strong> ${p.municipio || ""}
                    </p>

                    <p style="margin:5px 0;">
                        🗺️ <strong>Provincia:</strong> ${p.provincia || ""}
                    </p>

                    <p style="margin:5px 0;">
                        📌 <strong>Estado:</strong> ${p.estado || "Borrador"}
                    </p>

                    <div style="margin-top:14px;display:flex;gap:10px;flex-wrap:wrap;">

    <button
        type="button"
        onclick="abrirPrueba(window.pruebasGuardadas[${indice}])"
        style="
            border:0;
            background:#0b6bff;
            color:white;
            border-radius:12px;
            padding:10px 14px;
            font-weight:bold;
            cursor:pointer;
        ">
        Abrir
    </button>

    <button
    type="button"
    onclick="eliminarPrueba(window.pruebasGuardadas[${indice}].id)"
    style="
        border:1px solid #d9534f;
        background:white;
        color:#d9534f;
        border-radius:12px;
        padding:10px 14px;
        font-weight:bold;
        cursor:pointer;
    ">
    Eliminar
</button>

</div>
                    
                    </div>
                </div>
            `;
       
         indice++;
        
        });

       

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
