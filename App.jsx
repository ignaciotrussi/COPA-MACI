import React, { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, doc, deleteDoc, getDocs } from "firebase/firestore";

// --- IMPORTACIÓN DEL LOGO (OPCIÓN B) ---
import logoMaci from "./logo.jpg";

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
const INITIAL_PLAYERS = [
  { name: "Esteban Chicco", mat: "56229" }, { name: "Juan José Hardoy", mat: "112534" },
  { name: "Manuel Gosende", mat: "175387" }, { name: "Rodrigo López Martínez", mat: "132679" },
  { name: "Ignacio Trussi", mat: "46215" }, { name: "Andrés Torres Carbonell", mat: "52274" },
  { name: "Federico Procaccini", mat: "121277" }, { name: "Ignacio Macías", mat: "45585" },
  { name: "Mariano Bustillo", mat: "119275" }, { name: "Carlos Segundo Morixe", mat: "119372" },
  { name: "Francisco Goldaracena", mat: "173455" }
];

const COURSES = ["Hacoaj", "Jockey Club", "Los Lagartos", "Hindú Club", "CASI", "Otro"];
const PTS_TABLE = [10, 8, 6, 5, 4, 3];

export default function App() {
  const [view, setView] = useState("ranking");
  const [players, setPlayers] = useState([]);
  const [scores, setScores] = useState([]);
  const [giraMatches, setGiraMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [giraForm, setGiraForm] = useState({ team: "A", detail: "" });
  const [card, setCard] = useState({ playerId: "", date: "", course: "Hacoaj", hcp: 0, grossHoles: Array(18).fill(0), longDrive: false, bestApproach: false });

  useEffect(() => {
    const initApp = async () => {
      const pSnap = await getDocs(collection(db, "players"));
      if (pSnap.empty) {
        for (const p of INITIAL_PLAYERS) { await addDoc(collection(db, "players"), p); }
      }
    };
    initApp();

    const unsubPlayers = onSnapshot(query(collection(db, "players"), orderBy("name")), (s) => {
      setPlayers(s.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    const unsubScores = onSnapshot(query(collection(db, "scores"), orderBy("date", "desc")), (s) =>
      setScores(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubGira = onSnapshot(collection(db, "gira"), (s) =>
      setGiraMatches(s.docs.map(d => ({ id: d.id, ...d.data() }))));

    return () => { unsubPlayers(); unsubScores(); unsubGira(); };
  }, []);

  const checkAdmin = () => prompt("PIN de Administrador:") === "6677";

  // --- LÓGICA DE RANKING ANUAL (MEJOR NETO POR MES) ---
  const getAnnualRanking = () => {
    const stats = {};
    players.forEach(p => { stats[p.id] = { ...p, totalPts: 0 }; });

    const monthlyBest = {}; 

    scores.forEach(s => {
      const date = new Date(s.date + "T12:00:00");
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
      const net = (parseInt(s.totalGross) || 0) - (parseInt(s.hcp) || 0);

      if (!monthlyBest[monthKey]) monthlyBest[monthKey] = {};
      if (!monthlyBest[monthKey][s.playerId] || net < monthlyBest[monthKey][s.playerId].net) {
        monthlyBest[monthKey][s.playerId] = { ...s, net };
      }
    });

    Object.values(monthlyBest).forEach(monthGroup => {
      const rankedMonth = Object.values(monthGroup).sort((a, b) => a.net - b.net);
      rankedMonth.forEach((s, idx) => {
        if (stats[s.playerId]) {
          let pts = idx < 6 ? PTS_TABLE[idx] : 2;
          if (s.longDrive) pts += 1;
          if (s.bestApproach) pts += 1;
          stats[s.playerId].totalPts += pts;
        }
      });
    });

    return Object.values(stats).sort((a, b) => b.totalPts - a.totalPts);
  };

  // --- LÓGICA MEJOR GROSS ANUAL (POR JUGADOR) ---
  const getBestGrossRanking = () => {
    const bestByPlayer = {};
    scores.forEach(s => {
      const gross = parseInt(s.totalGross) || 999;
      if (!bestByPlayer[s.playerId] || gross < bestByPlayer[s.playerId].totalGross) {
        bestByPlayer[s.playerId] = s;
      }
    });
    return Object.values(bestByPlayer).sort((a, b) => a.totalGross - b.totalGross);
  };

  const btnStyle = { background: '#1b331b', color: '#e0e0e0', border: '1px solid #2d4a2d', padding: '8px 12px', borderRadius: '12px', fontSize: '0.75rem', cursor: 'pointer' };
  const inputStyle = { width: '100%', padding: '10px', margin: '8px 0', background: '#111', border: '1px solid #333', color: 'white', borderRadius: '8px', boxSizing: 'border-box' };

  if (loading) return <div style={{background:'#000', color:'white', height:'100vh', display:'flex', justifyContent:'center', alignItems:'center'}}>Copa Maci...</div>;

  return (
    <div style={{ background: '#000', color: 'white', minHeight: '100vh', padding: '20px', fontFamily: 'sans-serif', boxSizing: 'border-box' }}>
      
      <header style={{ textAlign: 'center', marginBottom: '20px' }}>
        <img src={logoMaci} alt="Copa Maci" style={{ width: '120px', height: 'auto', marginBottom: '10px' }} />
        <h1 style={{ fontSize: '1.4rem', margin: 0 }}>COPA MACI 2026</h1>
      </header>

      <nav style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '25px' }}>
        <button onClick={() => setView("card")} style={btnStyle}>⛳ Cargar</button>
        <button onClick={() => setView("ranking")} style={btnStyle}>⛳ Ranking</button>
        <button onClick={() => setView("gross")} style={btnStyle}>⛳ Gross</button>
        <button onClick={() => setView("gira")} style={btnStyle}>⛳ Gira</button>
      </nav>

      {view === "ranking" && (
        <div>
          <h2 style={{fontSize:'0.9rem', textAlign:'center', color:'#88a688', marginBottom:'15px'}}>RANKING POR PUNTOS</h2>
          {getAnnualRanking().map((p, i) => (
            <div key={p.id} style={{display:'flex', justifyContent:'space-between', padding:'12px', borderBottom:'1px solid #1b331b'}}>
              <span>{i + 1}. {p.name}</span>
              <span style={{fontWeight:'bold', color:'#bbf7bb'}}>{p.totalPts} pts</span>
            </div>
          ))}
          <button onClick={() => { if(checkAdmin()) { const n = prompt("Nombre:"); const m = prompt("Matrícula:"); if(n && m) addDoc(collection(db, "players"), { name: n, mat: m }); } }} style={{...btnStyle, margin:'20px auto', display:'block'}}>+ Jugador</button>
        </div>
      )}

      {view === "gross" && (
        <div>
          <h2 style={{fontSize:'0.9rem', textAlign:'center', color:'#88a688', marginBottom:'15px'}}>MEJOR GROSS HISTÓRICO</h2>
          {getBestGrossRanking().map((s, i) => (
            <div key={s.id} style={{display:'flex', justifyContent:'space-between', padding:'12px', borderBottom:'1px solid #1b331b'}}>
              <span>{i+1}. {players.find(p => p.id === s.playerId)?.name}</span>
              <span style={{color:'#bbf7bb'}}>{s.totalGross} G <span style={{fontSize:'0.7rem', color:'#666'}}>({s.course})</span></span>
            </div>
          ))}
        </div>
      )}

      {view === "card" && (
        <form onSubmit={async (e) => {
          e.preventDefault();
          const totalG = card.grossHoles.reduce((a, b) => a + (parseInt(b) || 0), 0);
          await addDoc(collection(db, "scores"), { ...card, totalGross: totalG, createdAt: serverTimestamp() });
          alert("Tarjeta cargada!");
          setView("ranking");
        }}>
          <select style={inputStyle} onChange={e => setCard({...card, playerId: e.target.value})} required>
            <option value="">Seleccionar Jugador</option>
            {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <input type="date" style={inputStyle} onChange={e => setCard({...card, date: e.target.value})} required />
          <select style={inputStyle} value={card.course} onChange={e => setCard({...card, course: e.target.value})} required>
            {COURSES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input type="number" placeholder="Hándicap de juego" style={inputStyle} onChange={e => setCard({...card, hcp: e.target.value})} required />
          <div style={{display:'grid', gridTemplateColumns:'repeat(6, 1fr)', gap:'5px', marginTop:'10px'}}>
            {card.grossHoles.map((h, i) => (
              <input key={i} type="number" placeholder={i+1} style={{...inputStyle, padding:'5px', textAlign:'center', margin:0}} 
                onChange={e => {
                  const newHoles = [...card.grossHoles];
                  newHoles[i] = e.target.value;
                  setCard({...card, grossHoles: newHoles});
                }} 
              />
            ))}
          </div>
          <div style={{marginTop:'15px'}}>
            <label style={{display:'block', marginBottom:'8px'}}><input type="checkbox" onChange={e => setCard({...card, longDrive: e.target.checked})} /> Long Drive (+1 pt)</label>
            <label style={{display:'block'}}><input type="checkbox" onChange={e => setCard({...card, bestApproach: e.target.checked})} /> Best Approach (+1 pt)</label>
          </div>
          <button type="submit" style={{...btnStyle, width:'100%', marginTop:'20px', background:'#2d4a2d', padding:'12px'}}>Subir Tarjeta</button>
        </form>
      )}

      {view === "gira" && (
        <div>
          <form style={{background:'#080808', padding:'15px', borderRadius:'15px', marginBottom:'20px'}} onSubmit={async (e) => {
            e.preventDefault();
            await addDoc(collection(db, "gira"), { ...giraForm, createdAt: serverTimestamp() });
            setGiraForm({ team: "A", detail: "" });
          }}>
            <select style={inputStyle} value={giraForm.team} onChange={e => setGiraForm({...giraForm, team: e.target.value})}>
              <option value="A">Equipo A</option>
              <option value="B">Equipo B</option>
            </select>
            <input placeholder="Detalle (ej: Ganó 2up)" style={inputStyle} value={giraForm.detail} onChange={e => setGiraForm({...giraForm, detail: e.target.value})} required />
            <button type="submit" style={{...btnStyle, width:'100%'}}>Cargar Resultado Gira</button>
          </form>
          {giraMatches.map(m => (
            <div key={m.id} style={{padding:'10px', borderBottom:'1px solid #333', display:'flex', justifyContent:'space-between'}}>
              <span><strong>EQ {m.team}:</strong> {m.detail}</span>
              <button onClick={() => { if(checkAdmin()) deleteDoc(doc(db, "gira", m.id)); }} style={{color:'maroon', border:'none', background:'none', cursor:'pointer'}}>×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
