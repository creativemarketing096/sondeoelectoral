/* Colección: configuracion/{distrito} { intendentes:[...], listas:{n:{...}} } */
import { db } from "../firebase-init.js";

export function obtenerConfiguracion(distrito) {
  return db.collection("configuracion").doc(distrito).get();
}

export function guardarConfiguracion(distrito, cfg) {
  return db.collection("configuracion").doc(distrito).set(cfg);
}

export function listarDistritos() {
  return db.collection("configuracion").get();
}
