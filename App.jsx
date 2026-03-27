import React, { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, doc, deleteDoc, getDocs } from "firebase/firestore";

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
const PTS_TABLE = [10, 8, 6, 5, 4, 3];

function LogoSVG({ size = 64 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      <circle cx="100" cy="100" r="90" stroke="white" strokeWidth="14" fill="none" />
      <path d="M 155 100 A 55 55 0 1 0 140 148" stroke="white" strokeWidth="14" fill="none" strokeLinecap="round" />
      <path d="M 60 158 L 60 92 L 100 130 L 140 92 L 140 158" stroke="white" strokeWidth="14" fill="none" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export default function App() {
  const [view, setView] = useState("ranking");
  const [players, setPlayers] = useState([]);
  const [scores, setScores] = useState([]);
  const [giraMatches, setGiraMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [card, setCard] = useState({ playerId: "", date: "", course: "", otherCourse: "", hcp: 0, grossHoles: Array(18).fill(0), longDrive: false, bestApproach: false });

  useEffect(() => {
    const initApp = async () => {
      const pSnap = await getDocs(collection(db, "players"));
      if (pSnap.empty) { for (const p of INITIAL_PLAYERS) { await addDoc(collection(db, "players"), p); } }
    };
    initApp();
    onSnapshot(query(collection(db, "players"), orderBy("name")), (s) => { setPlayers(s.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); });
    onSnapshot(query(collection(db, "scores"), orderBy("createdAt", "desc")), (s) => setScores(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    onSnapshot(collection(db, "gira"), (s) => setGiraMatches(s.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, []);

  const checkAdmin = () => prompt("PIN de Administrador:") === "1234";

  const getAnnualRanking = () => {
    const stats = {};
    players.forEach(p => { stats[p.id] = { ...p, totalPts: 0 }; });
    const byDate = {};
    scores.forEach(s => { if (!byDate[s.date]) byDate[s.date] = []; byDate[s.date].push(s); });
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
          let p = idx < 6 ? PTS_TABLE[idx] : 2; 
          if (s.longDrive) p += 1; 
          if (s.bestApproach) p += 1; 
          stats[s.playerId].totalPts += p; 
        } 
      });
    });
    return Object.values(stats).sort((a, b) => b.totalPts - a.totalPts);
  };

  const btnStyle = { background: '#1b331b', color: '#e0e0e0', border: '1px solid #2d4a2d', padding: '6px 10px', borderRadius: '12px', fontSize: '0.7rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' };
  const inputStyle = { width: '100%', padding: '10px', margin: '8px 0', background: '#111', border: '1px solid #333', color: 'white', borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box' };

  if (loading) return <div style={{background:'#000', color:'white', height:'100vh', display:'flex', justifyContent:'center', alignItems:'center'}}>Copa Maci...</div>;

  return (
    <div style={{ background: '#000', color: 'white', minHeight: '100vh', padding: '20px', boxSizing: 'border-box' }}>
      <header style={{ textAlign: 'center', marginBottom: '20px' }}>
        <LogoSVG size={70} />
        <h1 style={{ fontSize: '1.4rem', margin: '10px 0' }}>COPA MACI 2026</h1>
      </header>

      <nav style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '25px' }}>
        <button onClick={() => setView("card")} style={btnStyle}>⛳ Cargar</button>
        <button onClick={() => setView("ranking")} style={btnStyle}>⛳ Ranking</button>
        <button onClick={() => setView("gross")} style={btnStyle}>⛳ Gross</button>
        <button onClick={() => setView("gira")} style={btnStyle}>⛳ Gira</button>
      </nav>

      {view === "ranking" && (
        <div>
          {getAnnualRanking().map((p, i) => (
            <div key={p.id} style={{display:'flex', justifyContent:'space-between', padding:'12px', borderBottom:'1px solid #1b331b'}}>
              <div><div>{i + 1}. {p.name}</div><div style={{fontSize:'0.65rem', color:'#555'}}>Mat: {p.mat}</div></div>
              <div style={{display:'flex', gap:'10px', alignItems:'center'}}>
                <div style={{fontWeight:'bold', color:'#bbf7bb'}}>{p.totalPts} pts</div>
                <button onClick={() => { if(checkAdmin()) deleteDoc(doc(db, "players", p.id)); }} style={{background:'none', border:'none', color:'maroon', fontSize:'0.7rem'}}>×</button>
              </div>
            </div>
          ))}
          <button onClick={() => {
            if(checkAdmin()) {
              const n = prompt("Nombre:"); const m = prompt("Matrícula:");
              if(n && m) addDoc(collection(db, "players"), { name: n, mat: m });
            }
          }} style={{...btnStyle, margin:'20px auto', display:'block'}}>+ Agregar / Quitar Jugador</button>
        </div>
      )}

      {view === "gross" && (
        <div>
          {[...scores].sort((a,b) => (a.totalGross || 0) - (b.totalGross || 0)).map((s, i) => (
            <div key={s.id} style={{display:'flex', justifyContent:'space-between', padding:'12px', borderBottom:'1px solid #1b331b'}}>
              <span>{players.find(p => p.id === s.playerId)?.name || "---"} ({s.totalGross} G)</span>
              <button onClick={() => { if(checkAdmin()) deleteDoc(doc(db, "scores", s.id)); }} style={{background:'maroon', color:'white', border:'none', borderRadius:'4px', padding:'2px 8px', fontSize:'0.6rem'}}>Borrar Tarjeta</button>
            </div>
          ))}
        </div>
      )}

      {view === "card" && (
        <div style={{ background: '#080808', padding: '15px', borderRadius: '15px', border: '1px solid #1b331b' }}>
          <form onSubmit={async (e) => { e.preventDefault(); const tg = card.grossHoles.reduce((a, v) => a + (parseInt(v) || 0), 0); const tn = tg - (parseInt(card.hcp) || 0); await addDoc(collection(db, "scores"), { ...card, totalGross: tg, totalNet: tn, createdAt: serverTimestamp() }); alert("Guardado"); setView("ranking"); }}>
            <select required style={inputStyle} onChange={e => setCard({...card, playerId: e.target.value})}><option value="">Jugador</option>{players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
            <div style={{display:'flex', gap:'5px'}}><input type="date" required style={inputStyle} onChange={e => setCard({...card, date: e.target.value})} /><input type="number" placeholder="HCP" style={inputStyle} onChange={e => setCard({...card, hcp: e.target.value})} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: '3px' }}>{card.grossHoles.map((v, i) => (<input key={i} type="number" placeholder={i+1} style={{ ...inputStyle, padding: '5px', textAlign: 'center', fontSize: '0.7rem' }} onChange={e => { const nh = [...card.grossHoles]; nh[i] = e.target.value; setCard({...card, grossHoles: nh}); }} />))}</div>
            <div style={{display:'flex', justifyContent:'space-around', marginTop:'15px'}}><label style={{fontSize:'0.7rem'}}><input type="checkbox" onChange={e => setCard({...card, longDrive: e.target.checked})} /> Long Drive</label><label style={{fontSize:'0.7rem'}}><input type="checkbox" onChange={e => setCard({...card, bestApproach: e.target.checked})} /> Approach</label></div>
            <button type="submit" style={{...btnStyle, width:'100%', marginTop:'15px', padding:'12px', justifyContent:'center'}}>GUARDAR TARJETA</button>
          </form>
        </div>
      )}

      {view === "gira" && (
        <div style={{ background: '#080808', padding: '15px', borderRadius: '15px', border: '1px solid #1b331b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '20px', background:'#111', padding:'10px', borderRadius:'10px' }}>
            <div style={{textAlign:'center'}}><h3>RDM</h3><p style={{fontSize:'2rem', margin:0}}>{giraMatches.reduce((acc, m) => acc + (m.winner === 'RDM' ? 1 : m.winner === 'Empate' ? 0.5 : 0), 0)}</p></div>
            <div style={{fontSize:'1.5rem', alignSelf:'center'}}>VS</div>
            <div style={{textAlign:'center'}}><h3>LDS</h3><p style={{fontSize:'2rem', margin:0}}>{giraMatches.reduce((acc, m) => acc + (m.winner === 'LDS' ? 1 : m.winner === 'Empate' ? 0.5 : 0), 0)}</p></div>
          </div>
          <button onClick={async () => { const w = prompt("Ganador (RDM / LDS / Empate):"); if(w && checkAdmin()) await addDoc(collection(db, "gira"), { winner: w, createdAt: serverTimestamp() }); }} style={{...btnStyle, width:'100%', justifyContent:'center'}}>+ Resultado Gira (Admin)</button>
        </div>
      )}
    </div>
  );
}
