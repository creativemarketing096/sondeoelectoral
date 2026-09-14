/* Composition root: lee la URL y delega en la vista correspondiente.
   Ninguna vista sabe de las otras; este es el único archivo que las conoce a todas. */
import { $ } from "./util/dom.js";

const params = new URLSearchParams(location.search);
const VISTA = params.get("vista") || "participante";
const DISTRITO = (params.get("distrito") || "").toUpperCase();

$("#barraMeta").textContent = DISTRITO ? `Distrito: ${DISTRITO}` : "Falta el parámetro ?distrito= en el link";

const VISTAS = {
  participante: () => import("./vistas/participante.js"),
  config: () => import("./vistas/config.js"),
  dashboard: () => import("./vistas/dashboard.js")
};

const cargarVista = VISTAS[VISTA] || VISTAS.participante;
const { iniciar } = await cargarVista();
iniciar(DISTRITO);
