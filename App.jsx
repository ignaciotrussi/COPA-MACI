import React, { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, doc, deleteDoc } from "firebase/firestore";

// --- CONFIGURACIÓN FIREBASE ---
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
const COURSES = ["Hacoaj", "Jockey Club", "Los Lagartos", "Hindú Club", "CASI", "Otro"];
const MODALITIES = ["Medal Play", "Fourball", "Match Play", "Stableford"];

export default function App() {
  const [view, setView] = useState("ranking"); // ranking, card, gira, admin
  const [players, setPlayers] = useState([]);
  const [scores, setScores] = useState([]);
  const [giraMatches, setGiraMatches] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // States para Formularios
  const [card, setCard] = useState({ 
    playerId: "", date: "", course: "", otherCourse: "", hcp: 0, 
    grossHoles: Array(18).fill(0), longDrive: false, bestApproach: false 
  });

  // Listeners Firebase
  useEffect(() => {
    onSnapshot(query(collection(db, "players"), orderBy("name")), (s) => 
      setPlayers(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    onSnapshot(query(collection(db, "scores"), orderBy("createdAt", "desc")), (s) => 
      setScores(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    onSnapshot(collection(db, "gira"), (s) => 
      setGiraMatches(s.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, []);

  // --- LÓGICA DE DESEMPATE ---
  const sortScores = (allScores) => {
    return [...allScores].sort((a, b) => {
      const netA = a.grossHoles.reduce((s, h) => s + h, 0) - a.hcp;
      const netB = b.grossHoles.reduce((s, h) => s + h, 0) - b.hcp;
      if (netA !== netB) return netA - netB;
      
      // Empate: Gross Back 9 (Hoyos 10-18)
      const gB9A = a.grossHoles.slice(9).reduce((s, h) => s + h, 0);
      const gB9B = b.grossHoles.slice(9).reduce((s, h) => s + h, 0);
      if (gB9A !== gB9B) return gB9A - gB9B;

      // Empate: Neto hoyo x hoyo desde el 18 (Sin hándicap por hoyo como pediste)
      for (let i = 17; i >= 0; i--) {
        if (a.grossHoles[i] !== b.grossHoles[i]) return a.grossHoles[i] - b.grossHoles[i];
      }
      return 0;
    });
  };

  // --- RENDERS ---
  return (
    <div style={{ background: '#0f1a0f', color: 'white', minHeight: '100vh', padding: '15px', fontFamily: 'sans-serif' }}>
      <header style={{ textAlign: 'center', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '1.5rem', letterSpacing: '2px' }}>COPA MACI 2026</h1>
      </header>

      {/* BOTONES PRINCIPALES (20% más chicos) */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '20px' }}>
        <button onClick={() => setView("card")} style={btnStyle}>⛳ Cargar</button>
        <button onClick={() => setView("ranking")} style={btnStyle}>⛳ Ranking</button>
        <button onClick={() => setView("gira")} style={btnStyle}>⛳ Gira</button>
      </div>

      {/* VISTA RANKING ANUAL */}
      {view === "ranking" && (
        <div>
          <h2 style={{ textAlign: 'center', fontSize: '1rem', color: '#88a' }}>Leaderboard Anual</h2>
          {sortScores(scores).map((s, i) => (
            <div key={s.id} style={rowStyle}>
              <span>{i + 1}. {players.find(p => p.id === s.playerId)?.name}</span>
              <span style={{ fontWeight: 'bold' }}>{s.grossHoles.reduce((sum, h) => sum + h, 0) - s.hcp} Net</span>
            </div>
          ))}
        </div>
      )}

      {/* MODO GIRA (RDM vs LDS) */}
      {view === "gira" && (
        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'space-around', background: '#222', padding: '15px', borderRadius: '10px' }}>
            <div><h3>RDM</h3><p style={{ fontSize: '2rem' }}>{giraMatches.reduce((acc, m) => acc + (m.winner === 'RDM' ? 1 : m.winner === 'Empate' ? 0.5 : 0), 0)}</p></div>
            <div style={{ fontSize: '1.5rem', alignSelf: 'center' }}>VS</div>
            <div><h3>LDS</h3><p style={{ fontSize: '2rem' }}>{giraMatches.reduce((acc, m) => acc + (m.winner === 'LDS' ? 1 : m.winner === 'Empate' ? 0.5 : 0), 0)}</p></div>
          </div>
          <button style={{ ...btnStyle, marginTop: '20px' }}>+ Nuevo Partido Gira</button>
        </div>
      )}

      {/* SECCIÓN ADMIN IGNACIO */}
      <footer style={{ marginTop: '40px', borderTop: '1px solid #333', paddingTop: '10px', textAlign: 'center' }}>
        {!isAdmin ? (
          <button onClick={() => prompt("PIN Admin:") === "1234" && setIsAdmin(true)} style={{ background: 'none', color: '#555', border: 'none' }}>Admin Access</button>
        ) : (
          <div>
            <p>Hola Ignacio! [Admin Mode]</p>
            <button onClick={() => setView("admin")} style={btnStyle}>Gestionar Jugadores</button>
          </div>
        )}
      </footer>
    </div>
  );
}

const btnStyle = {
  background: '#2e4d2e', color: 'white', border: 'none', padding: '8px 12px',
  borderRadius: '20px', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px'
};

const rowStyle = {
  display: 'flex', justifyContent: 'space-between', padding: '12px',
  borderBottom: '1px solid #222', fontSize: '0.9rem'
};
