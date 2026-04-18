import React, { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import logoMaci from "./logo.jpg";

// URL de tu servidor en Render (reemplazar por la real cuando la tengas)
const API_URL = "https://onrender.com"; 

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
  const [card, setCard] = useState({ playerId: "", date: "", course: "Hacoaj", hcp: 0, grossHoles: Array(18).fill(0), longDrive: false, bestApproach: false });

  // ─── CARGA DE DATOS DESDE MYSQL (REEMPLAZA ONSNAPSHOT) ───
  const refreshData = async () => {
    try {
      const [resP, resS, resG] = await Promise.all([
        fetch(`${API_URL}/players`).then(r => r.json()),
        fetch(`${API_URL}/scores`).then(r => r.json()),
        fetch(`${API_URL}/gira`).then(r => r.json())
      ]);
      setPlayers(resP);
      setScores(resS);
      setGiraMatches(resG);
      setLoading(false);
    } catch (e) {
      console.error("Error al cargar datos de MySQL:", e);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const checkAdmin = () => prompt("PIN de Administrador:") === "6677";

  const getMonthlySelectedIds = () => {
    const selectedIds = [];
    const monthlyBest = {}; 
    scores.forEach(s => {
      if(!s.grossHoles) return;
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
      if(!s.grossHoles) return;
      const g = parseInt(s.totalGross) || 999;
      if (!bestByPlayer[s.playerId] || g < bestByPlayer[s.playerId].totalGross) bestByPlayer[s.playerId] = s;
    });
    return Object.values(bestByPlayer).sort((a, b) => a.totalGross - b.totalGross);
  };

  const getChartData = (playerId) => {
    const playerScores = scores.filter(s => s.playerId === playerId);
    return playerScores.map(s => {
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

  const giraPuntos = giraMatches.reduce((acc, m) => {
    acc[m.equipo] = (acc[m.equipo] || 0) + parseFloat(m.puntos);
    return acc;
  }, { RDM: 0, LDS: 0 });

  // ─── FUNCIONES DE GUARDADO (MySQL) ───
  const handleAddScore = async () => {
    const totalG = card.grossHoles.reduce((a, b) => a + (parseInt(b) || 0), 0);
    const data = { ...card, totalGross: totalG };
    const res = await fetch(`${API_URL}/scores`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if(res.ok) { alert("Tarjeta guardada!"); refreshData(); setView("ranking"); }
  };

  const handleAddGira = async () => {
    if(!checkAdmin()) return;
    const res = await fetch(`${API_URL}/gira`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(giraForm)
    });
    if(res.ok) { alert("Match guardado!"); refreshData(); }
  };

  const btnStyle = { background: '#1b331b', color: '#e0e0e0', border: '1px solid #2d4a2d', padding: '10px', borderRadius: '12px', fontSize: '0.7rem', cursor: 'pointer', flex: 1 };
  const inputStyle = { width: '100%', padding: '12px', margin: '5px 0', background: '#111', border: '1px solid #333', color: 'white', borderRadius: '8px', boxSizing: 'border-box' };

  if (loading) return <div style={{background:'#000', color:'white', height:'100vh', display:'flex', justifyContent:'center', alignItems:'center'}}>Cargando Copa Maci...</div>;

  return (
    <div style={{ background: '#000', color: 'white', minHeight: '100vh', padding: '15px', fontFamily: 'sans-serif' }}>
      
      <div style={{textAlign:'center', marginBottom:'15px'}}>
        <img src={logoMaci} alt="Logo" style={{width:'80px', borderRadius:'50%'}} />
      </div>

      <div style={{display:'flex', gap:'5px', marginBottom:'20px'}}>
        <button onClick={() => setView("ranking")} style={{...btnStyle, background: view === "ranking" ? "#2d4a2d" : "#1b331b"}}>RANKING</button>
        <button onClick={() => setView("gross")} style={{...btnStyle, background: view === "gross" ? "#2d4a2d" : "#1b331b"}}>GROSS</button>
        <button onClick={() => setView("giras")} style={{...btnStyle, background: view === "giras" ? "#2d4a2d" : "#1b331b"}}>GIRAS</button>
        <button onClick={() => setView("cargar")} style={{...btnStyle, background: view === "cargar" ? "#2d4a2d" : "#1b331b"}}>CARGAR</button>
      </div>

      {/* VISTA RANKING ANUAL */}
      {view === "ranking" && (
        <div>
          {getAnnualRanking().map((p, i) => (
            <div key={p.id} onClick={() => setSelectedPlayer(p)} style={{padding:'15px', background:'#0a1a0a', border:'1px solid #1b331b', borderRadius:'12px', marginBottom:'10px', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
              <span style={{fontSize:'0.9rem'}}>{i+1}. {p.name}</span>
              <span style={{color:'#bbf7bb', fontWeight:'bold'}}>{p.totalPts} PTS</span>
            </div>
          ))}
        </div>
      )}

      {/* VISTA GROSS */}
      {view === "gross" && (
        <div>
          {getGrossRanking().map((s, i) => (
            <div key={i} onClick={() => setSelectedPlayer(players.find(p => p.id === s.playerId))} style={{padding:'15px', borderBottom:'1px solid #222', display:'flex', justifyContent:'space-between'}}>
              <span style={{fontSize:'0.85rem'}}>{players.find(p => p.id === s.playerId)?.name}</span>
              <span style={{fontWeight:'bold'}}>{s.totalGross} GOLPES</span>
            </div>
          ))}
        </div>
      )}

      {/* VISTA GIRAS */}
      {view === "giras" && (
        <div style={{textAlign:'center'}}>
          <div style={{fontSize:'2.5rem', margin:'30px 0', fontWeight:'bold'}}>RDM {giraPuntos.RDM} - {giraPuntos.LDS} LDS</div>
          <p style={{color:'#888', marginBottom:'20px'}}>Ryder Cup Copa Maci</p>
          <button onClick={() => { if(checkAdmin()) setView("adminGira"); }} style={btnStyle}>Cargar Match (Admin)</button>
        </div>
      )}

      {view === "adminGira" && (
        <div style={{background:'#111', padding:'20px', borderRadius:'15px'}}>
          <select onChange={e=>setGiraForm({...giraForm, equipo:e.target.value})} style={inputStyle}>
            <option value="RDM">RDM</option>
            <option value="LDS">LDS</option>
          </select>
          <input placeholder="Jugador" onChange={e=>setGiraForm({...giraForm, jugador1:e.target.value})} style={inputStyle}/>
          <input placeholder="Rival" onChange={e=>setGiraForm({...giraForm, rival:e.target.value})} style={inputStyle}/>
          <input type="number" step="0.5" placeholder="Puntos (1, 0.5, 0)" onChange={e=>setGiraForm({...giraForm, puntos:e.target.value})} style={inputStyle}/>
          <button onClick={handleAddGira} style={{...btnStyle, width:'100%', marginTop:'10px', background:'#bbf7bb', color:'#000'}}>GUARDAR MATCH</button>
        </div>
      )}

      {/* VISTA CARGAR */}
      {view === "cargar" && (
        <div style={{background:'#0a1a0a', padding:'20px', borderRadius:'15px', border:'1px solid #1b331b'}}>
          <select onChange={e=>setCard({...card, playerId:e.target.value})} style={inputStyle}>
            <option value="">Seleccionar Jugador...</option>
            {players.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <input type="date" onChange={e=>setCard({...card, date:e.target.value})} style={inputStyle}/>
          <input type="number" placeholder="Hándicap" onChange={e=>setCard({...card, hcp:e.target.value})} style={inputStyle}/>
          <div style={{display:'grid', gridTemplateColumns:'repeat(6, 1fr)', gap:'5px', marginTop:'15px'}}>
            {card.grossHoles.map((h,i)=>(
              <input key={i} type="number" placeholder={i+1} onChange={e=>{
                const newHoles = [...card.grossHoles];
                newHoles[i] = e.target.value;
                setCard({...card, grossHoles:newHoles});
              }} style={{width:'100%', padding:'8px', textAlign:'center', background:'#000', color:'#fff', border:'1px solid #333'}}/>
            ))}
          </div>
          <div style={{margin:'20px 0', display:'flex', gap:'20px'}}>
            <label><input type="checkbox" onChange={e=>setCard({...card, longDrive:e.target.checked})}/> Long Drive</label>
            <label><input type="checkbox" onChange={e=>setCard({...card, bestApproach:e.target.checked})}/> Best Approach</label>
          </div>
          <button onClick={handleAddScore} style={{...btnStyle, width:'100%', background:'#bbf7bb', color:'#000', fontWeight:'bold'}}>FINALIZAR TARJETA</button>
        </div>
      )}

      {/* VISOR DE PERFIL */}
      {selectedPlayer && (
        <div style={{position:'fixed', top:0, left:0, width:'100%', height:'100%', background:'#000', padding:'20px', boxSizing:'border-box', overflowY:'auto', zIndex: 100}}>
          <button onClick={() => setSelectedPlayer(null)} style={{...btnStyle, flex:'none', marginBottom:'20px'}}>✕ Cerrar Perfil</button>
          <h2 style={{color:'#bbf7bb', margin:0}}>{selectedPlayer.name}</h2>
          
          <div style={{height: 250, width: '100%', background: '#080808', padding: '10px', borderRadius: '15px', border: '1px solid #1b331b', marginTop:'15px'}}>
            <ResponsiveContainer>
              <LineChart data={getChartData(selectedPlayer.id)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis dataKey="fecha" stroke="#666" fontSize={10} />
                <YAxis stroke="#666" fontSize={10} />
                <Tooltip contentStyle={{background: '#111', border: '1px solid #333'}} />
                <Legend wrapperStyle={{fontSize: '10px'}} />
                <Line name="Mi Neto" type="monotone" dataKey="Mi_Neto" stroke="#bbf7bb" strokeWidth={3} />
                <Line name="Mi Hdc" type="monotone" dataKey="Mi_Hdc" stroke="#ca8a04" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                <Line name="Prom. Grupo" type="monotone" dataKey="Promedio_Grupo" stroke="#fff" strokeWidth={1} strokeDasharray="3 3" opacity={0.5} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <h3 style={{fontSize:'0.9rem', marginTop:'30px', color:'#888', borderBottom:'1px solid #222', paddingBottom:'5px'}}>HISTORIAL DE TARJETAS</h3>
          {scores.filter(s => s.playerId === selectedPlayer.id).reverse().map(s => (
            <div key={s.id} style={{padding: '15px 0', borderBottom: '1px solid #1b331b', background: getMonthlySelectedIds().includes(s.id) ? '#1b331b44' : 'transparent'}}>
              <div style={{display:'flex', justifyContent:'space-between'}}>
                <span style={{fontSize:'0.85rem'}}>{s.date} | {s.course}</span>
                <span style={{fontWeight:'bold', color: getMonthlySelectedIds().includes(s.id) ? '#ca8a04' : '#fff'}}>Neto: {s.totalGross - s.hcp} {getMonthlySelectedIds().includes(s.id) && "★"}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
