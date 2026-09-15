import { $ } from "../util/dom.js";
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

  /* Gráfico circular en SVG plano — sin librerías externas, no depende de ningún CDN. */
  function donut(id, segmentos) {
    const total = segmentos.reduce((s, x) => s + x.valor, 0);
    if (!total) { $(id).innerHTML = `<p class="aviso centro">Todavía no hay datos.</p>`; return; }
    const R = 60, C = 2 * Math.PI * R, cx = 80, cy = 80;
    let acumulado = 0;
    const arcos = segmentos.filter(s => s.valor > 0).map(s => {
      const frac = s.valor / total;
      const dash = frac * C;
      const arco = `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${s.color}" stroke-width="30"
        stroke-dasharray="${dash} ${C - dash}" stroke-dashoffset="${-acumulado * C}" transform="rotate(-90 ${cx} ${cy})"/>`;
      acumulado += frac;
      return arco;
    }).join("");
    const leyenda = segmentos.filter(s => s.valor > 0).map(s =>
      `<div class="leyenda-item"><span class="punto" style="background:${s.color}"></span>${s.etiqueta} — <b>${s.valor}</b> (${Math.round(s.valor / total * 100)}%)</div>`
    ).join("");
    $(id).innerHTML = `<div class="donut-envoltorio"><svg viewBox="0 0 160 160">${arcos}</svg><div class="donut-centro"><b>${total}</b><span>votos</span></div></div><div class="leyenda">${leyenda}</div>`;
  }

  function barras(id, items, conPorcentaje) {
    if (!items.some(i => i.valor > 0)) { $(id).innerHTML = `<p class="aviso centro">Todavía no hay datos.</p>`; return; }
    const max = Math.max(...items.map(i => i.valor), 1);
    const total = items.reduce((s, i) => s + i.valor, 0) || 1;
    $(id).innerHTML = items.map(i => `
      <div class="barra-fila">
        <span class="barra-etq">${i.etiqueta}</span>
        <span class="barra-pista"><span class="barra-rel" style="width:${i.valor ? Math.max(4, i.valor / max * 100) : 0}%;background:${i.color || GRIS}"></span></span>
        <span class="barra-val">${i.valor}${conPorcentaje ? ` (${Math.round(i.valor / total * 100)}%)` : ""}</span>
      </div>`).join("");
  }

  suscribirRespuestas(distrito, snap => {
    const filas = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    $("#kTotal").textContent = filas.length;

    const cuenta = (arr, campo) => { const o = {}; arr.forEach(f => { const v = f[campo] || "NS/NC"; o[v] = (o[v] || 0) + 1; }); return o; };

    const ci = cuenta(filas, "intendente_nombre");
    donut("#chIntendente", Object.entries(ci).map(([nombre, valor]) => ({ etiqueta: nombre, valor, color: colorIntendente(nombre) })));

    const cc = {};
    filas.forEach(f => {
      const k = f.concejal_nombre || (f.junta_lista ? "Lista " + f.junta_lista : "NS/NC");
      if (!cc[k]) cc[k] = { total: 0, lista: f.junta_lista };
      cc[k].total++;
    });
    const top = Object.entries(cc).sort((a, b) => b[1].total - a[1].total).slice(0, 10);
    barras("#chConcejo", top.map(([etiqueta, v]) => ({ etiqueta, valor: v.total, color: colorLista(v.lista) })), true);

    const cs = cuenta(filas, "sexo");
    donut("#chSexo", OPCIONES.sexo.map(s => ({ etiqueta: s, valor: cs[s] || 0, color: COLOR_SEXO[s] || GRIS })));

    const ce = cuenta(filas, "edad");
    barras("#chEdad", OPCIONES.edad.map((e, i) => ({ etiqueta: e, valor: ce[e] || 0, color: RAMPA_EDAD[i] })));

    const cl = cuenta(filas, "localidad");
    barras("#chLocalidad", Object.entries(cl).sort((a, b) => b[1] - a[1]).map(([etiqueta, valor]) => ({ etiqueta, valor })));

    const orden = [...filas].reverse();
    $("#tablaParticipantes").querySelector("tbody").innerHTML = orden.length
      ? `<tr><th>Cédula</th><th>Nombre</th><th>Sexo</th><th>Edad</th><th>Localidad</th></tr>` + orden.map(f =>
          `<tr><td>${f.id}</td><td>${f.nombre || "—"}</td><td>${f.sexo || "—"}</td><td>${f.edad || "—"}</td><td>${f.localidad || "—"}</td></tr>`).join("")
      : `<tr><td class="centro">Todavía no participó nadie.</td></tr>`;
  });
}
