import React, { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, doc, deleteDoc, getDocs } from "firebase/firestore";

// --- IMPORTACIÓN DEL LOGO ---
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

const COURSES = ["Hacoaj", "Jockey Club", "Los Lagartos", "Hindú Club", "CASI", "Otro"];
const PTS_TABLE = [10, 8, 6, 5, 4, 3];

export default function App() {
  const [view, setView] = useState("ranking");
  const [players, setPlayers] = useState([]);
  const [scores, setScores] = useState([]);
  const [giraMatches, setGiraMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedScore, setSelectedScore] = useState(null);

  // Form de Giras con selectores de jugadores
  const [giraForm, setGiraForm] = useState({ equipo: "RDM", jugador1: "", rival: "", puntos: 1 });
  
  const [card, setCard] = useState({ playerId: "", date: "", course: "Hacoaj", hcp: 0, grossHoles: Array(18).fill(0), longDrive: false, bestApproach: false });

  useEffect(() => {
    onSnapshot(query(collection(db, "players"), orderBy("name")), (s) => { 
      setPlayers(s.docs.map(d => ({ id: d.id, ...d.data() }))); 
      setLoading(false); 
    });
    onSnapshot(query(collection(db, "scores"), orderBy("date", "desc")), (s) => 
      setScores(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    onSnapshot(collection(db, "gira"), (s) => 
      setGiraMatches(s.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, []);

  const checkAdmin = () => prompt("PIN de Administrador:") === "6677";

  const getAnnualRanking = () => {
    const stats = {};
    players.forEach(p => { stats[p.id] = { ...p, totalPts: 0, bestMonthScore: null }; });
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
          stats[s.playerId].bestMonthScore = s; 
        }
      });
    });
    return Object.values(stats).sort((a, b) => b.totalPts - a.totalPts);
  };

  const giraPuntos = giraMatches.reduce((acc, m) => {
    acc[m.equipo] = (acc[m.equipo] || 0) + parseFloat(m.puntos);
    return acc;
  }, { RDM: 0, LDS: 0 });

  const btnStyle = { background: '#1b331b', color: '#e0e0e0', border: '1px solid #2d4a2d', padding: '10px', borderRadius: '12px', fontSize: '0.75rem', cursor: 'pointer' };
  const inputStyle = { width: '100%', padding: '12px', margin: '8px 0', background: '#111', border: '1px solid #333', color: 'white', borderRadius: '8px', boxSizing: 'border-box' };

  if (loading) return <div style={{background:'#000', color:'white', height:'100vh', display:'flex', justifyContent:'center', alignItems:'center'}}>Copa Maci...</div>;

  return (
    <div style={{ background: '#000', color: 'white', minHeight: '100vh', padding: '15px', fontFamily: 'sans-serif' }}>
      
      <header style={{ textAlign: 'center', marginBottom: '20px' }}>
        <img src={logoMaci} alt="Logo" style={{ width: '100px', marginBottom: '10px' }} />
        <h1 style={{ fontSize: '1.2rem', margin: 0 }}>COPA MACI 2026</h1>
      </header>

      <nav style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '25px' }}>
        <button onClick={() => setView("ranking")} style={btnStyle}>🏆 Ranking</button>
        <button onClick={() => setView("gira")} style={btnStyle}>⚔️ Giras</button>
        <button onClick={() => setView("card")} style={btnStyle}>⛳ Cargar</button>
      </nav>

      {view === "ranking" && (
        <div>
          {getAnnualRanking().map((p, i) => (
            <div key={p.id} style={{padding:'12px', borderBottom:'1px solid #1b331b'}} onClick={() => p.bestMonthScore && setSelectedScore(p.bestMonthScore)}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <span>{i + 1}. <strong>{p.name}</strong></span>
                <span style={{color:'#bbf7bb', fontWeight:'bold'}}>{p.totalPts} pts ⮕</span>
              </div>
            </div>
          ))}
          
          {selectedScore && (
            <div style={{position:'fixed', top:0, left:0, width:'100%', height:'100%', background:'rgba(0,0,0,0.95)', padding:'20px', boxSizing:'border-box', overflowY:'auto', zIndex: 100}}>
              <button onClick={() => setSelectedScore(null)} style={{...btnStyle, marginBottom:'20px'}}>✕ Cerrar Detalle</button>
              <h2>Jugador: {players.find(p => p.id === selectedScore.playerId)?.name}</h2>
              <p>Fecha: {selectedScore.date} | Cancha: {selectedScore.course}</p>
              <p>Hándicap: {selectedScore.hcp} | Neto: {selectedScore.net}</p>
              <div style={{display:'grid', gridTemplateColumns:'repeat(6, 1fr)', gap:'5px', marginBottom:'20px'}}>
                {selectedScore.grossHoles.map((h, i) => <div key={i} style={{background:'#222', padding:'10px', textAlign:'center', borderRadius:'5px'}}>{i+1}<br/><strong>{h}</strong></div>)}
              </div>
              <button onClick={() => { if(checkAdmin()) { deleteDoc(doc(db, "scores", selectedScore.id)); setSelectedScore(null); } }} style={{background:'maroon', color:'white', border:'none', padding:'15px', borderRadius:'8px', width:'100%', cursor:'pointer'}}>Borrar Tarjeta (Admin)</button>
            </div>
          )}
        </div>
      )}

      {view === "gira" && (
        <div>
          <div style={{display:'flex', justifyContent:'space-around', background:'#111', padding:'15px', borderRadius:'15px', marginBottom:'20px', textAlign:'center', border:'1px solid #2d4a2d'}}>
            <div><div style={{fontSize:'0.7rem', color:'#3b82f6'}}>RDM</div><div style={{fontSize:'1.8rem', fontWeight:'bold'}}>{giraPuntos.RDM}</div></div>
            <div style={{fontSize:'1.2rem', alignSelf:'center', color:'#555'}}>VS</div>
            <div><div style={{fontSize:'0.7rem', color:'#ef4444'}}>LDS</div><div style={{fontSize:'1.8rem', fontWeight:'bold'}}>{giraPuntos.LDS}</div></div>
          </div>

          <form style={{background:'#080808', padding:'15px', borderRadius:'15px', border:'1px solid #1b331b'}} onSubmit={async (e) => {
            e.preventDefault();
            await addDoc(collection(db, "gira"), { ...giraForm, createdAt: serverTimestamp() });
            setGiraForm({...giraForm, jugador1: "", rival: ""});
          }}>
            <h3 style={{fontSize:'0.9rem', textAlign:'center', marginBottom:'15px'}}>CARGAR ENFRENTAMIENTO</h3>
            <div style={{display:'flex', gap:'10px', marginBottom:'10px'}}>
              <button type="button" onClick={() => setGiraForm({...giraForm, equipo: 'RDM'})} style={{...btnStyle, flex:1, background: giraForm.equipo === 'RDM' ? '#3b82f6' : '#222'}}>RDM</button>
              <button type="button" onClick={() => setGiraForm({...giraForm, equipo: 'LDS'})} style={{...btnStyle, flex:1, background: giraForm.equipo === 'LDS' ? '#ef4444' : '#222'}}>LDS</button>
            </div>
            
            <label style={{fontSize:'0.7rem', color:'#888'}}>Jugador Propio</label>
            <select style={inputStyle} value={giraForm.jugador1} onChange={e => setGiraForm({...giraForm, jugador1: e.target.value})} required>
              <option value="">Elegir...</option>
              {players.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
            </select>

            <label style={{fontSize:'0.7rem', color:'#888'}}>Rival</label>
            <select style={inputStyle} value={giraForm.rival} onChange={e => setGiraForm({...giraForm, rival: e.target.value})} required>
              <option value="">Elegir...</option>
              {players.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
            </select>
            
            <div style={{display:'flex', gap:'5px', marginTop:'10px'}}>
              {[1, 0.5, 0].map(v => (
                <button type="button" key={v} onClick={() => setGiraForm({...giraForm, puntos: v})} style={{...btnStyle, flex:1, background: giraForm.puntos === v ? '#1b331b' : '#111'}}>+{v} Pts</button>
              ))}
            </div>
            <button type="submit" style={{...btnStyle, width:'100%', marginTop:'20px', background:'#2d4a2d'}}>Guardar Resultado</button>
          </form>

          <div style={{marginTop:'20px'}}>
            {giraMatches.map(m => (
              <div key={m.id} style={{display:'flex', justifyContent:'space-between', padding:'12px', borderBottom:'1px solid #222', alignItems:'center'}}>
                <span style={{fontSize:'0.85rem'}}><strong style={{color: m.equipo === 'RDM' ? '#3b82f6' : '#ef4444'}}>{m.equipo}</strong>: {m.jugador1} vs {m.rival}</span>
                <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                  <span style={{fontWeight:'bold'}}>+{m.puntos}</span>
                  <button onClick={() => { if(checkAdmin()) deleteDoc(doc(db, "gira", m.id)); }} style={{color:'maroon', border:'none', background:'none', cursor:'pointer'}}>×</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === "card" && (
        <form style={{background:'#080808', padding:'15px', borderRadius:'15px'}} onSubmit={async (e) => {
          e.preventDefault();
          const totalG = card.grossHoles.reduce((a, b) => a + (parseInt(b) || 0), 0);
          await addDoc(collection(db, "scores"), { ...card, totalGross: totalG, createdAt: serverTimestamp() });
          alert("Tarjeta cargada con éxito!");
          setView("ranking");
        }}>
          <h2 style={{textAlign:'center', fontSize:'1rem', color:'#88a688'}}>NUEVA TARJETA</h2>
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
              <input key={i} type="number" placeholder={i+1} style={{...inputStyle, padding:'8px', textAlign:'center', margin:0, fontSize:'0.8rem'}} 
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
          <button type="submit" style={{...btnStyle, width:'100%', marginTop:'20px', background:'#2d4a2d', padding:'15px', fontSize:'0.9rem'}}>SUBIR TARJETA</button>
        </form>
      )}
    </div>
  );
}
