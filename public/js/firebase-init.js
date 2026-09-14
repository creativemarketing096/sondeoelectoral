/* ============================================================
   CONFIGURACIÓN DE FIREBASE — completar con tu proyecto
   Firebase Console → Configuración del proyecto → Tus apps → SDK setup
   Único archivo que llama a firebase.initializeApp(). El resto de la
   app importa `db` y `storage` desde acá, nunca toca `firebase` directo.
   ============================================================ */
const firebaseConfig = {
  apiKey: "AIzaSyAz_-JpNBzjy14b9SBzF_bEfGL1v-qMSQk",
  authDomain: "sondeo-elecciones.firebaseapp.com",
  projectId: "sondeo-elecciones",
  storageBucket: "sondeo-elecciones.firebasestorage.app",
  messagingSenderId: "853756955996",
  appId: "1:853756955996:web:efc23d2c36261ae26d8599"
};

firebase.initializeApp(firebaseConfig);
export const db = firebase.firestore();
export const storage = firebase.storage();
