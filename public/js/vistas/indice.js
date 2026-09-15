import { $ } from "../util/dom.js";
import { listarDistritos } from "../datos/repo-configuracion.js";
import { protegerVista } from "../auth.js";

export async function iniciar() {
  await protegerVista();
  $("#vistaParticipante").classList.add("oculto");
  $("#vistaIndice").classList.remove("oculto");

  const base = location.origin + location.pathname;
  $("#indiceLinkPropio").textContent = `${base}?vista=indice`;

  const filas = (await listarDistritos()).map(cfg => {
    const d = cfg.distrito;
    const q = encodeURIComponent(d);
    return `<tr>
      <td><b>${d}</b><br><small>${cfg.intendentes.length} intendente(s) · ${Object.keys(cfg.listas).length} lista(s)</small></td>
      <td><a class="mini chico" href="${base}?distrito=${q}" target="_blank">Encuesta</a>
          <a class="mini chico" href="${base}?vista=config&distrito=${q}" target="_blank">Configurar</a>
          <a class="mini chico" href="${base}?vista=dashboard&distrito=${q}" target="_blank">Dashboard</a></td>
    </tr>`;
  });

  $("#tablaDistritos").querySelector("tbody").innerHTML = filas.length
    ? `<tr><th>Distrito</th><th>Links</th></tr>` + filas.join("")
    : `<tr><td class="centro">Todavía no hay distritos configurados.</td></tr>`;
}
