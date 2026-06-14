import { auth, db } from "./firebase-config.js?v=3";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

const LICENCIAS_OFICIALES = ["Director de Carrera","Director Adjunto","Director de Prueba","Comisario Deportivo","Secretario de Carrera","Cronometrador","Jefe de Cronometraje","Jefe de Tramo","Jefe de Tramo Adjunto","Comisario de Ruta","Comisario Técnico","Relaciones con los Participantes"];
const PERSONAL_APOYO = ["Médico","Prensa","SP (Servicios Profesionales)","Voluntario","Radio","Cortes"];
let usuarioActual = null;

function pintarChecks(contenedorId, lista, nombreCampo){
    const contenedor = document.getElementById(contenedorId);
    contenedor.innerHTML = "";
    lista.forEach(item => {
        const label = document.createElement("label");
        label.className = "check";
        label.innerHTML = `<input type="checkbox" name="${nombreCampo}" value="${item}"><span>${item}</span>`;
        contenedor.appendChild(label);
    });
}
function obtenerSeleccionados(nombreCampo){
    return Array.from(document.querySelectorAll(`input[name="${nombreCampo}"]:checked`)).map(input => input.value);
}
function marcarSeleccionados(nombreCampo, valores){
    if(!Array.isArray(valores)) return;
    document.querySelectorAll(`input[name="${nombreCampo}"]`).forEach(input => input.checked = valores.includes(input.value));
}
function mostrarAviso(mensaje, tipo){
    const aviso = document.getElementById("aviso");
    aviso.style.display = "block";
    aviso.className = "aviso " + tipo;
    aviso.innerText = mensaje;
}
function generarIdOficial(uid){ return "OF-" + uid.slice(0, 6).toUpperCase(); }

function cargarFormulario(data){
    ["idOficial","nombre","apellidos","dni","fechaNacimiento","email","telefono","provincia","municipio","codigoPostal","vehiculoPropio","distanciaMaxima","observaciones"].forEach(id=>{
        if(document.getElementById(id)) {
            document.getElementById(id).value = data[id] || document.getElementById(id).value || "";
        }
    });

    document.getElementById("disponible").value = String(data.disponible ?? true);
    document.getElementById("licenciaVigente").value = String(data.licenciaVigente ?? true);

    document.getElementById("federacion").value = data.federacion || "";
    document.getElementById("numeroLicencia").value = data.numeroLicencia || "";

    marcarSeleccionados("licenciasOficiales", data.licenciasOficiales || []);
    marcarSeleccionados("personalApoyo", data.personalApoyo || []);
}

async function cargarPerfil(){
    const ref = doc(db, "oficiales", usuarioActual.uid);
    c onst snap = await getDoc(ref);
    if(snap.exists()){
        cargarFormulario(snap.data());
    }else{
        document.getElementById("idOficial").value = generarIdOficial(usuarioActual.uid);
        document.getElementById("email").value = usuarioActual.email || "";
    }
}
async function guardarPerfil(){
    if(!usuarioActual){ mostrarAviso("No hay sesión iniciada.", "error"); return; }
    const nombre = document.getElementById("nombre").value.trim();
    const apellidos = document.getElementById("apellidos").value.trim();
    const provincia = document.getElementById("provincia").value.trim();
    const municipio = document.getElementById("municipio").value.trim();
    if(!nombre || !apellidos || !provincia || !municipio){
        mostrarAviso("Rellena nombre, apellidos, provincia y municipio.", "error"); return;
    }
    const data = {
        uid: usuarioActual.uid,
        idOficial: document.getElementById("idOficial").value,
        nombre, apellidos,
        dni: document.getElementById("dni").value.trim(),
        fechaNacimiento: document.getElementById("fechaNacimiento").value,
        email: document.getElementById("email").value.trim(),
        telefono: document.getElementById("telefono").value.trim(),
        provincia, municipio,
        codigoPostal: document.getElementById("codigoPostal").value.trim(),
        licenciasOficiales: obtenerSeleccionados("licenciasOficiales"),
        personalApoyo: obtenerSeleccionados("personalApoyo"),
        vehiculoPropio: document.getElementById("vehiculoPropio").value,
        distanciaMaxima: document.getElementById("distanciaMaxima").value,
        disponible: document.getElementById("disponible").value === "true",
        licenciaVigente: document.getElementById("licenciaVigente").value === "true",
        observaciones: document.getElementById("observaciones").value.trim(),
        federacion: document.getElementById("federacion").value,
        numeroLicencia: document.getElementById("numeroLicencia").value.trim(),
        actualizadoEn: serverTimestamp(),
    };
    try{
        await setDoc(doc(db, "oficiales", usuarioActual.uid), data, { merge:true });
        mostrarAviso("Perfil guardado correctamente.", "ok");
    }catch(error){
        console.error(error);
        mostrarAviso("Error al guardar: " + error.code, "error");
    }
}
document.getElementById("btnGuardar").addEventListener("click", guardarPerfil);
document.getElementById("btnCerrarSesion").addEventListener("click", async () => { await signOut(auth); window.location.href = "login.html"; });
pintarChecks("licenciasOficiales", LICENCIAS_OFICIALES, "licenciasOficiales");
pintarChecks("personalApoyo", PERSONAL_APOYO, "personalApoyo");
onAuthStateChanged(auth, async (user) => {
    if(!user){ window.location.href = "login.html"; return; }
    usuarioActual = user;
    document.getElementById("usuarioInfo").innerText = "Sesión iniciada: " + user.email;
    await cargarPerfil();
});
console.log("Panel oficial cargado correctamente");
