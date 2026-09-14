/* Colección: padron/{cedula} { distrito, localidad, edad_rango, sexo, nombre } */
import { db } from "../firebase-init.js";

const TAMAÑO_LOTE = 450; // límite de Firestore es 500 escrituras por batch

export async function importarPadron(registros, onProgreso) {
  let hechos = 0, errores = 0;
  for (let i = 0; i < registros.length; i += TAMAÑO_LOTE) {
    const trozo = registros.slice(i, i + TAMAÑO_LOTE);
    const batch = db.batch();
    trozo.forEach(r => {
      batch.set(db.collection("padron").doc(r.cedula), {
        distrito: r.distrito,
        localidad: r.localidad,
        edad_rango: r.edad_rango,
        sexo: r.sexo,
        nombre: r.nombre
      });
    });
    try {
      await batch.commit();
      hechos += trozo.length;
    } catch (err) {
      errores += trozo.length;
    }
    onProgreso && onProgreso(Math.min(i + TAMAÑO_LOTE, registros.length), registros.length);
  }
  return { hechos, errores };
}
