import React, { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import logoMaci from "./logo.jpg";

const API_URL = "https://onrender.com"; 

const PLAYERS = [
  { id:"p01", name:"Esteban Chicco", av:"EC" },
  { id:"p02", name:"Juan José Hardoy", av:"JH" },
  { id:"p03", name:"Manuel Gosende", av:"MG" },
  { id:"p04", name:"Rodrigo López Martínez", av:"RL" },
  { id:"p05", name:"Ignacio Trussi", av:"IT" },
  { id:"p06", name:"Andrés Torres Carbonell", av:"AT" },
  { id:"p07", name:"Federico Procaccini", av:"FP" },
  { id:"p08", name:"Ignacio Macías", av:"IM" },
  { id:"p09", name:"Mariano Bustillo", av:"MB" },
  { id:"p10", name:"Carlos Segundo Morixe", av:"CM" },
  { id:"p11", name:"Francisco Goldaracena", av:"FG" },
];

const PTS_TABLE = [10, 8, 6, 5, 4, 3];

const SEED = [
  { monthKey:"2026-03", date:"2026-03-08",  playerId:"p02", net:69, totalGross:84, hcp:15, course:"Hacoaj" },
  { monthKey:"2026-03", date:"2026-03-08",  playerId:"p04", net:73, totalGross:88, hcp:15, course:"Hacoaj" },
  { monthKey:"2026-03", date:"2026-03-15",  playerId:"p09", net:74, totalGross:89, hcp:15, course:"Hacoaj" },
  { monthKey:"2026-03", date:"2026-03-15",  playerId:"p10", net:76, totalGross:91, hcp:15, course:"Hacoaj", longDrive:true },
  { monthKey:"2026-03", date:"2026-03-22",  playerId:"p07", net:75, totalGross:85, hcp:10, course:"Hacoaj" },
  { monthKey:"2026-03", date:"2026-03-22",  playerId:"p01", net:76, totalGross:86, hcp:10, course:"Hacoaj", longDrive:true },
];

export default function App() {
  const [view, setView] = useState("ranking");
  const [dbScores, setDbScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [card, setCard] = useState({ playerId: "p01", date: "", hcp: 0, holes: Array(18).fill(0) });

  useEffect(() => {
    fetch(`${API_URL}/scores`)
      .then(r => r.json())
      .then(data => setDbScores(Array.isArray(data) ? data : []))
      .catch(() => setDbScores([]))
      .finally(() => setLoading(false));
  }, []);

  const allScores = [...SEED, ...dbScores];

  const getAnnualRanking = () => {
    const stats = {};
    PLAYERS.forEach(p => { stats[p.id] = { ...p, totalPts: 0 }; });
    
    const byMonth = {};
    allScores.forEach(s => {
      const mKey = s.monthKey || s.date.substring(0,7);
      if(!byMonth[mKey]) byMonth[mKey] = [];
      byMonth[mKey].push(s);
    });

    Object.values(byMonth).forEach(group => {
      group.sort((a,b) => a.net - b.net).forEach((s, idx) => {
        if(stats[s.playerId]) {
          stats[s.playerId].totalPts += idx < 6 ? PTS_TABLE[idx] : 2;
          if (s.longDrive) stats[s.playerId].totalPts += 1;
        }
      });
    });
    return Object.values(stats).sort((a,b) => b.totalPts - a.totalPts);
  };

  if (loading) return <div style={{background:'#000', color:'#fff', height:'100vh', display:'flex', justifyContent:'center', alignItems:'center'}}>Iniciando MySQL...</div>;

  return (
    <div style={{ background: '#000', color: 'white', minHeight: '100vh', padding: '15px', fontFamily: 'sans-serif' }}>
      <div style={{textAlign:'center', marginBottom:'15px'}}><img src={logoMaci} style={{width:'70px', borderRadius:'50%'}} /></div>
      
      <div style={{display:'flex', gap:'5px', marginBottom:'20px'}}>
        <button onClick={()=>setView("ranking")} style={{flex:1, padding:'10px', background:view==='ranking'?'#2d4a2d':'#111', color:'#fff', border:'1px solid #333', borderRadius:'8px'}}>RANKING</button>
        <button onClick={()=>setView("gross")} style={{flex:1, padding:'10px', background:view==='gross'?'#2d4a2d':'#111', color:'#fff', border:'1px solid #333', borderRadius:'8px'}}>GROSS</button>
        <button onClick={()=>setView("giras")} style={{flex:1, padding:'10px', background:view==='giras'?'#2d4a2d':'#111', color:'#fff', border:'1px solid #333', borderRadius:'8px'}}>GIRAS</button>
        <button onClick={()=>setView("cargar")} style={{flex:1, padding:'10px', background:view==='cargar'?'#2d4a2d':'#111', color:'#fff', border:'1px solid #333', borderRadius:'8px'}}>CARGAR</button>
      </div>

      {view === "ranking" && (
        <div>
          {getAnnualRanking().map((p, i) => (
            <div key={p.id} onClick={() => setSelectedPlayer(p)} style={{padding:'15px', background:'#0a1a0a', border:'1px solid #1b331b', borderRadius:'12px', marginBottom:'8px', display:'flex', justifyContent:'space-between'}}>
              <span>{i+1}. {p.name}</span>
              <span style={{color:'#bbf7bb', fontWeight:'bold'}}>{p.totalPts} PTS</span>
            </div>
          ))}
        </div>
      )}

      {view === "gross" && (
        <div>
          {allScores.sort((a,b) => a.totalGross - b.totalGross).map((s, i) => (
            <div key={i} style={{padding:'15px', borderBottom:'1px solid #222', display:'flex', justifyContent:'space-between'}}>
              <span>{PLAYERS.find(p => p.id === s.playerId)?.name}</span>
              <span style={{fontWeight:'bold'}}>{s.totalGross} GOLPES</span>
            </div>
          ))}
        </div>
      )}

      {view === "giras" && <div style={{textAlign:'center', padding:'40px'}}><h2>RDM 1.5 - 2.5 LDS</h2></div>}

      {view === "cargar" && (
        <div style={{background:'#0a1a0a', padding:'20px', borderRadius:'15px', border:'1px solid #1b331b'}}>
          <p style={{textAlign:'center', color:'#666'}}>Conectado a MySQL: tyt_golf</p>
          <button style={{width:'100%', padding:'15px', background:'#bbf7bb', color:'#000', fontWeight:'bold', border:'none', borderRadius:'10px'}}>ENVIAR TARJETA</button>
        </div>
      )}
    </div>
  );
}
