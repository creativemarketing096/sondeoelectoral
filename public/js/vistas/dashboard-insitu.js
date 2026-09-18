import { $ } from "../util/dom.js";
import { protegerVista } from "../auth.js";
import { obtenerConfiguracion } from "../datos/repo-configuracion.js";
import { listarBarrios, listarEncuestadores, listarRespuestasInsitu } from "../datos/repo-insitu.js";
import { filaResultados, filaConcejales, barras, GRIS } from "../util/graficos.js";

export async function iniciar(distrito) {
  await protegerVista();
  $("#vistaParticipante").classList.add("oculto");
  $("#vistaDashboardInsitu").classList.remove("oculto");
  $("#disTituloDistrito").textContent = distrito;

  const params = new URLSearchParams(location.search);
  let cfg = null, barrios = [], encuestadores = [];

  function colorIntendente(nombre) {
    const c = cfg && cfg.intendentes.find(x => x.nombre === nombre);
    return c ? c.color : GRIS;
  }

  async function cargarFiltros() {
    [cfg, barrios, encuestadores] = await Promise.all([
      obtenerConfiguracion(distrito).then(d => d.exists ? d.data() : null),
      listarBarrios(distrito),
      listarEncuestadores(distrito)
    ]);
    $("#disFiltroEncuestador").innerHTML = `<option value="">Todos los encuestadores</option>` +
      encuestadores.map(e => `<option value="${e.id}">${e.nombre} ${e.apellido}</option>`).join("");
    $("#disFiltroBarrio").innerHTML = `<option value="">Todos los barrios</option>` +
      barrios.map(b => `<option value="${b.id}">${b.nombre}</option>`).join("");
    const encuestadorUrl = params.get("encuestador");
    if (encuestadorUrl) $("#disFiltroEncuestador").value = encuestadorUrl;
  }

  async function actualizar() {
    const filtros = {
      encuestador_id: $("#disFiltroEncuestador").value || null,
      barrio_id: $("#disFiltroBarrio").value || null,
      desde: $("#disFiltroDesde").value ? new Date($("#disFiltroDesde").value).toISOString() : null,
      hasta: $("#disFiltroHasta").value ? new Date($("#disFiltroHasta").value + "T23:59:59").toISOString() : null
    };
    const filas = await listarRespuestasInsitu(distrito, filtros);
    window.__insituFilasActuales = filas;

    $("#disTotal").textContent = filas.length;

    const ci = {};
    filas.forEach(f => { const k = f.intendente_nombre || "NS/NC"; ci[k] = (ci[k] || 0) + 1; });
    filaResultados("#disIntendente", Object.entries(ci).map(([nombre, valor]) => ({
      etiqueta: nombre, valor, color: colorIntendente(nombre),
      foto: cfg && (cfg.intendentes.find(c => c.nombre === nombre) || {}).foto
    })));

    const cc = {};
    filas.forEach(f => {
      const k = f.concejal_nombre ? `${f.junta_lista}·${f.concejal_nombre}` : "blanco";
      if (!cc[k]) cc[k] = { total: 0 };
      cc[k].total++;
    });
    filaConcejales("#disConcejo", cfg, cc);

    const porEncuestador = {};
    filas.forEach(f => { porEncuestador[f.encuestador_id] = (porEncuestador[f.encuestador_id] || 0) + 1; });
    $("#disTablaEncuestador").querySelector("tbody").innerHTML = encuestadores.length
      ? encuestadores.map(e => `<tr><td>${e.nombre} ${e.apellido}</td><td class="num">${porEncuestador[e.id] || 0}</td></tr>`).join("")
      : `<tr><td colspan="2" class="centro">Sin encuestadores.</td></tr>`;

    const porBarrio = {};
    filas.forEach(f => { porBarrio[f.barrio_id] = (porBarrio[f.barrio_id] || 0) + 1; });
    $("#disTablaBarrio").querySelector("tbody").innerHTML = barrios.length
      ? barrios.map(b => `<tr><td>${b.nombre}</td><td class="num">${b.meta}</td><td class="num">${porBarrio[b.id] || 0}</td><td class="num">${Math.max(0, b.meta - (porBarrio[b.id] || 0))}</td></tr>`).join("")
      : `<tr><td colspan="4" class="centro">Sin barrios.</td></tr>`;

    const porHora = {};
    filas.forEach(f => { const h = new Date(f.ts).getHours() + "hs"; porHora[h] = (porHora[h] || 0) + 1; });
    barras("#disPorHora", Object.entries(porHora).sort((a, b) => parseInt(a[0]) - parseInt(b[0])).map(([etiqueta, valor]) => ({ etiqueta, valor })));

    const porDia = {};
    filas.forEach(f => { const d = new Date(f.ts).toLocaleDateString("es-PY", { timeZone: "America/Asuncion" }); porDia[d] = (porDia[d] || 0) + 1; });
    barras("#disPorDia", Object.entries(porDia).map(([etiqueta, valor]) => ({ etiqueta, valor })));
  }

  ["disFiltroEncuestador", "disFiltroBarrio", "disFiltroDesde", "disFiltroHasta"].forEach(id => {
    $("#" + id).addEventListener("change", actualizar);
  });

  $("#disExportarCsv").addEventListener("click", () => {
    const filas = window.__insituFilasActuales || [];
    const encPorId = Object.fromEntries(encuestadores.map(e => [e.id, `${e.nombre} ${e.apellido}`]));
    const barrioPorId = Object.fromEntries(barrios.map(b => [b.id, b.nombre]));
    const encabezado = ["Fecha", "Encuestador", "Barrio", "Intendente", "Concejal", "Lista"];
    const filasCsv = filas.map(f => [
      new Date(f.ts).toLocaleString("es-PY", { timeZone: "America/Asuncion" }),
      encPorId[f.encuestador_id] || "", barrioPorId[f.barrio_id] || "",
      f.intendente_nombre || "NS/NC", f.concejal_nombre || "", f.junta_lista || ""
    ]);
    const csv = [encabezado, ...filasCsv].map(fila => fila.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `insitu-${distrito}-${Date.now()}.csv`;
    a.click();
  });

  $("#disExportarExcel").addEventListener("click", async () => {
    const filas = window.__insituFilasActuales || [];
    const encPorId = Object.fromEntries(encuestadores.map(e => [e.id, `${e.nombre} ${e.apellido}`]));
    const barrioPorId = Object.fromEntries(barrios.map(b => [b.id, b.nombre]));
    const XLSX = await import("https://esm.sh/xlsx@0.18.5");
    const hoja = XLSX.utils.json_to_sheet(filas.map(f => ({
      "Fecha": new Date(f.ts).toLocaleString("es-PY", { timeZone: "America/Asuncion" }),
      "Encuestador": encPorId[f.encuestador_id] || "", "Barrio": barrioPorId[f.barrio_id] || "",
      "Intendente": f.intendente_nombre || "NS/NC", "Concejal": f.concejal_nombre || "", "Lista": f.junta_lista || ""
    })));
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "In Situ");
    XLSX.writeFile(libro, `insitu-${distrito}-${Date.now()}.xlsx`);
  });

  await cargarFiltros();
  await actualizar();
}
