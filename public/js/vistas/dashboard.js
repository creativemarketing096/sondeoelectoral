import { $ } from "../util/dom.js";
import { suscribirRespuestas, listarDispositivosExentos } from "../datos/repo-respuestas.js";
import { obtenerConfiguracion } from "../datos/repo-configuracion.js";
import { OPCIONES } from "../dominio/opciones.js";
import { protegerVista } from "../auth.js";
import { filaResultados, filaStats, barras, cuenta, GRIS } from "../util/graficos.js";

const RAMPA_EDAD = ["#86b6ef", "#5598e7", "#2a78d6", "#1c5cab", "#184f95"];
const COLOR_SEXO = { Femenino: "#2a78d6", Masculino: "#eb6834" };

export async function iniciar(distrito) {
  await protegerVista();
  $("#vistaParticipante").classList.add("oculto");
  $("#vistaDashboard").classList.remove("oculto");
  $("#linkResultadosPublicos").href = `${location.origin}${location.pathname}?vista=resultados&distrito=${encodeURIComponent(distrito)}`;

  let cfg = null;
  try { const doc = await obtenerConfiguracion(distrito); if (doc.exists) cfg = doc.data(); } catch (e) {}

  let exentos = new Set();
  try { exentos = new Set(await listarDispositivosExentos(distrito)); } catch (e) {}

  function colorIntendente(nombre) {
    const c = cfg && cfg.intendentes.find(x => x.nombre === nombre);
    return c ? c.color : GRIS;
  }
  function colorLista(n) {
    return (cfg && cfg.listas[n] && cfg.listas[n].color) || GRIS;
  }

  suscribirRespuestas(distrito, snap => {
    const filas = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    $("#kTotal").textContent = filas.length;

    const ci = cuenta(filas, "intendente_nombre");
    filaResultados("#chIntendente", Object.entries(ci).map(([nombre, valor]) => ({
      etiqueta: nombre, valor, color: colorIntendente(nombre),
      foto: cfg && (cfg.intendentes.find(c => c.nombre === nombre) || {}).foto
    })));

    /* Arranca con los 60 (o los que sean) concejales de todas las listas en
       0 votos, para que se vean todos aunque a alguno todavía no lo votó
       nadie — no solo un top recortado. */
    const cc = {};
    if (cfg) {
      Object.entries(cfg.listas).forEach(([n, l]) => {
        l.candidatos.forEach((nombre, i) => { cc[`${n}·${nombre}`] = { etiqueta: nombre, total: 0, lista: +n, opcion: i + 1 }; });
      });
    }
    filas.forEach(f => {
      const k = f.concejal_nombre ? `${f.junta_lista}·${f.concejal_nombre}` : (f.junta_lista ? "Lista " + f.junta_lista : "NS/NC");
      if (!cc[k]) cc[k] = { etiqueta: f.concejal_nombre || (f.junta_lista ? "Lista " + f.junta_lista : "NS/NC"), total: 0, lista: f.junta_lista, opcion: f.concejal_opcion };
      cc[k].total++;
    });
    const todos = Object.values(cc).sort((a, b) => b.total - a.total);
    filaResultados("#chConcejo", todos.map(v => ({
      etiqueta: v.etiqueta, valor: v.total, color: colorLista(v.lista),
      foto: cfg && v.opcion && cfg.listas[v.lista] && cfg.listas[v.lista].fotos ? cfg.listas[v.lista].fotos[v.opcion - 1] : null
    })));

    const cs = cuenta(filas, "sexo");
    filaStats("#chSexo", OPCIONES.sexo.map(s => ({ etiqueta: s, valor: cs[s] || 0, color: COLOR_SEXO[s] || GRIS })));

    const ce = cuenta(filas, "edad");
    filaStats("#chEdad", OPCIONES.edad.map((e, i) => ({ etiqueta: e, valor: ce[e] || 0, color: RAMPA_EDAD[i] })));

    const cl = cuenta(filas, "localidad");
    barras("#chLocalidad", Object.entries(cl).sort((a, b) => b[1] - a[1]).map(([etiqueta, valor]) => ({ etiqueta, valor })));

    const orden = [...filas].reverse();
    $("#tablaParticipantes").querySelector("tbody").innerHTML = orden.length
      ? `<tr><th>Cédula</th><th>Nombre</th><th>Sexo</th><th>Edad</th><th>Localidad</th></tr>` + orden.map(f =>
          `<tr><td>${f.id}</td><td>${f.nombre || "—"}</td><td>${f.sexo || "—"}</td><td>${f.edad || "—"}</td><td>${f.localidad || "—"}</td></tr>`).join("")
      : `<tr><td class="centro">Todavía no participó nadie.</td></tr>`;

    const porDispositivo = {};
    filas.forEach(f => { if (f.dispositivo_id) (porDispositivo[f.dispositivo_id] = porDispositivo[f.dispositivo_id] || []).push(f); });
    const sospechosos = Object.entries(porDispositivo)
      .filter(([id, v]) => v.length > 1 && !exentos.has(id))
      .sort((a, b) => b[1].length - a[1].length);
    $("#tablaDispositivos").querySelector("tbody").innerHTML = sospechosos.length
      ? `<tr><th>Dispositivo</th><th>Cédulas cargadas</th></tr>` + sospechosos.map(([id, v]) =>
          `<tr><td><code>${id.slice(0, 8)}…</code></td><td>${v.length} — ${v.map(f => f.id).join(", ")}</td></tr>`).join("")
      : `<tr><td class="centro">Ningún dispositivo cargó más de una cédula.</td></tr>`;
  });
}
