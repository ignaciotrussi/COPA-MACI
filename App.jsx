import React, { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from "firebase/firestore";

// --- FIREBASE ---
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

const MODALIDADES_AAG = ["Medal Play", "Fourball", "Match Play", "Laguneada", "Scramble"];

export default function App() {
  const [view, setView] = useState("ranking"); 
  const [isAdmin, setIsAdmin] = useState(false);

  // Estilo de botones: 20% más chicos, verde oscuro, sin bordes claros
  const btnStyle = {
    background: '#1b331b', 
    color: '#e0e0e0', 
    border: '1px solid #2d4a2d', 
    padding: '6px 10px', 
    borderRadius: '12px', 
    fontSize: '0.7rem', 
    cursor: 'pointer', 
    display: 'flex', 
    alignItems: 'center', 
    gap: '4px'
  };

  // Estilo de inputs/selects: Oscuros
  const inputStyle = {
    width: '100%',
    padding: '10px',
    margin: '8px 0',
    background: '#1a1a1a',
    border: '1px solid #333',
    color: 'white',
    borderRadius: '8px',
    fontSize: '0.9rem'
  };

  return (
    <div style={{ background: '#0a1a0a', color: 'white', minHeight: '100vh', padding: '20px' }}>
      <header style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h1 style={{ fontSize: '1.4rem', letterSpacing: '1px', color: '#f0f0f0' }}>⛳ COPA MACI 2026</h1>
        <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, #2d4a2d, transparent)', marginTop: '10px' }}></div>
      </header>

      <nav style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '30px' }}>
        <button onClick={() => setView("card")} style={btnStyle}>⛳ Cargar</button>
        <button onClick={() => setView("ranking")} style={btnStyle}>⛳ Ranking</button>
        <button onClick={() => setView("gira")} style={btnStyle}>⛳ Gira</button>
      </nav>

      {view === "gira" && (
        <div style={{ background: '#0f0f0f', padding: '20px', borderRadius: '15px', border: '1px solid #1b331b' }}>
          <h2 style={{ fontSize: '1rem', marginBottom: '15px', color: '#88a688' }}>Modo Gira: RDM vs LDS</h2>
          <select style={inputStyle}>
            <option>Elegí tu equipo</option>
            <option value="RDM">RDM</option>
            <option value="LDS">LDS</option>
          </select>
          <select style={inputStyle}>
            <option>Modalidad AAG</option>
            {MODALIDADES_AAG.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <p style={{ marginTop: '20px', fontSize: '0.75rem', color: '#555', textAlign: 'center' }}>
            Independiente del Torneo Anual
          </p>
        </div>
      )}

      {/* Footer Admin muy sutil */}
      <footer style={{ marginTop: '60px', textAlign: 'center' }}>
        {!isAdmin && (
          <button 
            onClick={() => prompt("PIN de Admin:") === "1234" && setIsAdmin(true)} 
            style={{ background: 'none', border: 'none', color: '#222', fontSize: '0.6rem' }}
          >
            Config
          </button>
        )}
      </footer>
    </div>
  );
}
