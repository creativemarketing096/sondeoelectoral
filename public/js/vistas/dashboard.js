import { $ } from "../util/dom.js";
import { suscribirRespuestas } from "../datos/repo-respuestas.js";
import { protegerVista } from "../auth.js";

export async function iniciar(distrito) {
  await protegerVista();
  $("#vistaParticipante").classList.add("oculto");
  $("#vistaDashboard").classList.remove("oculto");

  const charts = {};
  function barChart(id, labels, valores, colores) {
    if (charts[id]) charts[id].destroy();
    charts[id] = new Chart($(id), {
      type: "bar",
      data: { labels, datasets: [{ data: valores, backgroundColor: colores || "#5f6368" }] },
      options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
    });
  }

  suscribirRespuestas(distrito, snap => {
    const filas = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    $("#kTotal").textContent = filas.length;

    const cuenta = (arr, campo) => { const o = {}; arr.forEach(f => { const v = f[campo] || "NS/NC"; o[v] = (o[v] || 0) + 1; }); return o; };

    const ci = cuenta(filas, "intendente_nombre");
    barChart("#chIntendente", Object.keys(ci), Object.values(ci), "#e30613");

    const cc = {};
    filas.forEach(f => { const k = f.concejal_nombre || (f.junta_lista ? "Lista " + f.junta_lista : "NS/NC"); cc[k] = (cc[k] || 0) + 1; });
    const top = Object.entries(cc).sort((a, b) => b[1] - a[1]).slice(0, 10);
    barChart("#chConcejo", top.map(x => x[0]), top.map(x => x[1]), "#0033a0");

    const ce = cuenta(filas, "edad");
    barChart("#chEdad", Object.keys(ce), Object.values(ce), "#a8b8dc");

    const cs = cuenta(filas, "sexo");
    barChart("#chSexo", Object.keys(cs), Object.values(cs), "#ffdd00");

    const cl = cuenta(filas, "localidad");
    barChart("#chLocalidad", Object.keys(cl), Object.values(cl), "#4a4a4a");
  });
}
