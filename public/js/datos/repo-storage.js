import { storage } from "../firebase-init.js";

export async function subirArchivo(ruta, archivo) {
  const ref = storage.ref(ruta);
  await ref.put(archivo);
  return ref.getDownloadURL();
}
