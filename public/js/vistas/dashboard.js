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

  const charts = {};
  function chart(id, tipo, labels, valores, colores, opciones) {
    if (charts[id]) charts[id].destroy();
    charts[id] = new Chart($(id), {
      type: tipo,
      data: { labels, datasets: [{ data: valores, backgroundColor: colores || GRIS }] },
      options: Object.assign({ plugins: { legend: { display: tipo === "doughnut" } } }, opciones)
    });
  }
  const barra = (id, labels, valores, colores) =>
    chart(id, "bar", labels, valores, colores, { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } });

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

    const cuenta = (arr, campo) => { const o = {}; arr.forEach(f => { const v = f[campo] || "NS/NC"; o[v] = (o[v] || 0) + 1; }); return o; };

    const ci = cuenta(filas, "intendente_nombre");
    barra("#chIntendente", Object.keys(ci), Object.values(ci), Object.keys(ci).map(colorIntendente));

    const cc = {};
    filas.forEach(f => {
      const k = f.concejal_nombre || (f.junta_lista ? "Lista " + f.junta_lista : "NS/NC");
      if (!cc[k]) cc[k] = { total: 0, lista: f.junta_lista };
      cc[k].total++;
    });
    const top = Object.entries(cc).sort((a, b) => b[1].total - a[1].total).slice(0, 10);
    barra("#chConcejo", top.map(x => x[0]), top.map(x => x[1].total), top.map(x => colorLista(x[1].lista)));

    const ce = cuenta(filas, "edad");
    barra("#chEdad", OPCIONES.edad, OPCIONES.edad.map(e => ce[e] || 0), RAMPA_EDAD);

    const cs = cuenta(filas, "sexo");
    const sexos = OPCIONES.sexo.filter(s => cs[s]);
    chart("#chSexo", "doughnut", sexos, sexos.map(s => cs[s]), sexos.map(s => COLOR_SEXO[s] || GRIS));

    const cl = cuenta(filas, "localidad");
    barra("#chLocalidad", Object.keys(cl), Object.values(cl));

    const orden = [...filas].reverse();
    $("#tablaParticipantes").querySelector("tbody").innerHTML = orden.length
      ? `<tr><th>Cédula</th><th>Nombre</th><th>Sexo</th><th>Edad</th><th>Localidad</th></tr>` + orden.map(f =>
          `<tr><td>${f.id}</td><td>${f.nombre || "—"}</td><td>${f.sexo || "—"}</td><td>${f.edad || "—"}</td><td>${f.localidad || "—"}</td></tr>`).join("")
      : `<tr><td class="centro">Todavía no participó nadie.</td></tr>`;
  });
}
