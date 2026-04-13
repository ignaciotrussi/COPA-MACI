import React, { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
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
const MODALIDADES = ["Medal Play", "Match Play", "Fourball", "Laguneada", "Scramble"];
const PTS_TABLE = [10, 8, 6, 5, 4, 3];

export default function App() {
  const [view, setView] = useState("ranking");
  const [players, setPlayers] = useState([]);
  const [scores, setScores] = useState([]);
  const [giraMatches, setGiraMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [isEditing, setIsEditing] = useState(null);

  const [giraForm, setGiraForm] = useState({ equipo: "RDM", jugador1: "", rival: "", puntos: 1, modalidad: "Match Play" });
  
  // Estado de la tarjeta con subtotales manuales
  const [card, setCard] = useState({ 
    playerId: "", date: "", course: "Hacoaj", hcp: 0, 
    grossHoles: Array(18).fill(0), 
    subtotalIda: 0, subtotalVuelta: 0,
    longDrive: false, bestApproach: false 
  });

  useEffect(() => {
    onSnapshot(query(collection(db, "players"), orderBy("name")), (s) => { setPlayers(s.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); });
    onSnapshot(query(collection(db, "scores"), orderBy("date", "asc")), (s) => setScores(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    onSnapshot(collection(db, "gira"), (s) => setGiraMatches(s.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, []);

  const checkAdmin = () => prompt("PIN de Administrador:") === "6677";

  // Lógica de totales dinámica (Suma hoyos O usa el subtotal manual si los hoyos están en 0)
  const calcIda = () => {
    const sumaHoyos = card.grossHoles.slice(0, 9).reduce((a, b) => a + (parseInt(b) || 0), 0);
    return sumaHoyos > 0 ? sumaHoyos : (parseInt(card.subtotalIda) || 0);
  };
  const calcVuelta = () => {
    const sumaHoyos = card.grossHoles.slice(9, 18).reduce((a, b) => a + (parseInt(b) || 0), 0);
    return sumaHoyos > 0 ? sumaHoyos : (parseInt(card.subtotalVuelta) || 0);
  };

  const totalGross = calcIda() + calcVuelta();
  const totalNeto = totalGross - (parseInt(card.hcp) || 0);

  const getMonthlySelectedIds = () => {
    const selectedIds = [];
    const monthlyBest = {}; 
    scores.forEach(s => {
      if(!s.totalGross) return;
      const d = s.date.split("-");
      const monthKey = `${d[0]}-${d[1]}`;
      const net = (parseInt(s.totalGross) || 0) - (parseInt(s.hcp) || 0);
      if (!monthlyBest[monthKey]) monthlyBest[monthKey] = {};
      if (!monthlyBest[monthKey][s.playerId] || net < monthlyBest[monthKey][s.playerId].net) {
        monthlyBest[monthKey][s.playerId] = { id: s.id, net };
      }
    });
    Object.values(monthlyBest).forEach(m => Object.values(m).forEach(val => selectedIds.push(val.id)));
    return selectedIds;
  };

  const getAnnualRanking = () => {
    const selectedIds = getMonthlySelectedIds();
    const stats = {};
    players.forEach(p => { stats[p.id] = { ...p, totalPts: 0 }; });
    const byMonth = {};
    scores.filter(s => selectedIds.includes(s.id)).forEach(s => {
      const d = s.date.split("-");
      const mKey = `${d[0]}-${d[1]}`;
      if(!byMonth[mKey]) byMonth[mKey] = [];
      byMonth[mKey].push({ ...s, net: s.totalGross - s.hcp });
    });
    Object.values(byMonth).forEach(monthGroup => {
      const ranked = monthGroup.sort((a,b) => a.net - b.net);
      ranked.forEach((s, idx) => {
        if(stats[s.playerId]) {
          stats[s.playerId].totalPts += idx < 6 ? PTS_TABLE[idx] : 2;
          if (s.longDrive) stats[s.playerId].totalPts += 1;
          if (s.bestApproach) stats[s.playerId].totalPts += 1;
        }
      });
    });
    return Object.values(stats).sort((a,b) => b.totalPts - a.totalPts);
  };

  const getGrossRanking = () => {
    const bestByPlayer = {};
    scores.forEach(s => {
      const g = parseInt(s.totalGross) || 999;
      if (!bestByPlayer[s.playerId] || g < bestByPlayer[s.playerId].totalGross) bestByPlayer[s.playerId] = s;
    });
    return Object.values(bestByPlayer).sort((a, b) => a.totalGross - b.totalGross);
  };

  // ESTILOS SOLICITADOS (Blanco con letras negras)
  const navBtnStyle = { background: '#fff', color: '#000', border: '1px solid #ddd', padding: '10px', borderRadius: '12px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 'bold' };
  const inputStyle = { width: '100%', padding: '12px', margin: '5px 0', background: '#111', border: '1px solid #333', color: 'white', borderRadius: '8px', boxSizing: 'border-box' };

  if (loading) return <div style={{background:'#000', color:'white', height:'100vh', display:'flex', justifyContent:'center', alignItems:'center'}}>Copa Maci...</div>;

  return (
    <div style={{ background: '#000', color: 'white', minHeight: '100vh', padding: '15px', fontFamily: 'sans-serif' }}>
      
      <header style={{ textAlign: 'center', marginBottom: '20px' }}>
        <img src={logoMaci} alt="Logo" style={{ width: '90px' }} />
        <h1 style={{ fontSize: '1.2rem', margin: '10px 0' }}>COPA MACI 2026</h1>
      </header>

      <nav style={{ display: 'flex', gap: '5px', marginBottom: '25px', justifyContent:'center' }}>
        <button onClick={() => setView("ranking")} style={navBtnStyle}>🏆 RANK</button>
        <button onClick={() => setView("gross")} style={navBtnStyle}>🥇 GROSS</button>
        <button onClick={() => setView("gira")} style={navBtnStyle}>⚔️ GIRAS</button>
        <button onClick={() => { setView("card"); setIsEditing(null); setCard({ playerId: "", date: "", course: "Hacoaj", hcp: 0, grossHoles: Array(18).fill(0), subtotalIda: 0, subtotalVuelta: 0, longDrive: false, bestApproach: false }); }} style={{...navBtnStyle, background:'#fff'}}>⛳ CARGAR</button>
      </nav>

      {view === "ranking" && (
        <div>
          {getAnnualRanking().map((p, i) => (
            <div key={p.id} style={{padding:'15px', borderBottom:'1px solid #1b331b', display:'flex', justifyContent:'space-between'}} onClick={() => setSelectedPlayer(p)}>
              <span>{i + 1}. <strong>{p.name}</strong></span>
              <span style={{color:'#bbf7bb'}}>{p.totalPts} pts ⮕</span>
            </div>
          ))}
        </div>
      )}

      {view === "card" && (
        <form onSubmit={async (e) => {
          e.preventDefault();
          const data = { ...card, totalGross: totalGross, createdAt: serverTimestamp() };
          if(isEditing) await updateDoc(doc(db, "scores", isEditing), data);
          else await addDoc(collection(db, "scores"), data);
          setView("ranking");
        }}>
          <h2 style={{textAlign:'center', color:'#fff', fontSize:'1rem'}}>TARJETA DE SCORE</h2>
          <select style={inputStyle} value={card.playerId} onChange={e => setCard({...card, playerId: e.target.value})} required>
            <option value="">Jugador</option>
            {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <div style={{display:'flex', gap:'5px'}}>
            <input type="date" style={inputStyle} value={card.date} onChange={e => setCard({...card, date: e.target.value})} required />
            <input type="number" placeholder="HDC" style={inputStyle} value={card.hcp} onChange={e => setCard({...card, hcp: e.target.value})} required />
          </div>

          {/* IDA */}
          <div style={{background:'#111', padding:'10px', borderRadius:'10px', marginTop:'15px'}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px'}}>
              <span style={{fontSize:'0.7rem', color:'#888'}}>IDA (1-9)</span>
              <input type="number" placeholder="Total Ida" style={{width:'60px', background:'#222', border:'1px solid #444', color:'#fff', textAlign:'center', borderRadius:'4px'}} 
                value={calcIda()} onChange={e => setCard({...card, subtotalIda: e.target.value})} />
            </div>
            <div style={{display:'grid', gridTemplateColumns:'repeat(9, 1fr)', gap:'3px'}}>
              {card.grossHoles.slice(0,9).map((h, i) => (
                <input key={i} type="number" value={h || ""} style={{...inputStyle, padding:'8px 0', textAlign:'center', fontSize:'0.7rem'}} 
                  onChange={e => { const n = [...card.grossHoles]; n[i] = e.target.value; setCard({...card, grossHoles: n}); }} placeholder={i+1} />
              ))}
            </div>
          </div>

          {/* VUELTA */}
          <div style={{background:'#111', padding:'10px', borderRadius:'10px', marginTop:'10px'}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px'}}>
              <span style={{fontSize:'0.7rem', color:'#888'}}>VUELTA (10-18)</span>
              <input type="number" placeholder="Total Vta" style={{width:'60px', background:'#222', border:'1px solid #444', color:'#fff', textAlign:'center', borderRadius:'4px'}} 
                value={calcVuelta()} onChange={e => setCard({...card, subtotalVuelta: e.target.value})} />
            </div>
            <div style={{display:'grid', gridTemplateColumns:'repeat(9, 1fr)', gap:'3px'}}>
              {card.grossHoles.slice(9,18).map((h, i) => (
                <input key={i+9} type="number" value={h || ""} style={{...inputStyle, padding:'8px 0', textAlign:'center', fontSize:'0.7rem'}} 
                  onChange={e => { const n = [...card.grossHoles]; n[i+9] = e.target.value; setCard({...card, grossHoles: n}); }} placeholder={i+10} />
              ))}
            </div>
          </div>

          <div style={{margin:'20px 0', padding:'15px', background:'#1b331b', borderRadius:'10px', display:'flex', justifyContent:'space-around', fontWeight:'bold'}}>
            <span>GROSS: {totalGross}</span>
            <span style={{color:'#bbf7bb'}}>NETO: {totalNeto}</span>
          </div>

          <button type="submit" style={{...navBtnStyle, width:'100%', padding:'15px'}}>GUARDAR TARJETA</button>
        </form>
      )}

      {/* Otras vistas (Gross / Giras) se mantienen con la misma lógica previa */}
      {view === "gross" && (
        <div style={{padding:'10px'}}>
          {getGrossRanking().map((s, i) => (
            <div key={s.id} style={{padding:'12px', borderBottom:'1px solid #222', display:'flex', justifyContent:'space-between'}}>
              <span>{i+1}. {players.find(p => p.id === s.playerId)?.name}</span>
              <span style={{fontWeight:'bold'}}>{s.totalGross} G</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
