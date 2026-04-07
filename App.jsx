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
const PTS_TABLE = [10, 8, 6, 5, 4, 3];

export default function App() {
  const [view, setView] = useState("ranking");
  const [players, setPlayers] = useState([]);
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [isEditing, setIsEditing] = useState(null);

  const [card, setCard] = useState({ playerId: "", date: "", course: "Hacoaj", hcp: 0, grossHoles: Array(18).fill(0), longDrive: false, bestApproach: false });

  useEffect(() => {
    onSnapshot(query(collection(db, "players"), orderBy("name")), (s) => { setPlayers(s.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); });
    onSnapshot(query(collection(db, "scores"), orderBy("date", "asc")), (s) => setScores(s.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, []);

  const checkAdmin = () => prompt("PIN de Administrador:") === "6677";

  const getMonthlySelectedIds = () => {
    const selectedIds = [];
    const monthlyBest = {}; 
    scores.forEach(s => {
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

  // --- LÓGICA DE DATOS PARA EL GRÁFICO ---
  const getChartData = (playerId) => {
    const playerScores = scores.filter(s => s.playerId === playerId);
    
    return playerScores.map(s => {
      // Calculamos el promedio de TODOS los jugadores en esa misma fecha
      const scoresSameDay = scores.filter(allS => allS.date === s.date);
      const sumNet = scoresSameDay.reduce((acc, curr) => acc + (parseInt(curr.totalGross) - parseInt(curr.hcp)), 0);
      const avgNet = scoresSameDay.length > 0 ? (sumNet / scoresSameDay.length).toFixed(1) : 0;

      return {
        fecha: s.date.split("-").reverse().slice(0,2).join("/"),
        Mi_Neto: parseInt(s.totalGross) - parseInt(s.hcp),
        Mi_Hdc: parseInt(s.hcp),
        Promedio_Grupo: parseFloat(avgNet)
      };
    });
  };

  const btnStyle = { background: '#1b331b', color: '#e0e0e0', border: '1px solid #2d4a2d', padding: '10px', borderRadius: '12px', fontSize: '0.75rem', cursor: 'pointer' };
  const inputStyle = { width: '100%', padding: '12px', margin: '5px 0', background: '#111', border: '1px solid #333', color: 'white', borderRadius: '8px', boxSizing: 'border-box' };

  if (loading) return <div style={{background:'#000', color:'white', height:'100vh', display:'flex', justifyContent:'center', alignItems:'center'}}>Copa Maci...</div>;

  return (
    <div style={{ background: '#000', color: 'white', minHeight: '100vh', padding: '15px', fontFamily: 'sans-serif' }}>
      
      {selectedPlayer && (
        <div style={{position:'fixed', top:0, left:0, width:'100%', height:'100%', background:'#000', padding:'20px', boxSizing:'border-box', overflowY:'auto', zIndex: 100}}>
          <button onClick={() => setSelectedPlayer(null)} style={{...btnStyle, marginBottom:'20px'}}>✕ Cerrar</button>
          <h2 style={{color:'#bbf7bb', margin:0}}>{selectedPlayer.name}</h2>
          
          <div style={{height: 280, width: '100%', marginTop: '20px', background: '#080808', padding: '10px', borderRadius: '15px', border: '1px solid #1b331b'}}>
            <ResponsiveContainer>
              <LineChart data={getChartData(selectedPlayer.id)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis dataKey="fecha" stroke="#666" fontSize={10} />
                <YAxis stroke="#666" fontSize={10} domain={['dataMin - 5', 'dataMax + 5']} />
                <Tooltip contentStyle={{background: '#111', border: '1px solid #333', fontSize: '12px'}} />
                <Legend wrapperStyle={{fontSize: '10px', paddingTop: '10px'}} />
                <Line name="Mi Neto" type="monotone" dataKey="Mi_Neto" stroke="#bbf7bb" strokeWidth={3} dot={{r: 4}} />
                <Line name="Mi Hdc" type="monotone" dataKey="Mi_Hdc" stroke="#ca8a04" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                <Line name="Prom. Grupo" type="monotone" dataKey="Promedio_Grupo" stroke="#ffffff" strokeWidth={1} strokeDasharray="3 3" dot={false} opacity={0.6} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <h3 style={{fontSize: '0.9rem', marginTop: '30px', color: '#888', borderBottom: '1px solid #222', paddingBottom: '5px'}}>HISTORIAL DE TARJETAS</h3>
          {scores.filter(s => s.playerId === selectedPlayer.id).reverse().map(s => (
            <div key={s.id} style={{padding: '15px 0', borderBottom: '1px solid #111'}}>
              <div style={{display:'flex', justifyContent:'space-between'}}>
                <span style={{fontSize: '0.9rem'}}>{s.date} | {s.course}</span>
                <span style={{fontWeight:'bold', color: getMonthlySelectedIds().includes(s.id) ? '#ca8a04' : '#fff'}}>
                  Neto: {s.totalGross - s.hcp} {getMonthlySelectedIds().includes(s.id) && "★"}
                </span>
              </div>
              <div style={{display:'flex', gap:'15px', marginTop:'8px'}}>
                <button onClick={() => { if(checkAdmin()) { setIsEditing(s.id); setCard(s); setSelectedPlayer(null); setView("card"); } }} style={{background:'none', border:'none', color:'#ca8a04', fontSize:'0.7rem', padding:0}}>Editar</button>
                <button onClick={() => { if(checkAdmin()) { deleteDoc(doc(db, "scores", s.id)); } }} style={{background:'none', border:'none', color:'maroon', fontSize:'0.7rem', padding:0}}>Borrar</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <header style={{ textAlign: 'center', marginBottom: '20px' }}>
        <img src={logoMaci} alt="Logo" style={{ width: '80px' }} />
        <h1 style={{ fontSize: '1.2rem', margin: '10px 0' }}>COPA MACI 2026</h1>
      </header>

      <nav style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <button onClick={() => setView("ranking")} style={{...btnStyle, flex:1, background: view === "ranking" ? '#2d4a2d' : '#1b331b'}}>Ranking</button>
        <button onClick={() => { setView("card"); setIsEditing(null); setCard({ playerId: "", date: "", course: "Hacoaj", hcp: 0, grossHoles: Array(18).fill(0), longDrive: false, bestApproach: false }); }} style={{...btnStyle, flex:1, background: view === "card" ? '#2d4a2d' : '#1b331b'}}>+ Cargar</button>
      </nav>

      {view === "ranking" && (
        <div>
          {getAnnualRanking().map((p, i) => (
            <div key={p.id} style={{padding:'15px', borderBottom:'1px solid #1b331b', display:'flex', justifyContent:'space-between', alignItems:'center'}} onClick={() => setSelectedPlayer(p)}>
              <span>{i + 1}. <strong>{p.name}</strong></span>
              <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                <span style={{color:'#bbf7bb', fontWeight:'bold'}}>{p.totalPts} pts</span>
                <span style={{color:'#444'}}>⮕</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {view === "card" && (
        <form onSubmit={async (e) => {
          e.preventDefault();
          const tg = card.grossHoles.reduce((a, b) => a + (parseInt(b) || 0), 0);
          const data = { ...card, totalGross: tg, createdAt: serverTimestamp() };
          if(isEditing) await updateDoc(doc(db, "scores", isEditing), data);
          else await addDoc(collection(db, "scores"), data);
          setView("ranking");
        }}>
          <select style={inputStyle} value={card.playerId} onChange={e => setCard({...card, playerId: e.target.value})} required>
            <option value="">Jugador</option>
            {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <div style={{display:'flex', gap:'5px'}}>
            <input type="date" style={inputStyle} value={card.date} onChange={e => setCard({...card, date: e.target.value})} required />
            <input type="number" placeholder="HDC" style={inputStyle} value={card.hcp} onChange={e => setCard({...card, hcp: e.target.value})} required />
          </div>
          <p style={{fontSize:'0.7rem', color:'#888', margin:'15px 0 5px'}}>IDA (1-9)</p>
          <div style={{display:'grid', gridTemplateColumns:'repeat(9, 1fr)', gap:'3px'}}>
            {card.grossHoles.slice(0,9).map((h, i) => (
              <input key={i} type="number" value={h || ""} style={{...inputStyle, padding:'8px 2px', textAlign:'center', fontSize:'0.8rem'}} onChange={e => {
                const n = [...card.grossHoles]; n[i] = e.target.value; setCard({...card, grossHoles: n});
              }} placeholder={i+1} />
            ))}
          </div>
          <p style={{fontSize:'0.7rem', color:'#888', margin:'15px 0 5px'}}>VUELTA (10-18)</p>
          <div style={{display:'grid', gridTemplateColumns:'repeat(9, 1fr)', gap:'3px'}}>
            {card.grossHoles.slice(9,18).map((h, i) => (
              <input key={i+9} type="number" value={h || ""} style={{...inputStyle, padding:'8px 2px', textAlign:'center', fontSize:'0.8rem'}} onChange={e => {
                const n = [...card.grossHoles]; n[i+9] = e.target.value; setCard({...card, grossHoles: n});
              }} placeholder={i+10} />
            ))}
          </div>
          <button type="submit" style={{...btnStyle, width:'100%', marginTop:'25px', background:'#2d4a2d', padding:'15px', fontSize:'0.9rem'}}>
            {isEditing ? 'GUARDAR CAMBIOS' : 'SUBIR TARJETA'}
          </button>
        </form>
      )}
    </div>
  );
}
