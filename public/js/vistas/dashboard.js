import { $, iniciales } from "../util/dom.js";
import { suscribirRespuestas } from "../datos/repo-respuestas.js";
import { obtenerConfiguracion } from "../datos/repo-configuracion.js";
import { OPCIONES } from "../dominio/opciones.js";
import { protegerVista } from "../auth.js";

const RAMPA_EDAD = ["#86b6ef", "#5598e7", "#2a78d6", "#1c5cab", "#184f95"];
const COLOR_SEXO = { Femenino: "#2a78d6", Masculino: "#eb6834" };
const GRIS = "#5f6368";

export async function iniciar(distrito) {
  await protegerVista();
  $("#vistaParticipante").classList.add("oculto");
  $("#vistaDashboard").classList.remove("oculto");

  let cfg = null;
  try { const doc = await obtenerConfiguracion(distrito); if (doc.exists) cfg = doc.data(); } catch (e) {}

  function colorIntendente(nombre) {
    const c = cfg && cfg.intendentes.find(x => x.nombre === nombre);
    return c ? c.color : GRIS;
  }
  function colorLista(n) {
    return (cfg && cfg.listas[n] && cfg.listas[n].color) || GRIS;
  }

  /* Fila horizontal: foto + % + votos, una tarjeta por candidato — para
     intendente y para el top de concejales. */
  function filaResultados(id, items) {
    const total = items.reduce((s, i) => s + i.valor, 0);
    if (!total) { $(id).innerHTML = `<p class="aviso centro">Todavía no hay datos.</p>`; return; }
    $(id).innerHTML = `<div class="fila-resultados">` + items.map(i => {
      const pct = Math.round(i.valor / total * 100);
      return `<div class="resultado-candidato" style="border-top-color:${i.color}">
        <div class="foto-resultado" ${i.foto ? `style="background-image:url('${i.foto}')"` : ""}>${i.foto ? "" : iniciales(i.etiqueta)}</div>
        <b class="pct-resultado" style="color:${i.color}">${pct}%</b>
        <span class="nombre-resultado">${i.etiqueta}</span>
        <span class="votos-resultado">${i.valor} voto${i.valor === 1 ? "" : "s"}</span>
      </div>`;
    }).join("") + `</div>`;
  }

  /* Tira compacta de porcentajes en una sola fila — para sexo y edad. */
  function filaStats(id, items) {
    const total = items.reduce((s, i) => s + i.valor, 0) || 1;
    $(id).innerHTML = `<div class="fila-stats">` + items.map(i =>
      `<div class="stat-pill" style="border-color:${i.color}"><b>${Math.round(i.valor / total * 100)}%</b><span>${i.etiqueta}</span></div>`
    ).join("") + `</div>`;
  }

  function barras(id, items) {
    if (!items.some(i => i.valor > 0)) { $(id).innerHTML = `<p class="aviso centro">Todavía no hay datos.</p>`; return; }
    const max = Math.max(...items.map(i => i.valor), 1);
    $(id).innerHTML = items.map(i => `
      <div class="barra-fila">
        <span class="barra-etq">${i.etiqueta}</span>
        <span class="barra-pista"><span class="barra-rel" style="width:${i.valor ? Math.max(4, i.valor / max * 100) : 0}%;background:${i.color || GRIS}"></span></span>
        <span class="barra-val">${i.valor}</span>
      </div>`).join("");
  }

  suscribirRespuestas(distrito, snap => {
    const filas = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    $("#kTotal").textContent = filas.length;

    const cuenta = (arr, campo) => { const o = {}; arr.forEach(f => { const v = f[campo] || "NS/NC"; o[v] = (o[v] || 0) + 1; }); return o; };

    const ci = cuenta(filas, "intendente_nombre");
    filaResultados("#chIntendente", Object.entries(ci).map(([nombre, valor]) => ({
      etiqueta: nombre, valor, color: colorIntendente(nombre),
      foto: cfg && (cfg.intendentes.find(c => c.nombre === nombre) || {}).foto
    })));

    const cc = {};
    filas.forEach(f => {
      const k = f.concejal_nombre || (f.junta_lista ? "Lista " + f.junta_lista : "NS/NC");
      if (!cc[k]) cc[k] = { total: 0, lista: f.junta_lista, opcion: f.concejal_opcion };
      cc[k].total++;
    });
    const top = Object.entries(cc).sort((a, b) => b[1].total - a[1].total).slice(0, 10);
    filaResultados("#chConcejo", top.map(([etiqueta, v]) => ({
      etiqueta, valor: v.total, color: colorLista(v.lista),
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
    const sospechosos = Object.entries(porDispositivo).filter(([, v]) => v.length > 1).sort((a, b) => b[1].length - a[1].length);
    $("#tablaDispositivos").querySelector("tbody").innerHTML = sospechosos.length
      ? `<tr><th>Dispositivo</th><th>Cédulas cargadas</th></tr>` + sospechosos.map(([id, v]) =>
          `<tr><td><code>${id.slice(0, 8)}…</code></td><td>${v.length} — ${v.map(f => f.id).join(", ")}</td></tr>`).join("")
      : `<tr><td class="centro">Ningún dispositivo cargó más de una cédula.</td></tr>`;
  });
}
