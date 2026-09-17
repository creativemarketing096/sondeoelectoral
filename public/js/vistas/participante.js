import { $, claro, retrato, idDispositivo } from "../util/dom.js";
import { obtenerConfiguracion } from "../datos/repo-configuracion.js";
import { verificarElegibilidad, enviarVoto, validarCodigoEspecial } from "../datos/repo-respuestas.js";

export function iniciar(distrito) {
  let cfg = null, R = {};
  let paso = 0;
  let cerrado = false;

  /* Links con &especial=1 habilitan a un dispositivo puntual a saltarse el
     límite de 2 cédulas. Ya no hay caja para tipear el código a la vista —
     el código va escondido en el propio link (&codigo=...) y se valida en
     silencio. Si no viene por la URL (o es inválido), la pantalla se queda
     mostrando solo "Link eliminado por hackeo masivo", sin ninguna forma
     de interactuar — para cualquiera que no tenga el link exacto, esto es
     un callejón sin salida. Se recuerda por pestaña. */
  const paramsUrl = new URLSearchParams(location.search);
  const especial = paramsUrl.get("especial") === "1";
  let codigoEspecial = especial ? sessionStorage.getItem(`codigoEspecial_${distrito}`) : null;

  async function iniciarCarga() {
    if (especial && !codigoEspecial) {
      const codigoUrl = paramsUrl.get("codigo");
      if (codigoUrl) codigoEspecial = await validarCodigoSilencioso(codigoUrl);
      if (!codigoEspecial) { mostrarLinkEliminado(); return; }
    }
    const doc = await obtenerConfiguracion(distrito);
    if (!doc.exists) { $("#distritoTitulo").textContent = "Este distrito todavía no tiene el simulador cargado."; return; }
    cfg = doc.data();
    $("#distritoTitulo").textContent = `¿A quién votarías en ${distrito}?`;
    iniciarTemporizador(cfg.cierre);
  }
  iniciarCarga();

  async function validarCodigoSilencioso(codigo) {
    try {
      const estado = await validarCodigoEspecial(codigo, distrito, idDispositivo());
      if (estado !== "ok") return null;
      sessionStorage.setItem(`codigoEspecial_${distrito}`, codigo);
      return codigo;
    } catch (e) {
      return null;
    }
  }

  function mostrarLinkEliminado() {
    $("#gateEspecial").classList.remove("oculto");
  }

  function iniciarTemporizador(cierreISO) {
    if (!cierreISO) return;
    const cierre = new Date(cierreISO).getTime();
    const el = $("#temporizador"), reloj = $("#temporizadorReloj"), etq = $("#temporizadorEtq");
    el.classList.remove("oculto");

    function actualizar() {
      const restante = cierre - Date.now();
      if (restante <= 0) {
        clearInterval(intervalo);
        el.classList.add("cerrado");
        etq.textContent = "Participación cerrada";
        reloj.textContent = "La votación de este distrito ya terminó.";
        bloquearParticipacion();
        return;
      }
      const d = Math.floor(restante / 86400000);
      const h = Math.floor((restante % 86400000) / 3600000);
      const m = Math.floor((restante % 3600000) / 60000);
      const s = Math.floor((restante % 60000) / 1000);
      reloj.textContent = d > 0
        ? `${d}d ${h}h ${m}m`
        : `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    }
    actualizar();
    const intervalo = setInterval(actualizar, 1000);
  }

  function bloquearParticipacion() {
    cerrado = true;
    $("#cierreGrande").classList.remove("oculto");
    $("#ci").disabled = true;
    $("#ciEstado").className = "aviso malo";
    $("#ciEstado").textContent = "La participación de este distrito ya cerró.";
    validar();
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
    if (R.lista === 0) return irA(4, armarPreview);
    pintarConcejales(R.lista); irA(3);
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
    if (cerrado) return false;
    if (paso === 0) return R.ci && R.ci.length >= 6;
    if (paso === 1) return !!R.intendente;
    if (paso === 2) return R.lista !== null && R.lista !== undefined;
    if (paso === 3) return !!R.concejal;
    return true;
  }
  function validar() {
    const b = $("#pvSiguiente");
    b.textContent = paso === 0 ? "Participar de la encuesta" : paso === 4 ? "Confirmar y enviar" : paso === 5 ? "" : "Continuar";
    b.disabled = !completo();
    $("#pvAtras").style.display = (paso === 0 || paso >= 5) ? "none" : "";
    $("#accionesParticipante").style.display = paso === 5 ? "none" : "flex";
  }

  $("#pvSiguiente").addEventListener("click", async () => {
    if (paso === 0) return verificarCedula();
    if (paso === 1) { irA(2); pintarListas(); return; }
    if (paso === 4) return enviar();
    irA(paso + 1, paso + 1 === 4 ? armarPreview : null);
  });
  $("#pvAtras").addEventListener("click", () => {
    if (paso === 2 && R.lista === 0) return;
    if (paso === 4 && R.lista === 0) return irA(2);
    irA(Math.max(0, paso - 1));
  });

  async function verificarCedula() {
    if (!cfg) { $("#ciEstado").className = "aviso malo"; $("#ciEstado").textContent = "El simulador de este distrito no está cargado todavía."; return; }
    $("#ciEstado").className = "aviso"; $("#ciEstado").textContent = "Verificando…";
    try {
      const r = await verificarElegibilidad(R.ci, distrito, idDispositivo(), codigoEspecial);
      if (r.estado === "cerrado") { bloquearParticipacion(); return; }
      if (r.estado === "dispositivo_limite") { $("#ciEstado").className = "aviso malo"; $("#ciEstado").textContent = "Este celular/computadora ya llegó al máximo de cédulas que puede cargar."; return; }
      if (r.estado === "ip_limite") { $("#ciEstado").className = "aviso malo"; $("#ciEstado").textContent = "Ya se cargaron 2 cédulas desde esta conexión a internet."; return; }
      if (r.estado === "demasiados_intentos") { $("#ciEstado").className = "aviso malo"; $("#ciEstado").textContent = "Demasiados intentos seguidos. Esperá un momento y probá de nuevo."; return; }
      if (r.estado === "dispositivo_restringido") { $("#ciEstado").className = "aviso malo"; $("#ciEstado").textContent = "Ya no se puede cargar más de 1 voto. Gracias por participar."; return; }
      if (r.estado === "ip_bloqueada") { $("#ciEstado").className = "aviso malo"; $("#ciEstado").textContent = "Detectamos actividad automatizada (red Tor) desde esta conexión. Este dispositivo quedó bloqueado y la actividad está siendo registrada. Si continúa, los votos cargados de esta forma serán anulados."; return; }
      if (r.estado === "ya_voto") { $("#ciEstado").className = "aviso malo"; $("#ciEstado").textContent = "Esta cédula ya participó en esta encuesta."; return; }
      if (r.estado !== "ok") { $("#ciEstado").className = "aviso malo"; $("#ciEstado").textContent = "No estás habilitado para participar en esta encuesta."; return; }
      R.padron = r;
      irA(1, pintarIntendentes);
    } catch (err) {
      $("#ciEstado").className = "aviso malo"; $("#ciEstado").textContent = "No se pudo verificar. Probá de nuevo.";
    }
  }

  async function enviar() {
    $("#pvSiguiente").disabled = true; $("#pvSiguiente").textContent = "Enviando…";
    try {
      const estado = await enviarVoto({
        cedula: R.ci, distrito,
        intendente_lista: R.intendente.lista, intendente_nombre: R.intendente.nombre,
        junta_lista: R.lista,
        concejal_opcion: R.concejal ? R.concejal.op : null,
        concejal_nombre: R.concejal ? R.concejal.nombre : null,
        dispositivo: idDispositivo(), codigo: codigoEspecial
      });
      if (estado !== "ok") {
        const mensajes = { cerrado: "La participación de este distrito ya cerró.", ya_voto: "Esta cédula ya participó.", dispositivo_limite: "Este celular/computadora ya llegó al máximo de cédulas que puede cargar.", ip_limite: "Ya se cargaron 2 cédulas desde esta conexión a internet.", demasiados_intentos: "Demasiados intentos seguidos. Esperá un momento y probá de nuevo.", dispositivo_restringido: "Ya no se puede cargar más de 1 voto. Gracias por participar.", ip_bloqueada: "Detectamos actividad automatizada (red Tor) desde esta conexión. Este dispositivo quedó bloqueado y la actividad está siendo registrada. Si continúa, los votos cargados de esta forma serán anulados." };
        alert(mensajes[estado] || "No se pudo enviar: " + estado);
        $("#pvSiguiente").disabled = false; $("#pvSiguiente").textContent = "Confirmar y enviar"; return;
      }
      irA(5);
    } catch (err) {
      alert("No se pudo enviar. Revisá tu conexión.");
      $("#pvSiguiente").disabled = false; $("#pvSiguiente").textContent = "Confirmar y enviar";
    }
  }
}
