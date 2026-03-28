import React, { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, doc, deleteDoc, getDocs } from "firebase/firestore";

// ─── CONFIGURACIÓN FIREBASE ──────────────────────────────────────────────────
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

// ─── CONSTANTES Y JUGADORES INICIALES ────────────────────────────────────────
const INITIAL_PLAYERS = [
  { name: "Esteban Chicco", mat: "56229" }, { name: "Juan José Hardoy", mat: "112534" },
  { name: "Manuel Gosende", mat: "175387" }, { name: "Rodrigo López Martínez", mat: "132679" },
  { name: "Ignacio Trussi", mat: "46215" }, { name: "Andrés Torres Carbonell", mat: "52274" },
  { name: "Federico Procaccini", mat: "121277" }, { name: "Ignacio Macías", mat: "45585" },
  { name: "Mariano Bustillo", mat: "119275" }, { name: "Carlos Segundo Morixe", mat: "119372" },
  { name: "Francisco Goldaracena", mat: "173455" }
];

const COURSES = ["Hacoaj", "Jockey Club", "Los Lagartos", "Hindú Club", "CASI", "Otro"];
const MODALIDADES_AAG = ["Medal Play", "Fourball", "Match Play", "Laguneada", "Scramble"];
const PTS_TABLE = [10, 8, 6, 5, 4, 3]; // Puntos para posiciones 1 a 6

export default function App() {
  const [view, setView] = useState("ranking");
  const [players, setPlayers] = useState([]);
  const [scores, setScores] = useState([]);
  const [giraMatches, setGiraMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [giraForm, setGiraForm] = useState({ team: "", modality: "", p1: "", p2: "" });
  const [card, setCard] = useState({ playerId: "", date: "", course: "", otherCourse: "", hcp: 0, grossHoles: Array(18).fill(0), longDrive: false, bestApproach: false });

  // ─── EFECTOS DE INICIALIZACIÓN Y FIREBASE ──────────────────────────────────
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
    const unsubScores = onSnapshot(query(collection(db, "scores"), orderBy("createdAt", "desc")), (s) =>
      setScores(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubGira = onSnapshot(collection(db, "gira"), (s) =>
      setGiraMatches(s.docs.map(d => ({ id: d.id, ...d.data() }))));

    return () => { unsubPlayers(); unsubScores(); unsubGira(); };
  }, []);

  // ─── LÓGICA DE ADMINISTRACIÓN ──────────────────────────────────────────────
  const checkAdmin = () => prompt("PIN de Administrador:") === "6677";

  // ─── MOTOR DE RANKING Y DESEMPATE ──────────────────────────────────────────
  const getAnnualRanking = () => {
    const stats = {};
    players.forEach(p => { stats[p.id] = { ...p, totalPts: 0 }; });

    const byDate = {};
    scores.forEach(s => {
      if (!byDate[s.date]) byDate[s.date] = [];
      byDate[s.date].push(s);
    });

    Object.values(byDate).forEach(dayScores => {
      const rankedDay = [...dayScores].sort((a, b) => {
        const netA = (parseInt(a.totalGross) || 0) - (parseInt(a.hcp) || 0);
        const netB = (parseInt(b.totalGross) || 0) - (parseInt(b.hcp) || 0);
        if (netA !== netB) return netA - netB;
        
        const gB9A = (a.grossHoles || []).slice(9).reduce((s, h) => s + (parseInt(h) || 0), 0);
        const gB9B = (b.grossHoles || []).slice(9).reduce((s, h) => s + (parseInt(h) || 0), 0);
        if (gB9A !== gB9B) return gB9A - gB9B;

        for (let i = 17; i >= 0; i--) { 
          const vA = parseInt(a.grossHoles?.[i]) || 0;
          const vB = parseInt(b.grossHoles?.[i]) || 0;
          if (vA !== vB) return vA - vB; 
        }
        return 0;
      });

      rankedDay.forEach((s, idx) => {
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

  // ─── ESTILOS ───────────────────────────────────────────────────────────────
  const btnStyle = { background: '#1b331b', color: '#e0e0e0', border: '1px solid #2d4a2d', padding: '6px 10px', borderRadius: '12px', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' };
  const inputStyle = { width: '100%', padding: '10px', margin: '8px 0', background: '#111', border: '1px solid #333', color: 'white', borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box' };
  const rowStyle = { display: 'flex', justifyContent: 'space-between', padding: '12px', borderBottom: '1px solid #1b331b', fontSize: '0.9rem', alignItems: 'center' };

  if (loading) return <div style={{background:'#000', color:'white', height:'100vh', display:'flex', justifyContent:'center', alignItems:'center'}}>Cargando Copa Maci...</div>;

  return (
    <div style={{ background: '#000', color: 'white', minHeight: '100vh', padding: '20px', boxSizing: 'border-box', fontFamily: 'sans-serif' }}>
      
      {/* CABECERA CON LOGO ADJUNTO */}
      <header style={{ textAlign: 'center', marginBottom: '20px' }}>
        <img src="/logo.jpg" alt="Logo Copa Maci" style={{ width: '140px', height: 'auto', marginBottom: '10px' }} />
        <h1 style={{ fontSize: '1.4rem', margin: '10px 0', letterSpacing: '1px' }}>COPA MACI 2026</h1>
        <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, #2d4a2d, transparent)', marginTop: '10px' }}></div>
      </header>

      {/* NAVEGACIÓN */}
      <nav style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '25px' }}>
        <button onClick={() => setView("card")} style={btnStyle}>⛳ Cargar</button>
        <button onClick={() => setView("ranking")} style={btnStyle}>⛳ Ranking</button>
        <button onClick={() => setView("gross")} style={btnStyle}>⛳ Gross</button>
        <button onClick={() => setView("gira")} style={btnStyle}>⛳ Gira</button>
      </nav>

      {/* VISTA RANKING ANUAL (PUNTOS) */}
      {view === "ranking" && (
        <div>
          <h2 style={{ textAlign: 'center', fontSize: '1rem', color: '#88a688', marginBottom: '15px' }}>Leaderboard (Puntos Acumulados)</h2>
          {getAnnualRanking().map((p, i) => (
            <div key={p.id} style={rowStyle}>
              <div>
                <div style={{ fontWeight: 'bold' }}>{i + 1}. {p.name}</div>
                <div style={{ fontSize: '0.65rem', color: '#555' }}>Mat: {p.mat}</div>
              </div>
              <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                <div style={{ fontWeight: 'bold', color: '#bbf7bb', fontSize: '1.1rem' }}>{p.totalPts} pts</div>
                <button onClick={() => { if(checkAdmin()) deleteDoc(doc(db, "players", p.id)); }} style={{ background: 'none', border: 'none', color: '#331111', fontSize: '0.8rem' }}>×</button>
              </div>
            </div>
          ))}
          <button onClick={() => {
            if(checkAdmin()) {
              const n = prompt("Nombre:"); const m = prompt("Matrícula:");
              if(n && m) addDoc(collection(db, "players"), { name: n, mat: m });
            }
          }} style={{ ...btnStyle, margin: '25px auto', display: 'block' }}>+ Agregar / Quitar Jugador</button>
        </div>
      )}

      {/* VISTA RANKING MEJOR GROSS */}
      {view === "gross" && (
        <div>
          <h2 style={{ textAlign: 'center', fontSize: '1rem', color: '#88a688', marginBottom: '15px' }}>Mejor Gross del Día</h2>
          {[...scores].sort((a,b) => (a.totalGross || 0) - (b.totalGross || 0)).map((s, i) => (
            <div key={s.id} style={rowStyle}>
              <span>{players.find(p => p.id === s.playerId)?.name || "---"} ({s.totalGross} G)</span>
              <button onClick={() => { if(checkAdmin()) deleteDoc(doc(db, "scores", s.id)); }} style={{ background: 'maroon', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 8px', fontSize: '0.6rem' }}>Borrar Tarjeta</button>
            </div>
          ))}
        </div>
      )}

      {/* VISTA CARGAR TARJETA */}
      {view === "card" && (
        <div style={{ background: '#080808', padding: '15px', borderRadius: '15px', border: '1px solid #1b331b' }}>
          <h2 style={{ fontSize: '1rem', marginBottom: '15px', color: '#88a688', textAlign: 'center' }}>Cargar Hoyo por Hoyo</h2>
          <form onSubmit={async (e) => {
            e.preventDefault();
            const tg = card.grossHoles.reduce((a, v) => a + (parseInt(v) || 0), 0);
            const tn = tg - (parseInt(card.hcp) || 0);
            await addDoc(collection(db, "scores"), { ...card, totalGross: tg, totalNet: tn, createdAt: serverTimestamp() });
            alert("Tarjeta guardada con éxito");
            setView("ranking");
          }}>
            <select required style={inputStyle} onChange={e => setCard({...card, playerId: e.target.value})}>
              <option value="">Seleccionar Jugador</option>
              {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select style={inputStyle} onChange={e => setCard({...card, course: e.target.value})}>
              {COURSES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <div style={{ display: 'flex', gap: '5px' }}>
              <input type="date" required style={inputStyle} onChange={e => setCard({...card, date: e.target.value})} />
              <input type="number" placeholder="Handicap" style={inputStyle} onChange={e => setCard({...card, hcp: e.target.value})} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: '4px', marginTop: '10px' }}>
              {card.grossHoles.map((v, i) => (
                <input key={i} type="number" placeholder={i+1} style={{ ...inputStyle, padding: '5px', textAlign: 'center', fontSize: '0.8rem', margin: 0 }}
                  onChange={e => { const nh = [...card.grossHoles]; nh[i] = e.target.value; setCard({...card, grossHoles: nh}); }} />
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-around', margin: '20px 0' }}>
               <label style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                 <input type="checkbox" onChange={e => setCard({...card, longDrive: e.target.checked})} /> Long Drive
               </label>
               <label style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                 <input type="checkbox" onChange={e => setCard({...card, bestApproach: e.target.checked})} /> Approach
               </label>
            </div>
            <button type="submit" style={{ ...btnStyle, width: '100%', padding: '12px', justifyContent: 'center', fontSize: '0.9rem' }}>⛳ GUARDAR TARJETA</button>
          </form>
        </div>
      )}

      {view === "gira" && (
        <div style={{ background: '#080808', padding: '15px', borderRadius: '15px', border: '1px solid #1b331b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '20px', background: '#111', padding: '15px', borderRadius: '12px' }}>
            <div style={{ textAlign: 'center' }}><h3>RDM</h3><p style={{ fontSize: '2.5rem', margin: 0 }}>{giraMatches.reduce((acc, m) => acc + (m.winner === 'RDM' ? 1 : m.winner === 'Empate' ? 0.5 : 0), 0)}</p></div>
            <div style={{ fontSize: '2rem', alignSelf: 'center', opacity: 0.3 }}>VS</div>
            <div style={{ textAlign: 'center' }}><h3>LDS</h3><p style={{ fontSize: '2.5rem', margin: 0 }}>{giraMatches.reduce((acc, m) => acc + (m.winner === 'LDS' ? 1 : m.winner === 'Empate' ? 0.5 : 0), 0)}</p></div>
          </div>
          <h4 style={{ color: '#88a688', marginBottom: '10px' }}>Nuevo Partido Gira</h4>
          <select style={inputStyle} onChange={e => setGiraForm({...giraForm, team: e.target.value})}>
            <option value="">Tu Equipo</option><option value="RDM">RDM</option><option value="LDS">LDS</option>
          </select>
          <select style={inputStyle} onChange={e => setGiraForm({...giraForm, modality: e.target.value})}>
            <option value="">Modalidad AAG</option>
            {MODALIDADES_AAG.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select style={inputStyle} onChange={e => setGiraForm({...giraForm, p1: e.target.value})}>
            <option value="">Jugador de tu equipo</option>
            {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <div style={{ display: 'flex', gap: '8px', marginTop: '15px' }}>
            <button onClick={async () => { if(giraForm.team && checkAdmin()) { await addDoc(collection(db, "gira"), { ...giraForm, winner: giraForm.team, createdAt: serverTimestamp() }); } }} style={{ ...btnStyle, flex: 1, justifyContent: 'center', background: '#2e4d2e' }}>Ganamos (1pt)</button>
            <button onClick={async () => { if(giraForm.team && checkAdmin()) { await addDoc(collection(db, "gira"), { winner: "Empate", createdAt: serverTimestamp() }); } }} style={{ ...btnStyle, flex: 1, justifyContent: 'center' }}>Empate (0.5)</button>
          </div>
          <p style={{ fontSize: '0.65rem', textAlign: 'center', marginTop: '15px', opacity: 0.4 }}>* Los puntos de Gira son independientes del Ranking Anual.</p>
        </div>
      )}
    </div>
  );
}
