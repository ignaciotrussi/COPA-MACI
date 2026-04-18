import React, { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

// URL del servidor que conectaremos a tu MySQL (Render)
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
  
  const [card, setCard] = useState({ playerId: "", date: "", course: "Hacoaj", hcp: 0, grossHoles: Array(18).fill(0), longDrive: false, bestApproach: false });

  // --- CARGA DE DATOS DESDE MYSQL (REEMPLAZA ONSNAPSHOT) ---
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
      } catch (err) {
        console.error("Error cargando MySQL:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSaveScore = async () => {
    const totalG = card.grossHoles.reduce((a, b) => a + (parseInt(b) || 0), 0);
    const newEntry = { ...card, totalGross: totalG };

    const res = await fetch(`${API_URL}/scores`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newEntry)
    });

    if(res.ok) window.location.reload();
  };

  // --- TU LÓGICA ORIGINAL DE PUNTOS Y RANKINGS (INTACTA) ---
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

  // --- DISEÑO Y NAVEGACIÓN ---
  const btnStyle = { background: '#1b331b', color: '#e0e0e0', border: '1px solid #2d4a2d', padding: '10px', borderRadius: '12px', fontSize: '0.7rem', cursor: 'pointer', flex:1 };

  if (loading) return <div style={{background:'#000', color:'white', height:'100vh', display:'flex', justifyContent:'center', alignItems:'center'}}>Copa Maci...</div>;

  return (
    <div style={{ background: '#000', color: 'white', minHeight: '100vh', padding: '15px', fontFamily: 'sans-serif' }}>
      
      {/* MENU DE NAVEGACIÓN */}
      <div style={{display:'flex', gap:'5px', marginBottom:'20px'}}>
        <button onClick={() => setView("ranking")} style={btnStyle}>RANKING</button>
        <button onClick={() => setView("gross")} style={btnStyle}>GROSS</button>
        <button onClick={() => setView("giras")} style={btnStyle}>GIRAS</button>
        <button onClick={() => setView("cargar")} style={btnStyle}>CARGAR</button>
      </div>

      {/* VISTA RANKING ANUAL */}
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

      {/* VISTA GROSS (MEJORES TARJETAS) */}
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

      {/* VISTA GIRAS (RYDER) */}
      {view === "giras" && (
        <div style={{textAlign:'center', padding:'20px'}}>
           <h2>RYDER CUP MACI</h2>
           <div style={{fontSize:'2rem', margin:'20px 0'}}>RDM 0 - 0 LDS</div>
        </div>
      )}

      {/* VISTA CARGAR (FORMULARIO) */}
      {view === "cargar" && (
        <div style={{background:'#0a1a0a', padding:'20px', borderRadius:'15px', border:'1px solid #1b331b'}}>
           <select onChange={e=>setCard({...card, playerId: e.target.value})} style={{width:'100%', padding:'10px', marginBottom:'10px'}}>
             <option value="">Seleccionar Jugador</option>
             {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
           </select>
           <input type="date" onChange={e=>setCard({...card, date: e.target.value})} style={{width:'100%', padding:'10px', marginBottom:'10px'}} />
           <button onClick={handleSaveScore} style={{width:'100%', padding:'15px', background:'#bbf7bb', color:'#000', fontWeight:'bold', border:'none', borderRadius:'10px'}}>FINALIZAR TARJETA</button>
        </div>
      )}

      {/* VISOR DE PERFIL SELECCIONADO */}
      {selectedPlayer && (
        <div style={{position:'fixed', top:0, left:0, width:'100%', height:'100%', background:'#000', padding:'20px', boxSizing:'border-box', overflowY:'auto', zIndex: 100}}>
          <button onClick={() => setSelectedPlayer(null)} style={{...btnStyle, flex:'none', marginBottom:'20px'}}>✕ Cerrar Perfil</button>
          <h2 style={{color:'#bbf7bb'}}>{selectedPlayer.name}</h2>
          <div style={{height: 250, width: '100%', background: '#080808', padding: '10px', borderRadius: '15px', border: '1px solid #1b331b', marginTop:'15px'}}>
            <ResponsiveContainer>
              <LineChart data={getChartData(selectedPlayer.id)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis dataKey="fecha" stroke="#666" fontSize={10} />
                <YAxis stroke="#666" fontSize={10} />
                <Tooltip contentStyle={{background: '#111', border: '1px solid #333'}} />
                <Line name="Mi Neto" type="monotone" dataKey="Mi_Neto" stroke="#bbf7bb" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
