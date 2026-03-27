import React, { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { 
  getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp 
} from "firebase/firestore";

// --- CONFIGURACIÓN FIREBASE (Usa tus variables de entorno) ---
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- CONSTANTES ---
const ADMIN_PIN = "1234"; // Cambiá esto por tu PIN de 4 dígitos, Ignacio.
const COURSES = ["Hacoaj", "Jockey Club", "Los Lagartos", "Hindú Club", "CASI", "Otro"];

// --- LÓGICA DE DESEMPATE ---
const calculateWinner = (a, b) => {
  // 1. Mejor Score Neto Total
  if (a.totalNet !== b.totalNet) return a.totalNet - b.totalNet;
  
  // 2. Empate en Neto -> Mejor Gross Vuelta (10-18)
  const grossBack9A = a.grossHoles.slice(9).reduce((s, h) => s + h, 0);
  const grossBack9B = b.grossHoles.slice(9).reduce((s, h) => s + h, 0);
  if (grossBack9A !== grossBack9B) return grossBack9A - grossBack9B;

  // 3. Persiste empate -> Neto hoyo por hoyo desde el 18 hacia atrás
  for (let i = 17; i >= 0; i--) {
    if (a.netHoles[i] !== b.netHoles[i]) return a.netHoles[i] - b.netHoles[i];
  }
  return 0;
};

export default function App() {
  const [players, setPlayers] = useState([]); // Cargalos desde Firebase o usá tu lista
  const [scores, setScores] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Formulario State
  const [formData, setFormData] = useState({
    playerId: "", date: "", course: "", otherCourse: "", hcp: 0,
    grossHoles: Array(18).fill(0), longDrive: false, bestApproach: false
  });

  // Listener de Firebase
  useEffect(() => {
    const q = query(collection(db, "tournament_scores"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) => {
      setScores(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, []);

  const handleAdminAuth = () => {
    const pin = prompt("Ingresá el PIN de Administrador:");
    if (pin === ADMIN_PIN) setIsAdmin(true);
    else alert("PIN Incorrecto");
  };

  const saveScore = async (e) => {
    e.preventDefault();
    // Aquí calculamos el neto de cada hoyo restando el hcp distribuido (simplificado o manual)
    const netHoles = formData.grossHoles.map(g => g); // Lógica de hcp por hoyo va aquí
    const totalNet = netHoles.reduce((s, h) => s + h, 0);

    await addDoc(collection(db, "tournament_scores"), {
      ...formData,
      totalNet,
      netHoles,
      createdAt: serverTimestamp()
    });
    setShowForm(false);
  };

  return (
    <div style={{ padding: '20px', background: '#1a2e1a', color: 'white', minHeight: '100vh' }}>
      <header style={{ textAlign: 'center' }}>
        <h1>COPA MACI 2026</h1>
        <p>Ranking Dinámico</p>
      </header>

      {/* LISTADO DE RANKING (Ordenado por tu lógica de desempate) */}
      <section>
        {/* Aquí mapeamos los scores usando la función calculateWinner */}
      </section>

      {/* BOTONES CON LOGO PELOTA (20% más chicos) */}
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '20px' }}>
        <button onClick={() => setShowForm(true)} style={{ fontSize: '0.8rem' }}>
          ⛳ Cargar Tarjeta
        </button>
        <button style={{ fontSize: '0.8rem' }}>⛳ Ranking Gross</button>
        <button style={{ fontSize: '0.8rem' }}>⛳ Modo Gira</button>
      </div>

      {/* SECCIÓN ADMIN */}
      <footer style={{ marginTop: '50px', textAlign: 'center' }}>
        {!isAdmin ? (
          <button onClick={handleAdminAuth}>Admin Login</button>
        ) : (
          <div>
            <p>Hola Ignacio</p>
            <button>+ Agregar Jugador</button>
          </div>
        )}
      </footer>
    </div>
  );
}
