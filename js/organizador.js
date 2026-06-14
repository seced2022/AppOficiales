import { auth, db } from "./firebase-config.js?v=3";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import { collection, addDoc, getDocs, query, where, doc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

const CATEGORIAS=["Director de Carrera","Director Adjunto","Director de Prueba","Comisario Deportivo","Secretario de Carrera","Cronometrador","Jefe de Cronometraje","Jefe de Tramo","Jefe de Tramo Adjunto","Comisario de Ruta","Comisario Técnico","Relaciones con los Participantes","Médico","Prensa","SP (Servicios Profesionales)","Voluntario","Radio","Cortes"];
let usuarioActual=null, pruebasCache=[];

function crearId(t){return"cat_"+t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"_");}
function pintarNecesidades(){const c=document.getElementById("listaNecesidades");c.innerHTML="";CATEGORIAS.forEach(cat=>{const id=crearId(cat);const div=document.createElement("div");div.className="item-necesidad";div.innerHTML=`<span>${cat}</span><button type="button" data-action="menos" data-id="${id}">-</button><input id="${id}" data-categoria="${cat}" type="number" value="0" min="0"><button type="button" data-action="mas" data-id="${id}">+</button>`;c.appendChild(div);});c.addEventListener("click",e=>{if(e.target.tagName!=="BUTTON")return;const input=document.getElementById(e.target.dataset.id);let v=Number(input.value||0);if(e.target.dataset.action==="mas")v++;if(e.target.dataset.action==="menos"&&v>0)v--;input.value=v;actualizarTotalNecesidades();});c.addEventListener("input",actualizarTotalNecesidades);}
function recogerNecesidades(){const n={};document.querySelectorAll("#listaNecesidades input").forEach(i=>{const v=Number(i.value||0);if(v>0)n[i.dataset.categoria]=v;});return n;}
function actualizarTotalNecesidades(){let t=0;document.querySelectorAll("#listaNecesidades input").forEach(i=>t+=Number(i.value||0));document.getElementById("totalNecesidades").innerText=t;}
function mostrarAviso(m,t){const a=document.getElementById("aviso");a.style.display="block";a.className="aviso "+t;a.innerText=m;}
function limpiarFormulario(){["nombrePrueba","fechaPrueba","provinciaPrueba","municipioPrueba","observaciones"].forEach(id=>document.getElementById(id).value="");document.querySelectorAll("#listaNecesidades input").forEach(i=>i.value=0);actualizarTotalNecesidades();}

async function guardarPrueba(){
 const nombre=document.getElementById("nombrePrueba").value.trim(), tipo=document.getElementById("tipoPrueba").value, fecha=document.getElementById("fechaPrueba").value, provincia=document.getElementById("provinciaPrueba").value.trim(), municipio=document.getElementById("municipioPrueba").value.trim(), observaciones=document.getElementById("observaciones").value.trim(), necesidades=recogerNecesidades();
 if(!nombre||!tipo||!fecha||!provincia||!municipio){mostrarAviso("Rellena nombre, tipo, fecha, provincia y municipio.","error");return;}
 if(Object.keys(necesidades).length===0){mostrarAviso("Indica al menos una necesidad de personal.","error");return;}
 try{await addDoc(collection(db,"pruebas"),{nombre,tipo,fecha,provincia,municipio,observaciones,estado:"Borrador",necesidades,organizadorUid:usuarioActual.uid,organizadorEmail:usuarioActual.email,fechaCreacion:serverTimestamp()});mostrarAviso("Prueba guardada correctamente.","ok");limpiarFormulario();await cargarPruebas();}
 catch(error){console.error(error);mostrarAviso("Error al guardar: "+error.code,"error");}
}

async function cargarPruebas(){
 const q=query(collection(db,"pruebas"),where("organizadorUid","==",usuarioActual.uid));
 const snap=await getDocs(q);pruebasCache=[];snap.forEach(d=>pruebasCache.push({id:d.id,...d.data()}));
 document.getElementById("totalPruebas").innerText=pruebasCache.length;
 const lista=document.getElementById("listaPruebas"); if(pruebasCache.length===0){lista.innerHTML="<p>Todavía no has creado pruebas.</p>";return;}
 lista.innerHTML="";
 pruebasCache.forEach(p=>{const card=document.createElement("div");card.className="prueba-card";card.innerHTML=`<h3>${p.nombre}</h3><p>${p.fecha} · ${p.municipio}, ${p.provincia}</p><p><strong>Estado:</strong> ${p.estado}</p><div class="acciones"><button class="azul" data-abrir="${p.id}">Abrir</button><button class="blanco" data-buscar="${p.id}">Buscar oficiales</button><button class="rojo" data-eliminar="${p.id}">Eliminar</button></div>`;lista.appendChild(card);});
}

document.getElementById("listaPruebas").addEventListener("click",async e=>{
 const abrir=e.target.dataset.abrir, buscar=e.target.dataset.buscar, eliminar=e.target.dataset.eliminar;
 if(abrir) abrirPrueba(abrir);
 if(buscar) await buscarOficiales(buscar);
 if(eliminar) await eliminarPrueba(eliminar);
});
function abrirPrueba(id){
 const p=pruebasCache.find(x=>x.id===id); if(!p)return;
 let html=`<h3>${p.nombre}</h3><p>${p.fecha} · ${p.municipio}, ${p.provincia}</p><p><strong>Tipo:</strong> ${p.tipo}</p><h3>Necesidades</h3><ul>`;
 Object.entries(p.necesidades||{}).forEach(([k,v])=>html+=`<li>${k}: <strong>${v}</strong></li>`);
 html+="</ul>";
 document.getElementById("contenidoDetalle").innerHTML=html;
 document.getElementById("detallePrueba").classList.add("visible");
}
async function eliminarPrueba(id){
 if(!confirm("¿Eliminar esta prueba?"))return;
 await deleteDoc(doc(db,"pruebas",id));
 await cargarPruebas();
}
function categoriasDeOficial(o){return [...(o.licenciasOficiales||[]),...(o.personalApoyo||[])];}
async function buscarOficiales(id){
 const p=pruebasCache.find(x=>x.id===id); if(!p)return;
 const snap=await getDocs(collection(db,"oficiales"));
 const oficiales=[];snap.forEach(d=>{const o=d.data();if(o.disponible===true && o.licenciaVigente===true)oficiales.push(o);});
 document.getElementById("totalOficiales").innerText=oficiales.length;
 let html=`<h3>${p.nombre}</h3><p>Solo se muestran ID anónimo, municipio, provincia y categorías compatibles.</p>`;
 Object.keys(p.necesidades||{}).forEach(cat=>{
   const compatibles=oficiales.filter(o=>categoriasDeOficial(o).includes(cat));
   html+=`<h3 class="categoria-titulo">${cat} · necesarios: ${p.necesidades[cat]} · compatibles: ${compatibles.length}</h3>`;
   if(compatibles.length===0){html+="<p>No hay oficiales compatibles.</p>";}
   compatibles.forEach(o=>{html+=`<div class="resultado-card"><strong>${o.idOficial||"OF-SIN-ID"}</strong><br>${o.municipio||""}, ${o.provincia||""}<br><small>${cat}</small></div>`;});
 });
 document.getElementById("contenidoResultados").innerHTML=html;
 document.getElementById("resultadosOficiales").classList.add("visible");
}
document.getElementById("btnGuardarPrueba").addEventListener("click",guardarPrueba);
document.getElementById("btnCerrarSesion").addEventListener("click",async()=>{await signOut(auth);window.location.href="login.html";});
pintarNecesidades();
onAuthStateChanged(auth,async(user)=>{if(!user){window.location.href="login.html";return;}usuarioActual=user;document.getElementById("usuarioInfo").innerText="Sesión iniciada: "+user.email;await cargarPruebas();});
