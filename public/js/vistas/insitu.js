import { $, claro, retrato } from "../util/dom.js";
import { obtenerConfiguracion } from "../datos/repo-configuracion.js";
import { obtenerEncuestador, verificarElegibilidadInsitu, enviarRespuestaInsitu } from "../datos/repo-insitu.js";

/* Pantalla del encuestador (celular). Distrito/encuestador/barrio vienen
   FIJOS del token de la URL (?vista=insitu&encuestador=TOKEN) — nunca se
   leen de un formulario, así el encuestador no puede cambiarlos. Sin
   login: la identidad es poseer ese link, igual que el gate de código
   especial del sondeo virtual.

   Pasos: 0 inicio · 1 cédula · 2 intendente · 3 lista · 4 concejal ·
   5 confirmar · 6 gracias. */
export function iniciar() {
  const token = new URLSearchParams(location.search).get("encuestador") || "";
  let enc = null, cfg = null, R = {};
  let paso = 0;

  $("#vistaParticipante").classList.add("oculto");
  $("#vistaInsitu").classList.remove("oculto");

  async function iniciarCarga() {
    if (!token) { mostrarError("Falta el link del encuestador."); return; }
    try {
      enc = await obtenerEncuestador(token);
    } catch (e) { mostrarError("No se pudo verificar el link. Probá de nuevo."); return; }
    if (!enc) { mostrarError("Este link no es válido."); return; }
    if (!enc.activo) { mostrarError("Este link fue desactivado por el administrador."); return; }

    $("#isDistrito").textContent = enc.distrito;
    $("#isEncuestador").textContent = `${enc.nombre} ${enc.apellido}`;
    $("#isBarrio").textContent = enc.barrio || "(sin barrio asignado)";

    const doc = await obtenerConfiguracion(enc.distrito);
    if (!doc.exists) { mostrarError("Este distrito todavía no tiene candidatos cargados."); return; }
    cfg = doc.data();
    irA(0);
  }
  iniciarCarga();

  function mostrarError(msg) {
    $("#isHome").classList.add("oculto");
    $("#isError").classList.remove("oculto");
    $("#isErrorTexto").textContent = msg;
  }

  $("#isNuevaEncuesta").addEventListener("click", () => { R = {}; irA(1); });

  $("#isCi").addEventListener("input", e => {
    e.target.value = e.target.value.replace(/\D/g, "").slice(0, 10);
    R.ci = e.target.value;
    $("#isCiEstado").textContent = ""; $("#isCiEstado").className = "aviso";
  });
  $("#isCiVerificar").addEventListener("click", verificarCedula);
  $("#isCi").addEventListener("keydown", e => { if (e.key === "Enter") verificarCedula(); });

  $("#isIntendentes").addEventListener("click", e => {
    const b = e.target.closest(".tarjeta"); if (!b) return;
    [...$("#isIntendentes").children].forEach(c => c.dataset.sel = "0"); b.dataset.sel = "1";
    const i = +b.dataset.i;
    R.intendente = i >= 0 ? cfg.intendentes[i] : { lista: 0, nombre: i === -1 ? "VOTO EN BLANCO" : "NS/NC" };
    setTimeout(() => irA(3), 200);
  });

  $("#isListas").addEventListener("click", e => {
    const b = e.target.closest(".lista"); if (!b) return;
    R.lista = +b.dataset.lista; R.concejal = null;
    if (R.lista === 0) { armarPreview(); irA(5); return; }
    pintarConcejales(R.lista); irA(4);
  });

  $("#isConcejales").addEventListener("click", e => {
    const b = e.target.closest(".concejal"); if (!b) return;
    [...$("#isConcejales").children].forEach(c => c.dataset.sel = "0"); b.dataset.sel = "1";
    const op = +b.dataset.op;
    R.concejal = { op, nombre: cfg.listas[R.lista].candidatos[op - 1] };
    setTimeout(() => { armarPreview(); irA(5); }, 200);
  });

  $("#isAtras").addEventListener("click", () => {
    if (paso === 3) irA(2);
    else if (paso === 4) irA(3);
    else if (paso === 5) irA(R.lista === 0 ? 3 : 4);
  });

  $("#isConfirmar").addEventListener("click", enviar);
  $("#isVolverHome").addEventListener("click", () => irA(0));

  async function verificarCedula() {
    if (!R.ci || R.ci.length < 6) return;
    $("#isCiEstado").className = "aviso"; $("#isCiEstado").textContent = "Verificando…";
    $("#isCiVerificar").disabled = true;
    try {
      const r = await verificarElegibilidadInsitu(token, R.ci);
      if (r.estado === "ya_participo") { $("#isCiEstado").className = "aviso malo"; $("#isCiEstado").textContent = "Esta persona ya participó anteriormente en este relevamiento."; $("#isCiVerificar").disabled = false; return; }
      if (r.estado === "demasiados_intentos") { $("#isCiEstado").className = "aviso malo"; $("#isCiEstado").textContent = "Demasiados intentos seguidos. Esperá un momento."; $("#isCiVerificar").disabled = false; return; }
      if (r.estado === "token_invalido") { mostrarError("Este link ya no es válido."); return; }
      if (r.estado !== "ok") { $("#isCiEstado").className = "aviso malo"; $("#isCiEstado").textContent = "La persona no se encuentra habilitada para participar en este relevamiento para este distrito."; $("#isCiVerificar").disabled = false; return; }
      $("#isCiVerificar").disabled = false;
      pintarIntendentes();
      irA(2);
    } catch (e) {
      $("#isCiEstado").className = "aviso malo"; $("#isCiEstado").textContent = "No se pudo verificar. Probá de nuevo.";
      $("#isCiVerificar").disabled = false;
    }
  }

  function pintarIntendentes() {
    const cards = cfg.intendentes.map((c, i) =>
      `<button class="tarjeta" data-i="${i}" data-sel="0" style="background:${c.color};color:${claro(c.color)}">
        <span class="marca">ELEGIDO</span>
        <span class="rotulo">${c.partido}</span>
        <span class="foto">${retrato(c.nombre, c.foto)}</span>
        <span class="listaNum">LISTA<b>${c.lista}</b></span>
        <span class="pie">${c.nombre}</span></button>`);
    cards.push(`<button class="tarjeta" data-i="-1" data-sel="0" style="background:#fff">
        <span class="pie" style="margin:auto;font-size:16px">VOTO EN BLANCO</span></button>`);
    cards.push(`<button class="tarjeta" data-i="-2" data-sel="0" style="background:#f4f4f2">
        <span class="pie" style="margin:auto;font-size:16px">NO SABE / NO RESPONDE</span></button>`);
    $("#isIntendentes").innerHTML = cards.join("");
  }
  function pintarListas() {
    const items = Object.keys(cfg.listas).map(n =>
      `<button class="lista" data-lista="${n}" style="background:${cfg.listas[n].color};color:${claro(cfg.listas[n].color)}">
        <span class="num">LISTA ${n}</span><span class="nombre">${cfg.listas[n].nombre}</span></button>`);
    items.push(`<button class="lista" data-lista="0" style="background:#fff"><span class="num"></span><span class="nombre">VOTO EN BLANCO / NS-NC</span></button>`);
    $("#isListas").innerHTML = items.join("");
  }
  function pintarConcejales(n) {
    const p = cfg.listas[n], t = $("#isTituloConcejales");
    t.textContent = `Lista ${n} — ${p.nombre}`; t.style.background = p.color; t.style.color = claro(p.color);
    $("#isConcejales").innerHTML = p.candidatos.map((c, i) =>
      `<button class="concejal" data-op="${i + 1}" data-sel="0">
        <span class="cabecera">${retrato(c, (p.fotos && p.fotos[i]) || "", true)}<span class="op">OPCIÓN<b>${i + 1}</b></span></span>
        <span class="nom">${c}</span></button>`).join("");
  }
  function armarPreview() {
    $("#isPrevIntendente").textContent = R.intendente.nombre;
    $("#isPrevConcejal").textContent = R.lista === 0 ? "VOTO EN BLANCO / NS-NC" : `${R.concejal.nombre} (Lista ${R.lista})`;
  }

  function irA(n) {
    paso = n;
    document.querySelectorAll("#vistaInsitu .is-pantalla").forEach(s => s.classList.add("oculto"));
    if (n === 0) { $("#isHome").classList.remove("oculto"); $("#isContador").textContent = enc.encuestas; }
    if (n === 1) { $("#isPasoCi").classList.remove("oculto"); $("#isCi").value = ""; R.ci = ""; $("#isCiEstado").textContent = ""; $("#isCi").focus(); }
    if (n === 2) $("#isPasoIntendentes").classList.remove("oculto");
    if (n === 3) { $("#isPasoListas").classList.remove("oculto"); pintarListas(); }
    if (n === 4) $("#isPasoConcejales").classList.remove("oculto");
    if (n === 5) $("#isPasoConfirmar").classList.remove("oculto");
    if (n === 6) $("#isGracias").classList.remove("oculto");
    window.scrollTo(0, 0);
  }

  async function enviar() {
    $("#isConfirmar").disabled = true; $("#isConfirmar").textContent = "Enviando…";
    try {
      const estado = await enviarRespuestaInsitu({
        token, cedula: R.ci,
        intendente_lista: R.intendente.lista, intendente_nombre: R.intendente.nombre,
        junta_lista: R.lista,
        concejal_opcion: R.concejal ? R.concejal.op : null,
        concejal_nombre: R.concejal ? R.concejal.nombre : null
      });
      if (estado !== "ok") {
        const mensajes = { ya_participo: "Esta persona ya participó anteriormente en este relevamiento.", no_habilitado: "La persona no se encuentra habilitada para participar en este relevamiento para este distrito.", demasiados_intentos: "Demasiados intentos seguidos. Esperá un momento." };
        alert(mensajes[estado] || "No se pudo enviar: " + estado);
        $("#isConfirmar").disabled = false; $("#isConfirmar").textContent = "Confirmar y enviar"; return;
      }
      enc.encuestas++;
      $("#isConfirmar").disabled = false; $("#isConfirmar").textContent = "Confirmar y enviar";
      irA(6);
    } catch (e) {
      alert("No se pudo enviar. Revisá tu conexión.");
      $("#isConfirmar").disabled = false; $("#isConfirmar").textContent = "Confirmar y enviar";
    }
  }
}
