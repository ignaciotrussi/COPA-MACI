import React, { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, doc, deleteDoc } from "firebase/firestore";

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

const COURSES = ["Hacoaj", "Jockey Club", "Los Lagartos", "Hindú Club", "CASI", "Otro"];
const MODALIDADES_AAG = ["Medal Play", "Fourball", "Match Play", "Laguneada", "Scramble"];

export default function App() {
  const [view, setView] = useState("ranking");
  const [players, setPlayers] = useState([]);
  const [scores, setScores] = useState([]);
  const [giraMatches, setGiraMatches] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [giraData, setGiraData] = useState({ equipo: "", modalidad: "", rival: "" });

  const [card, setCard] = useState({
    playerId: "", date: "", course: "", otherCourse: "", hcp: 0,
    grossHoles: Array(18).fill(0), longDrive: false, bestApproach: false
  });

  useEffect(() => {
    onSnapshot(query(collection(db, "players"), orderBy("name")), (s) =>
      setPlayers(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    onSnapshot(query(collection(db, "scores"), orderBy("createdAt", "desc")), (s) =>
      setScores(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    onSnapshot(collection(db, "gira"), (s) =>
      setGiraMatches(s.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, []);

  const sortScores = (allScores, type = "net") => {
    return [...allScores].sort((a, b) => {
      const valA = type === "net" ? (a.totalGross - a.hcp) : a.totalGross;
      const valB = type === "net" ? (b.totalGross - b.hcp) : b.totalGross;
      
      if (valA !== valB) return valA - valB;
      
      const gB9A = a.grossHoles.slice(9).reduce((s, h) => s + (parseInt(h) || 0), 0);
      const gB9B = b.grossHoles.slice(9).reduce((s, h) => s + (parseInt(h) || 0), 0);
      if (gB9A !== gB9B) return gB9A - gB9B;

      for (let i = 17; i >= 0; i--) {
        if (a.grossHoles[i] !== b.grossHoles[i]) return a.grossHoles[i] - b.grossHoles[i];
      }
      return 0;
    });
  };

  const btnStyle = {
    background: '#1b331b', color: '#e0e0e0', border: '1px solid #2d4a2d',
    padding: '6px 10px', borderRadius: '12px', fontSize: '0.7rem',
    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
  };

  const inputStyle = {
    width: '100%', padding: '10px', margin: '8px 0',
    background: '#1a1a1a', border: '1px solid #333', color: 'white',
    borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box'
  };

  const rowStyle = {
    display: 'flex', justifyContent: 'space-between', padding: '12px',
    borderBottom: '1px solid #1b331b', fontSize: '0.9rem'
  };

  return (
    <div style={{ background: '#0a1a0a', color: 'white', minHeight: '100vh', padding: '20px', boxSizing: 'border-box' }}>
      <header style={{ textAlign: 'center', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '1.4rem', letterSpacing: '1px', color: '#f0f0f0', margin: 0 }}>⛳ COPA MACI 2026</h1>
        <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, #2d4a2d, transparent)', marginTop: '10px' }}></div>
      </header>

      <nav style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '25px' }}>
        <button onClick={() => setView("card")} style={btnStyle}>⛳ Cargar</button>
        <button onClick={() => setView("ranking")} style={btnStyle}>⛳ Ranking</button>
        <button onClick={() => setView("gross")} style={btnStyle}>⛳ Gross</button>
        <button onClick={() => setView("gira")} style={btnStyle}>⛳ Gira</button>
      </nav>

      {view === "ranking" && (
        <div>
          <h2 style={{ textAlign: 'center', fontSize: '1rem', color: '#88a688', marginBottom: '15px' }}>Leaderboard Anual (Neto)</h2>
          {sortScores(scores, "net").map((s, i) => (
            <div key={s.id} style={rowStyle}>
              <span>{i + 1}. {players.find(p => p.id === s.playerId)?.name || "Jugador"}</span>
              <span style={{ fontWeight: 'bold' }}>{s.totalNet} Net</span>
            </div>
          ))}
        </div>
      )}

      {view === "gross" && (
        <div>
          <h2 style={{ textAlign: 'center', fontSize: '1rem', color: '#88a688', marginBottom: '15px' }}>Ranking Mejor Gross</h2>
          {sortScores(scores, "gross").map((s, i) => (
            <div key={s.id} style={rowStyle}>
              <span>{i + 1}. {players.find(p => p.id === s.playerId)?.name || "Jugador"}</span>
              <span style={{ fontWeight: 'bold' }}>{s.totalGross} Gross</span>
            </div>
          ))}
        </div>
      )}

      {view === "card" && (
        <div style={{ background: '#0f0f0f', padding: '15px', borderRadius: '15px', border: '1px solid #1b331b' }}>
          <h2 style={{ fontSize: '1rem', marginBottom: '15px', color: '#88a688', textAlign: 'center' }}>Nueva Tarjeta</h2>
          <form onSubmit={async (e) => {
            e.preventDefault();
            const totalGross = card.grossHoles.reduce((acc, val) => acc + (parseInt(val) || 0), 0);
            const totalNet = totalGross - (parseInt(card.hcp) || 0);
            await addDoc(collection(db, "scores"), { ...card, totalGross, totalNet, createdAt: serverTimestamp() });
            alert("Tarjeta cargada!");
            setView("ranking");
          }}>
            <select required style={inputStyle} onChange={(e) => setCard({...card, playerId: e.target.value})}>
              <option value="">Elegí Jugador</option>
              {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select required style={inputStyle} onChange={(e) => setCard({...card, course: e.target.value})}>
              <option value="">Elegí Cancha</option>
              {COURSES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {card.course === "Otro" && <input placeholder="Nombre de la cancha" style={inputStyle} onChange={(e) => setCard({...card, otherCourse: e.target.value})} />}
            <div style={{ display: 'flex', gap: '10px' }}>
              <input type="date" required style={inputStyle} onChange={(e) => setCard({...card, date: e.target.value})} />
              <input type="number" placeholder="HCP" style={inputStyle} onChange={(e) => setCard({...card, hcp: e.target.value})} />
            </div>
            <div style={{ marginTop: '15px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: '4px' }}>
                {card.grossHoles.map((val, i) => (
                  <input key={i} type="number" placeholder={i+1} style={{ ...inputStyle, padding: '5px', textAlign: 'center', margin: 0, fontSize: '0.8rem' }}
                    onChange={(e) => { const newHoles = [...card.grossHoles]; newHoles[i] = e.target.value; setCard({...card, grossHoles: newHoles}); }} />
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-around', margin: '20px 0' }}>
              <label style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <input type="checkbox" onChange={(e) => setCard({...card, longDrive: e.target.checked})} /> Long Drive
              </label>
              <label style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <input type="checkbox" onChange={(e) => setCard({...card, bestApproach: e.target.checked})} /> Best Approach
              </label>
            </div>
            <button type="submit" style={{ ...btnStyle, width: '100%', padding: '12px', fontSize: '0.9rem', justifyContent: 'center' }}>⛳ GUARDAR TARJETA</button>
          </form>
        </div>
      )}

      {view === "gira" && (
        <div style={{ background: '#0f0f0f', padding: '20px', borderRadius: '15px', border: '1px solid #1b331b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '20px' }}>
            <div style={{ textAlign: 'center' }}><h3>RDM</h3><p style={{ fontSize: '2rem', margin: 0 }}>{giraMatches.reduce((acc, m) => acc + (m.winner === 'RDM' ? 1 : m.winner === 'Empate' ? 0.5 : 0), 0)}</p></div>
            <div style={{ fontSize: '1.5rem', alignSelf: 'center' }}>VS</div>
            <div style={{ textAlign: 'center' }}><h3>LDS</h3><p style={{ fontSize: '2rem', margin: 0 }}>{giraMatches.reduce((acc, m) => acc + (m.winner === 'LDS' ? 1 : m.winner === 'Empate' ? 0.5 : 0), 0)}</p></div>
          </div>
          <select style={inputStyle} onChange={(e) => setGiraData({...giraData, equipo: e.target.value})}>
            <option>Elegí equipo</option>
            <option value="RDM">RDM</option>
            <option value="LDS">LDS</option>
          </select>
          <select style={inputStyle} onChange={(e) => setGiraData({...giraData, modalidad: e.target.value})}>
            {MODALIDADES_AAG.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <button style={{ ...btnStyle, width: '100%', marginTop: '10px', justifyContent: 'center' }}>+ Nuevo Partido</button>
        </div>
      )}

      {view === "admin" && isAdmin && (
        <div style={{ background: '#0f0f0f', padding: '15px', borderRadius: '15px' }}>
          <h3>Gestionar Jugadores</h3>
          <form onSubmit={async (e) => {
            e.preventDefault();
            const n = e.target.name.value;
            const m = e.target.mat.value;
            await addDoc(collection(db, "players"), { name: n, mat: m });
            e.target.reset();
          }}>
            <input name="name" placeholder="Nombre y Apellido" style={inputStyle} required />
            <input name="mat" placeholder="Matrícula" style={inputStyle} required />
            <button type="submit" style={{ ...btnStyle, width: '100%' }}>Agregar Jugador</button>
          </form>
          <div style={{ marginTop: '20px' }}>
            {players.map(p => (
              <div key={p.id} style={rowStyle}>
                <span>{p.name} ({p.mat})</span>
                <button onClick={() => deleteDoc(doc(db, "players", p.id))} style={{ background: 'red', border: 'none', color: 'white', borderRadius: '5px' }}>X</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <footer style={{ marginTop: '60px', textAlign: 'center' }}>
        {!isAdmin ? (
          <button onClick={() => prompt("PIN Admin:") === "1234" && setIsAdmin(true)} style={{ background: 'none', border: 'none', color: '#222', fontSize: '0.6rem' }}>Config</button>
        ) : (
          <button onClick={() => setView("admin")} style={{ ...btnStyle, margin: '0 auto' }}>Panel Admin</button>
        )}
      </footer>
    </div>
  );
}
