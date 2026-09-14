/* Colecciones:
   padron/{cedula}     { distrito, localidad, edad_rango, sexo }
   respuestas/{cedula} { distrito, localidad, edad, sexo,
                         intendente_lista, intendente_nombre,
                         junta_lista, concejal_opcion, concejal_nombre,
                         ubicacion:{lat,lng}|null, foto_url|null, ts } */
import { db } from "../firebase-init.js";

export function obtenerPadron(ci) {
  return db.collection("padron").doc(ci).get();
}

export function obtenerRespuestaExistente(ci) {
  return db.collection("respuestas").doc(ci).get();
}

export function guardarRespuesta(ci, datos) {
  return db.collection("respuestas").doc(ci).set({
    ...datos,
    ts: firebase.firestore.FieldValue.serverTimestamp()
  });
}

export function suscribirRespuestas(distrito, cb) {
  return db.collection("respuestas").where("distrito", "==", distrito).onSnapshot(cb);
}
