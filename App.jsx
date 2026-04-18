import React, { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import logoMaci from "./logo.jpg";

// URL de tu servidor en Render (debes crearla luego)
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

  const [giraForm, setGiraForm] = useState({ equipo: "RDM", jugador1: "", rival: "", puntos: 1, modalidad: "Match Play" });
  const [card, setCard] = useState({ 
    playerId: "", date: "", course: "Hacoaj", hcp: 0, 
    grossHoles: Array(18).fill(0), subtotalIda: 0, subtotalVuelta: 0,
    longDrive: false, bestApproach: false 
  });

  // --- CARGA DE DATOS DESDE TU NUEVA DB ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resP, resS, resG] = await Promise.all([
          fetch(`${API_URL}/players`).then(r => r.json()),
          fetch(`${API_URL}/scores`).then(r => r.json()),
          fetch(`${API_URL}/gira`).then(r => r.json())
        ]);
        setPlayers(resP);
        setScores(resS);
        setGiraMatches(resG);
      } catch (e) {
        console.error("Error cargando datos:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const checkAdmin = () => prompt("PIN de Administrador:") === "6677";

  // --- LÓGICA DE PUNTOS Y RANKING (TU PROGRAMACIÓN ORIGINAL) ---
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

  // --- LOGICA DE CARGA AGIL ---
  const calcIda = () => card.grossHoles.slice(0, 9).reduce((a, b) => a + (parseInt(b) || 0), 0) || (parseInt(card.subtotalIda) || 0);
  const calcVuelta = () => card.grossHoles.slice(9, 18).reduce((a, b) => a + (parseInt(b) || 0), 0) || (parseInt(card.subtotalVuelta) || 0);

  const handleSaveScore = async () => {
    const totalG = calcIda() + calcVuelta();
    const data = { ...card, totalGross: totalG };
    await fetch(`${API_URL}/scores`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    window.location.reload();
  };

  const giraPuntos = giraMatches.reduce((acc, m) => {
    acc[m.equipo] = (acc[m.equipo] || 0) + parseFloat(m.puntos);
    return acc;
  }, { RDM: 0, LDS: 0 });

  const navBtnStyle = { background: '#fff', color: '#000', border: 'none', padding: '10px', borderRadius: '12px', fontSize: '0.7rem', cursor: 'pointer', fontWeight: 'bold', flex: 1 };

  if (loading) return <div style={{background:'#000', color:'white', height:'100vh', display:'flex', justifyContent:'center', alignItems:'center'}}>Copa Maci...</div>;

  return (
    <div style={{ background: '#000', color: 'white', minHeight: '100vh', padding: '15px', fontFamily: 'sans-serif' }}>
      
      <div style={{textAlign:'center', marginBottom:'20px'}}>
        <img src={logoMaci} alt="Logo" style={{width:'80px', borderRadius:'50%'}} />
      </div>

      <div style={{display:'flex', gap:'5px', marginBottom:'20px'}}>
        <button onClick={() => setView("ranking")} style={navBtnStyle}>RANKING</button>
        <button onClick={() => setView("gross")} style={navBtnStyle}>GROSS</button>
        <button onClick={() => setView("giras")} style={navBtnStyle}>GIRAS</button>
        <button onClick={() => setView("cargar")} style={navBtnStyle}>CARGAR</button>
      </div>

      {view === "ranking" && (
        <div>
          {getAnnualRanking().map((p, i) => (
            <div key={p.id} onClick={() => setSelectedPlayer(p)} style={{padding:'15px', background:'#0a1a0a', border:'1px solid #1b331b', borderRadius:'12px', marginBottom:'10px', display:'flex', justifyContent:'space-between'}}>
              <span>{i+1}. {p.name}</span>
              <span style={{color:'#bbf7bb', fontWeight:'bold'}}>{p.totalPts} PTS</span>
            </div>
          ))}
        </div>
      )}

      {view === "gross" && (
        <div>
          {getGrossRanking().map((s, i) => (
            <div key={i} onClick={() => setSelectedPlayer(players.find(p=>p.id===s.playerId))} style={{padding:'15px', borderBottom:'1px solid #222', display:'flex', justifyContent:'space-between'}}>
              <span>{players.find(p=>p.id===s.playerId)?.name}</span>
              <span style={{fontWeight:'bold'}}>{s.totalGross} GOLPES</span>
            </div>
          ))}
        </div>
      )}

      {view === "giras" && (
        <div style={{textAlign:'center'}}>
          <div style={{fontSize:'2.5rem', margin:'20px 0'}}>RDM {giraPuntos.RDM} - {giraPuntos.LDS} LDS</div>
          <p style={{color:'#888'}}>Historial de Giras Ryder</p>
        </div>
      )}

      {view === "cargar" && (
        <div style={{background:'#0a1a0a', padding:'20px', borderRadius:'15px', border:'1px solid #1b331b'}}>
          <select onChange={e=>setCard({...card, playerId:e.target.value})} style={{width:'100%', padding:'10px', marginBottom:'10px'}}>
            <option>Jugador...</option>
            {players.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <input type="date" onChange={e=>setCard({...card, date:e.target.value})} style={{width:'100%', padding:'10px', marginBottom:'10px'}}/>
          <div style={{display:'grid', gridTemplateColumns:'repeat(6, 1fr)', gap:'5px'}}>
            {card.grossHoles.map((h,i)=>(
              <input key={i} type="number" placeholder={i+1} onChange={e=>{
                const newHoles = [...card.grossHoles];
                newHoles[i] = e.target.value;
                setCard({...card, grossHoles:newHoles});
              }} style={{width:'100%', padding:'5px', textAlign:'center', background:'#111', color:'#fff', border:'1px solid #333'}}/>
            ))}
          </div>
          <button onClick={handleSaveScore} style={{width:'100%', padding:'15px', marginTop:'20px', background:'#bbf7bb', color:'#000', fontWeight:'bold', border:'none', borderRadius:'10px'}}>FINALIZAR TARJETA</button>
        </div>
      )}

      {selectedPlayer && (
        <div style={{position:'fixed', top:0, left:0, width:'100%', height:'100%', background:'#000', padding:'20px', overflowY:'auto', zIndex:100}}>
          <button onClick={() => setSelectedPlayer(null)} style={navBtnStyle}>✕ Cerrar</button>
          <h2 style={{color:'#bbf7bb'}}>{selectedPlayer.name}</h2>
          {/* Aquí iría tu gráfico y historial con estrellas */}
        </div>
      )}
    </div>
  );
}
