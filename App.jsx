import React, { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, doc, deleteDoc, updateDoc, getDocs } from "firebase/firestore";
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
  const [card, setCard] = useState({ 
    playerId: "", date: "", course: "Hacoaj", hcp: 0, 
    grossHoles: Array(18).fill(0), subtotalIda: 0, subtotalVuelta: 0,
    longDrive: false, bestApproach: false 
  });

  useEffect(() => {
    onSnapshot(query(collection(db, "players"), orderBy("name")), (s) => { setPlayers(s.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); });
    onSnapshot(query(collection(db, "scores"), orderBy("date", "asc")), (s) => setScores(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    onSnapshot(collection(db, "gira"), (s) => setGiraMatches(s.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, []);

  const checkAdmin = () => prompt("PIN de Administrador:") === "6677";

  // Lógica de carga ágil
  const calcIda = () => {
    const suma = card.grossHoles.slice(0, 9).reduce((a, b) => a + (parseInt(b) || 0), 0);
    return suma > 0 ? suma : (parseInt(card.subtotalIda) || 0);
  };
  const calcVuelta = () => {
    const suma = card.grossHoles.slice(9, 18).reduce((a, b) => a + (parseInt(b) || 0), 0);
    return suma > 0 ? suma : (parseInt(card.subtotalVuelta) || 0);
  };
  const currentTotalGross = calcIda() + calcVuelta();
  const currentNet = currentTotalGross - (parseInt(card.hcp) || 0);

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

  const getChartData = (playerId) => {
    return scores.filter(s => s.playerId === playerId).map(s => {
      const scoresDay = scores.filter(allS => allS.date === s.date);
      const avg = scoresDay.reduce((a, b) => a + (b.totalGross - b.hcp), 0) / scoresDay.length;
      return { fecha: s.date.split("-").reverse().slice(0,2).join("/"), Mi_Neto: s.totalGross - s.hcp, Mi_Hdc: parseInt(s.hcp), Promedio: avg.toFixed(1) };
    });
  };

  const giraPuntos = giraMatches.reduce((acc, m) => { acc[m.equipo] = (acc[m.equipo] || 0) + parseFloat(m.puntos); return acc; }, { RDM: 0, LDS: 0 });

  const navBtnStyle = { background: '#fff', color: '#000', border: 'none', padding: '10px', borderRadius: '12px', fontSize: '0.7rem', cursor: 'pointer', fontWeight: 'bold', flex: 1 };
  const inputStyle = { width: '100%', padding: '12px', margin: '5px 0', background: '#111', border: '1px solid #333', color: 'white', borderRadius: '8px', boxSizing: 'border-box' };

  if (loading) return <div style={{background:'#000', color:'white', height:'100vh', display:'flex', justifyContent:'center', alignItems:'center'}}>Copa Maci...</div>;

  return (
    <div style={{ background: '#000', color: 'white', minHeight: '100vh', padding: '15px', fontFamily: 'sans-serif' }}>
      
      {/* VISOR DE PERFIL COMPLETO */}
      {selectedPlayer && (
        <div style={{position:'fixed', top:0, left:0, width:'100%', height:'100%', background:'#000', padding:'20px', boxSizing:'border-box', overflowY:'auto', zIndex: 100}}>
          <button onClick={() => setSelectedPlayer(null)} style={{...navBtnStyle, flex:'none', padding:'10px 20px', marginBottom:'20px'}}>✕ CERRAR</button>
          <h2 style={{color:'#bbf7bb'}}>{selectedPlayer.name}</h2>
          
          <div style={{height: 250, width: '100%', background: '#080808', padding: '10px', borderRadius: '15px', border: '1px solid #1b331b', marginTop:'10px'}}>
            <ResponsiveContainer>
              <LineChart data={getChartData(selectedPlayer.id)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis dataKey="fecha" stroke="#666" fontSize={10} />
                <YAxis stroke="#666" fontSize={10} />
                <Tooltip contentStyle={{background: '#111', border: '1px solid #333'}} />
                <Legend wrapperStyle={{fontSize: '10px'}} />
                <Line name="Mi Neto" type="monotone" dataKey="Mi_Neto" stroke="#bbf7bb" strokeWidth={3} />
                <Line name="Mi Hdc" type="monotone" dataKey="Mi_Hdc" stroke="#ca8a04" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                <Line name="Promedio" type="monotone" dataKey="Promedio" stroke="#fff" strokeWidth={1} strokeDasharray="3 3" opacity={0.5} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <h3 style={{fontSize:'0.9rem', marginTop:'30px', color:'#888'}}>HISTORIAL</h3>
          {scores.filter(s => s.playerId === selectedPlayer.id).reverse().map(s => (
            <div key={s.id} style={{padding: '15px', borderBottom: '1px solid #1b331b', background: getMonthlySelectedIds().includes(s.id) ? '#1b331b44' : 'transparent', marginTop:'10px', borderRadius:'8px'}}>
              <div style={{display:'flex', justifyContent:'space-between'}}>
                <span style={{fontSize:'0.8rem'}}>{s.date} | {s.course}</span>
                <span style={{fontWeight:'bold', color: getMonthlySelectedIds().includes(s.id) ? '#ca8a04' : '#fff'}}>Neto: {s.totalGross - s.hcp} {getMonthlySelectedIds().includes(s.id) && "★"}</span>
              </div>
              <div style={{display:'flex', gap:'15px', marginTop:'10px'}}>
                <button onClick={() => { if(checkAdmin()) { setIsEditing(s.id); setCard(s); setSelectedPlayer(null); setView("card"); } }} style={{background:'none', border:'none', color:'#ca8a04', fontSize:'0.7rem'}}>Editar</button>
                <button onClick={() => { if(checkAdmin()) { deleteDoc(doc(db, "scores", s.id)); } }} style={{background:'none', border:'none', color:'maroon', fontSize:'0.7rem'}}>Borrar</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <header style={{ textAlign: 'center', marginBottom: '20px' }}>
        <img src={logoMaci} alt="Logo" style={{ width: '80px' }} />
        <h1 style={{ fontSize: '1.2rem', margin: '10px 0' }}>COPA MACI 2026</h1>
      </header>

      <nav style={{ display: 'flex', gap: '5px', marginBottom: '25px' }}>
        <button onClick={() => setView("ranking")} style={navBtnStyle}>RANK</button>
        <button onClick={() => setView("gross")} style={navBtnStyle}>GROSS</button>
        <button onClick={() => setView("gira")} style={navBtnStyle}>GIRAS</button>
        <button onClick={() => { setView("card"); setIsEditing(null); setCard({ playerId: "", date: "", course: "Hacoaj", hcp: 0, grossHoles: Array(18).fill(0), subtotalIda: 0, subtotalVuelta: 0, longDrive: false, bestApproach: false }); }} style={{...navBtnStyle, background:'#fff'}}>+CARGAR</button>
      </nav>

      {view === "ranking" && (
        <div>
          {getAnnualRanking().map((p, i) => (
            <div key={p.id} style={{padding:'15px', borderBottom:'1px solid #1b331b', display:'flex', justifyContent:'space-between'}} onClick={() => setSelectedPlayer(p)}>
              <span>{i + 1}. <strong>{p.name}</strong></span>
              <span style={{color:'#bbf7bb', fontWeight:'bold'}}>{p.totalPts} pts ⮕</span>
            </div>
          ))}
          <button onClick={() => { if(checkAdmin()) { const n = prompt("Nombre:"); const m = prompt("Matrícula:"); if(n && m) addDoc(collection(db, "players"), { name: n, mat: m }); } }} style={{...navBtnStyle, margin:'20px auto', display:'block', flex:'none'}}>+ AGREGAR JUGADOR</button>
        </div>
      )}

      {view === "gross" && (
        <div>
          <h3 style={{textAlign:'center', color:'#88a688', fontSize:'0.9rem', marginBottom:'15px'}}>MEJOR GROSS HISTÓRICO</h3>
          {getGrossRanking().map((s, i) => (
            <div key={s.id} style={{padding:'15px', borderBottom:'1px solid #1b331b', display:'flex', justifyContent:'space-between'}} onClick={() => setSelectedPlayer(players.find(p => p.id === s.playerId))}>
              <span>{i+1}. {players.find(p => p.id === s.playerId)?.name}</span>
              <span style={{fontWeight:'bold'}}>{s.totalGross} G ⮕</span>
            </div>
          ))}
        </div>
      )}

      {view === "gira" && (
        <div>
          <div style={{display:'flex', justifyContent:'space-around', background:'#111', padding:'15px', borderRadius:'15px', marginBottom:'20px', border:'1px solid #2d4a2d', textAlign:'center'}}>
            <div><div style={{fontSize:'0.6rem', color:'#3b82f6'}}>RDM</div><div style={{fontSize:'1.8rem', fontWeight:'bold'}}>{giraPuntos.RDM}</div></div>
            <div style={{fontSize:'1.2rem', alignSelf:'center', color:'#555'}}>VS</div>
            <div><div style={{fontSize:'0.6rem', color:'#ef4444'}}>LDS</div><div style={{fontSize:'1.8rem', fontWeight:'bold'}}>{giraPuntos.LDS}</div></div>
          </div>
          <form style={{background:'#080808', padding:'15px', borderRadius:'15px', border:'1px solid #1b331b'}} onSubmit={async (e) => {
            e.preventDefault();
            await addDoc(collection(db, "gira"), { ...giraForm, createdAt: serverTimestamp() });
            setGiraForm({...giraForm, rival: ""});
          }}>
            <div style={{display:'flex', gap:'5px', marginBottom:'10px'}}>
              <button type="button" onClick={() => setGiraForm({...giraForm, equipo: 'RDM'})} style={{...navBtnStyle, background: giraForm.equipo === 'RDM' ? '#3b82f6' : '#222', color: '#fff'}}>RDM</button>
              <button type="button" onClick={() => setGiraForm({...giraForm, equipo: 'LDS'})} style={{...navBtnStyle, background: giraForm.equipo === 'LDS' ? '#ef4444' : '#222', color: '#fff'}}>LDS</button>
            </div>
            <select style={inputStyle} value={giraForm.modalidad} onChange={e => setGiraForm({...giraForm, modalidad: e.target.value})}>
              {MODALIDADES.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <select style={inputStyle} value={giraForm.jugador1} onChange={e => setGiraForm({...giraForm, jugador1: e.target.value})} required>
              <option value="">Mi Jugador...</option>
              {players.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
            </select>
            <select style={inputStyle} value={giraForm.rival} onChange={e => setGiraForm({...giraForm, rival: e.target.value})} required>
              <option value="">Rival...</option>
              {players.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
            </select>
            <div style={{display:'flex', gap:'5px', marginTop:'10px'}}>
              {[1, 0.5, 0].map(v => <button type="button" key={v} onClick={() => setGiraForm({...giraForm, puntos: v})} style={{...navBtnStyle, background: giraForm.puntos === v ? '#1b331b' : '#111', color:'#fff'}}>+{v}</button>)}
            </div>
            <button type="submit" style={{...navBtnStyle, width:'100%', marginTop:'20px', background:'#2d4a2d', color:'#fff'}}>GUARDAR RESULTADO</button>
          </form>
          {giraMatches.map(m => (
            <div key={m.id} style={{display:'flex', justifyContent:'space-between', padding:'12px', borderBottom:'1px solid #222', fontSize:'0.8rem'}}>
              <span><strong style={{color: m.equipo === 'RDM' ? '#3b82f6' : '#ef4444'}}>{m.equipo}</strong>: {m.jugador1} vs {m.rival}</span>
              <span>+{m.puntos} <button onClick={() => { if(checkAdmin()) deleteDoc(doc(db, "gira", m.id)); }} style={{color:'maroon', border:'none', background:'none'}}>×</button></span>
            </div>
          ))}
        </div>
      )}

      {view === "card" && (
        <form onSubmit={async (e) => {
          e.preventDefault();
          const data = { ...card, totalGross: currentTotalGross, createdAt: serverTimestamp() };
          if(isEditing) await updateDoc(doc(db, "scores", isEditing), data);
          else await addDoc(collection(db, "scores"), data);
          setView("ranking");
        }}>
          <h2 style={{textAlign:'center', fontSize:'1rem'}}>{isEditing ? 'EDITAR' : 'NUEVA'} TARJETA</h2>
          <select style={inputStyle} value={card.playerId} onChange={e => setCard({...card, playerId: e.target.value})} required>
            <option value="">Seleccionar Jugador</option>
            {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <div style={{display:'flex', gap:'5px'}}>
            <input type="date" style={inputStyle} value={card.date} onChange={e => setCard({...card, date: e.target.value})} required />
            <input type="number" placeholder="HDC" style={inputStyle} value={card.hcp} onChange={e => setCard({...card, hcp: e.target.value})} required />
          </div>
          <select style={inputStyle} value={card.course} onChange={e => setCard({...card, course: e.target.value})} required>
            {COURSES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          {/* IDA */}
          <div style={{background:'#111', padding:'10px', borderRadius:'12px', marginTop:'15px'}}>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'10px'}}>
              <span style={{fontSize:'0.7rem', color:'#888'}}>IDA (1-9)</span>
              <input type="number" placeholder="Total Ida" style={{width:'60px', background:'#222', border:'1px solid #444', color:'#fff', textAlign:'center', borderRadius:'4px'}} 
                value={calcIda()} onChange={e => setCard({...card, subtotalIda: e.target.value})} />
            </div>
            <div style={{display:'grid', gridTemplateColumns:'repeat(9, 1fr)', gap:'2px'}}>
              {card.grossHoles.slice(0,9).map((h, i) => (
                <input key={i} type="number" value={h || ""} style={{...inputStyle, padding:'8px 0', textAlign:'center', fontSize:'0.8rem'}} onChange={e => {
                  const n = [...card.grossHoles]; n[i] = e.target.value; setCard({...card, grossHoles: n});
                }} placeholder={i+1} />
              ))}
            </div>
          </div>

          {/* VUELTA */}
          <div style={{background:'#111', padding:'10px', borderRadius:'12px', marginTop:'10px'}}>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'10px'}}>
              <span style={{fontSize:'0.7rem', color:'#888'}}>VUELTA (10-18)</span>
              <input type="number" placeholder="Total Vta" style={{width:'60px', background:'#222', border:'1px solid #444', color:'#fff', textAlign:'center', borderRadius:'4px'}} 
                value={calcVuelta()} onChange={e => setCard({...card, subtotalVuelta: e.target.value})} />
            </div>
            <div style={{display:'grid', gridTemplateColumns:'repeat(9, 1fr)', gap:'2px'}}>
              {card.grossHoles.slice(9,18).map((h, i) => (
                <input key={i+9} type="number" value={h || ""} style={{...inputStyle, padding:'8px 0', textAlign:'center', fontSize:'0.8rem'}} onChange={e => {
                  const n = [...card.grossHoles]; n[i+9] = e.target.value; setCard({...card, grossHoles: n});
                }} placeholder={i+10} />
              ))}
            </div>
          </div>

          <div style={{margin:'20px 0', padding:'15px', background:'#1b331b', borderRadius:'10px', display:'flex', justifyContent:'space-around', fontWeight:'bold'}}>
            <span>GROSS: {currentTotalGross}</span>
            <span style={{color:'#bbf7bb'}}>NETO: {currentNet}</span>
          </div>

          <div style={{display:'flex', gap:'15px', marginBottom:'20px'}}>
            <label style={{fontSize:'0.7rem'}}><input type="checkbox" checked={card.longDrive} onChange={e => setCard({...card, longDrive: e.target.checked})} /> 🚀 Long Drive</label>
            <label style={{fontSize:'0.7rem'}}><input type="checkbox" checked={card.bestApproach} onChange={e => setCard({...card, bestApproach: e.target.checked})} /> 🎯 Approach</label>
          </div>

          <button type="submit" style={{...navBtnStyle, width:'100%', background:'#fff', padding:'15px', fontSize:'0.9rem'}}>GUARDAR TARJETA</button>
        </form>
      )}
    </div>
  );
}
