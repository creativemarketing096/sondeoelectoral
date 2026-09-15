import { $ } from "../util/dom.js";
import { obtenerResultadosPublicos } from "../datos/repo-respuestas.js";
import { obtenerConfiguracion } from "../datos/repo-configuracion.js";
import { filaResultados, filaStats, GRIS } from "../util/graficos.js";

/* Vista pública, sin login — pensada para proyectar en pantalla o
   compartir el link. Solo totales agregados, nunca datos de una persona.
   Se actualiza sola cada 5s (no puede suscribirse en tiempo real sin
   sesión, la tabla respuestas está bloqueada para el público). */
export async function iniciar(distrito) {
  $("#vistaParticipante").classList.add("oculto");
  $("#vistaResultados").classList.remove("oculto");
  $("#tituloResultadosDistrito").textContent = `Resultados en vivo — ${distrito}`;

  let cfg = null;
  try { const doc = await obtenerConfiguracion(distrito); if (doc.exists) cfg = doc.data(); } catch (e) {}

  function colorIntendente(lista) {
    const c = cfg && cfg.intendentes.find(x => x.lista === lista);
    return c ? c.color : GRIS;
  }
  function colorLista(n) {
    return (cfg && cfg.listas[n] && cfg.listas[n].color) || GRIS;
  }

  async function actualizar() {
    let filas;
    try { filas = await obtenerResultadosPublicos(distrito); } catch (e) { return; }

    const deCategoria = c => filas.filter(f => f.categoria === c);
    const total = deCategoria("intendente").reduce((s, f) => s + Number(f.valor), 0);
    $("#rTotal").textContent = total;

    filaResultados("#rIntendente", deCategoria("intendente").map(f => ({
      etiqueta: f.etiqueta, valor: Number(f.valor), color: colorIntendente(f.lista),
      foto: cfg && (cfg.intendentes.find(c => c.lista === f.lista) || {}).foto
    })));

    const top = deCategoria("concejal").sort((a, b) => b.valor - a.valor).slice(0, 12);
    filaResultados("#rConcejo", top.map(f => ({
      etiqueta: f.etiqueta, valor: Number(f.valor), color: colorLista(f.lista),
      foto: cfg && f.opcion && cfg.listas[f.lista] && cfg.listas[f.lista].fotos ? cfg.listas[f.lista].fotos[f.opcion - 1] : null
    })));

    const COLOR_SEXO = { Femenino: "#2a78d6", Masculino: "#eb6834" };
    filaStats("#rSexo", deCategoria("sexo").map(f => ({ etiqueta: f.etiqueta, valor: Number(f.valor), color: COLOR_SEXO[f.etiqueta] || GRIS })));

    const RAMPA_EDAD = { "18-24": "#86b6ef", "25-34": "#5598e7", "35-49": "#2a78d6", "50-64": "#1c5cab", "65+": "#184f95" };
    const ordenEdad = ["18-24", "25-34", "35-49", "50-64", "65+"];
    const edades = deCategoria("edad");
    filaStats("#rEdad", ordenEdad.map(e => ({ etiqueta: e, valor: Number((edades.find(f => f.etiqueta === e) || {}).valor || 0), color: RAMPA_EDAD[e] })));
  }

  actualizar();
  setInterval(actualizar, 5000);
}
