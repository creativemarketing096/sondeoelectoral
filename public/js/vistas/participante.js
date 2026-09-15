import { $, claro, retrato } from "../util/dom.js";
import { OPCIONES } from "../dominio/opciones.js";
import { obtenerConfiguracion } from "../datos/repo-configuracion.js";
import { verificarElegibilidad, enviarVoto } from "../datos/repo-respuestas.js";

export function iniciar(distrito) {
  let cfg = null, R = {};
  let paso = 0;

  obtenerConfiguracion(distrito).then(doc => {
    if (!doc.exists) { $("#distritoTitulo").textContent = "Este distrito todavía no tiene el simulador cargado."; return; }
    cfg = doc.data();
    $("#distritoTitulo").textContent = `¿A quién votarías en ${distrito}?`;
  });

  chips("#chEdad", "edad"); chips("#chSexo", "sexo");
  function chips(cont, campo) {
    $(cont).innerHTML = OPCIONES[campo].map(v => `<button class="chip" type="button" aria-pressed="false" data-v="${v}">${v}</button>`).join("");
    $(cont).addEventListener("click", e => {
      const b = e.target.closest(".chip"); if (!b) return;
      [...$(cont).children].forEach(c => c.setAttribute("aria-pressed", "false"));
      b.setAttribute("aria-pressed", "true"); R[campo] = b.dataset.v; validar();
    });
  }

  $("#ci").addEventListener("input", e => {
    e.target.value = e.target.value.replace(/\D/g, "").slice(0, 10);
    R.ci = e.target.value;
    $("#ciEstado").textContent = ""; $("#ciEstado").className = "aviso";
    validar();
  });

  $("#gIntendentes").addEventListener("click", e => {
    const b = e.target.closest(".tarjeta"); if (!b) return;
    [...$("#gIntendentes").children].forEach(c => c.dataset.sel = "0"); b.dataset.sel = "1";
    const i = +b.dataset.i;
    R.intendente = i >= 0 ? cfg.intendentes[i] : { lista: 0, nombre: i === -1 ? "VOTO EN BLANCO" : "NS/NC" };
    validar();
  });
  $("#gListas").addEventListener("click", e => {
    const b = e.target.closest(".lista"); if (!b) return;
    R.lista = +b.dataset.lista; R.concejal = null;
    if (R.lista === 0) return irA(5, armarPreview);
    pintarConcejales(R.lista); irA(4);
  });
  $("#gConcejales").addEventListener("click", e => {
    const b = e.target.closest(".concejal"); if (!b) return;
    [...$("#gConcejales").children].forEach(c => c.dataset.sel = "0"); b.dataset.sel = "1";
    const op = +b.dataset.op;
    R.concejal = { op, nombre: cfg.listas[R.lista].candidatos[op - 1] };
    validar();
  });

  function pintarIntendentes() {
    const cards = cfg.intendentes.map((c, i) =>
      `<button class="tarjeta" data-i="${i}" data-sel="0" style="background:${c.color};color:${claro(c.color)}">
        <span class="marca">ELEGIDO</span>
        <span class="rotulo">${c.partido}</span>
        <span class="foto">${retrato(c.nombre, c.foto)}</span>
        <span class="listaNum">LISTA<b>${c.lista}</b></span>
        <span class="pie">${c.nombre}</span></button>`);
    cards.push(`<button class="tarjeta" data-i="-1" data-sel="0" style="background:#fff">
        <span class="marca">ELEGIDO</span>
        <span class="pie" style="margin:auto;font-size:16px">VOTO EN BLANCO</span></button>`);
    $("#gIntendentes").innerHTML = cards.join("");
  }
  function pintarListas() {
    const items = Object.keys(cfg.listas).map(n =>
      `<button class="lista" data-lista="${n}" style="background:${cfg.listas[n].color};color:${claro(cfg.listas[n].color)}">
        <span class="num">LISTA ${n}</span><span class="nombre">${cfg.listas[n].nombre}</span></button>`);
    items.push(`<button class="lista" data-lista="0" style="background:#fff"><span class="num"></span><span class="nombre">VOTO EN BLANCO / NS-NC</span></button>`);
    $("#gListas").innerHTML = items.join("");
  }
  function pintarConcejales(n) {
    const p = cfg.listas[n], t = $("#tituloConcejales");
    t.textContent = `Lista ${n} — ${p.nombre}`; t.style.background = p.color; t.style.color = claro(p.color);
    $("#gConcejales").innerHTML = p.candidatos.map((c, i) =>
      `<button class="concejal" data-op="${i + 1}" data-sel="0">
        <span class="cabecera">${retrato(c, (p.fotos && p.fotos[i]) || "", true)}<span class="op">OPCIÓN<b>${i + 1}</b></span></span>
        <span class="nom">${c}</span></button>`).join("");
  }
  function armarPreview() {
    $("#prevIntendente").textContent = R.intendente.nombre;
    $("#prevConcejal").textContent = R.lista === 0 ? "VOTO EN BLANCO / NS-NC"
      : `${R.concejal.nombre} (Lista ${R.lista})`;
  }

  function irA(n, cb) {
    paso = n; document.querySelectorAll("#vistaParticipante .pantalla").forEach(s => s.classList.remove("activa"));
    $("#pv" + n).classList.add("activa"); window.scrollTo(0, 0); cb && cb(); validar();
  }

  function completo() {
    if (paso === 0) return R.ci && R.ci.length >= 6;
    if (paso === 1) return R.edad && R.sexo;
    if (paso === 2) return !!R.intendente;
    if (paso === 3) return R.lista !== null && R.lista !== undefined;
    if (paso === 4) return !!R.concejal;
    return true;
  }
  function validar() {
    const b = $("#pvSiguiente");
    b.textContent = paso === 0 ? "Verificar cédula" : paso === 5 ? "Confirmar y enviar" : paso === 6 ? "" : "Continuar";
    b.disabled = !completo();
    $("#pvAtras").style.display = (paso === 0 || paso >= 6) ? "none" : "";
    $("#accionesParticipante").style.display = paso === 6 ? "none" : "flex";
  }

  $("#pvSiguiente").addEventListener("click", async () => {
    if (paso === 0) return verificarCedula();
    if (paso === 2) { irA(3); pintarListas(); return; }
    if (paso === 5) return enviar();
    irA(paso + 1, paso + 1 === 2 ? pintarIntendentes : paso + 1 === 5 ? armarPreview : null);
  });
  $("#pvAtras").addEventListener("click", () => {
    if (paso === 3 && R.lista === 0) return;
    if (paso === 5 && R.lista === 0) return irA(3);
    irA(Math.max(0, paso - 1));
  });

  async function verificarCedula() {
    if (!cfg) { $("#ciEstado").className = "aviso malo"; $("#ciEstado").textContent = "El simulador de este distrito no está cargado todavía."; return; }
    $("#ciEstado").className = "aviso"; $("#ciEstado").textContent = "Verificando…";
    try {
      const r = await verificarElegibilidad(R.ci, distrito);
      if (r.estado === "ya_voto") { $("#ciEstado").className = "aviso malo"; $("#ciEstado").textContent = "Esta cédula ya participó en esta encuesta."; return; }
      if (r.estado !== "ok") { $("#ciEstado").className = "aviso malo"; $("#ciEstado").textContent = "No estás habilitado para participar en esta encuesta."; return; }
      R.padron = r;
      irA(1);
    } catch (err) {
      $("#ciEstado").className = "aviso malo"; $("#ciEstado").textContent = "No se pudo verificar. Probá de nuevo.";
    }
  }

  async function enviar() {
    $("#pvSiguiente").disabled = true; $("#pvSiguiente").textContent = "Enviando…";
    try {
      const estado = await enviarVoto({
        cedula: R.ci, distrito,
        nombre: R.padron.nombre || null,
        localidad: R.padron.localidad || null,
        edad: R.edad, sexo: R.sexo,
        intendente_lista: R.intendente.lista, intendente_nombre: R.intendente.nombre,
        junta_lista: R.lista,
        concejal_opcion: R.concejal ? R.concejal.op : null,
        concejal_nombre: R.concejal ? R.concejal.nombre : null
      });
      if (estado !== "ok") { alert("No se pudo enviar: " + estado); $("#pvSiguiente").disabled = false; $("#pvSiguiente").textContent = "Confirmar y enviar"; return; }
      irA(6);
    } catch (err) {
      alert("No se pudo enviar. Revisá tu conexión.");
      $("#pvSiguiente").disabled = false; $("#pvSiguiente").textContent = "Confirmar y enviar";
    }
  }
}
