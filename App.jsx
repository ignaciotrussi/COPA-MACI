import React, { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const API_URL = "https://onrender.com"; 

const PLAYERS = [
  { id:"p01", name:"Esteban Chicco",           mat:"56229",  av:"EC" },
  { id:"p02", name:"Juan José Hardoy",         mat:"112534", av:"JH" },
  { id:"p03", name:"Manuel Gosende",           mat:"175387", av:"MG" },
  { id:"p04", name:"Rodrigo López Martínez",   mat:"132679", av:"RL" },
  { id:"p05", name:"Ignacio Trussi",           mat:"46215",  av:"IT" },
  { id:"p06", name:"Andrés Torres Carbonell",  mat:"52274",  av:"AT" },
  { id:"p07", name:"Federico Procaccini",      mat:"121277", av:"FP" },
  { id:"p08", name:"Ignacio Macías",           mat:"45585",  av:"IM" },
  { id:"p09", name:"Mariano Bustillo",         mat:"119275", av:"MB" },
  { id:"p10", name:"Carlos Segundo Morixe",    mat:"119372", av:"CM" },
  { id:"p11", name:"Francisco Goldaracena",    mat:"173455", av:"FG" },
];

const COURSES = ["Hacoaj", "Jockey Club", "Los Lagartos", "Hindú Club", "CASI", "Otro"];
const PTS_TABLE = [10, 8, 6, 5, 4, 3];

const SEED = [
  { monthKey:"2026-03", dateLabel:"8 Mar",  playerId:"p02", netScore:69, totalGross:84, hcp:15, back9:44, course:"Hacoaj" },
  { monthKey:"2026-03", dateLabel:"8 Mar",  playerId:"p04", netScore:73, totalGross:88, hcp:15, back9:51, course:"Hacoaj" },
  { monthKey:"2026-03", dateLabel:"8 Mar",  playerId:"p05", netScore:74, totalGross:84, hcp:10, back9:43, course:"Hacoaj" },
  { monthKey:"2026-03", dateLabel:"8 Mar",  playerId:"p09", netScore:81, totalGross:96, hcp:15, back9:50, course:"Hacoaj" },
  { monthKey:"2026-03", dateLabel:"15 Mar", playerId:"p09", netScore:74, totalGross:89, hcp:15, back9:45, course:"Hacoaj" },
  { monthKey:"2026-03", dateLabel:"15 Mar", playerId:"p10", netScore:76, totalGross:91, hcp:15, back9:46, longDrive:true, course:"Hacoaj" },
  { monthKey:"2026-03", dateLabel:"15 Mar", playerId:"p05", netScore:77, totalGross:87, hcp:10, back9:43, course:"Hacoaj" },
  { monthKey:"2026-03", dateLabel:"15 Mar", playerId:"p08", netScore:85, totalGross:95, hcp:10, back9:48, course:"Hacoaj" },
  { monthKey:"2026-03", dateLabel:"22 Mar", playerId:"p07", netScore:75, totalGross:85, hcp:10, back9:41, course:"Hacoaj" },
  { monthKey:"2026-03", dateLabel:"22 Mar", playerId:"p06", netScore:75, totalGross:87, hcp:12, back9:44, course:"Hacoaj" },
  { monthKey:"2026-03", dateLabel:"22 Mar", playerId:"p01", netScore:76, totalGross:86, hcp:10, back9:40, longDrive:true, course:"Hacoaj" },
];

export default function App() {
  const [view, setView] = useState("ranking");
  const [dbScores, setDbScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [card, setCard] = useState({ 
    playerId: "p01", dateLabel: "", course: "Hacoaj", hcp: 0, 
    grossHoles: Array(18).fill(0), subtotalIda: 0, subtotalVuelta: 0,
    longDrive: false, bestApproach: false 
  });

  useEffect(() => {
    fetch(`${API_URL}/scores`)
      .then(res => res.json())
      .then(data => {
        setDbScores(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const allScores = [...SEED, ...dbScores];

  // --- LÓGICA DE TU APP ORIGINAL ---
  const calcIda = () => card.grossHoles.slice(0, 9).reduce((a, b) => a + (parseInt(b) || 0), 0) || (parseInt(card.subtotalIda) || 0);
  const calcVuelta = () => card.grossHoles.slice(9, 18).reduce((a, b) => a + (parseInt(b) || 0), 0) || (parseInt(card.subtotalVuelta) || 0);
  
  const handleSave = async () => {
    const totalG = calcIda() + calcVuelta();
    const net = totalG - (parseInt(card.hcp) || 0);
    const dateParts = card.dateLabel.split(" ");
    const monthKey = `2026-${dateParts[1] === "Abr" ? "04" : "03"}`;

    const newScore = {
      ...card,
      totalGross: totalG,
      netScore: net,
      back9: calcVuelta(),
      monthKey: monthKey
    };

    await fetch(`${API_URL}/scores`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newScore)
    });
    window.location.reload();
  };

  const getAnnualRanking = () => {
    const stats = {};
    PLAYERS.forEach(p => { stats[p.id] = { ...p, totalPts: 0, played: 0 }; });
    
    // Agrupar por mes para aplicar tu tabla de puntos
    const byMonth = {};
    allScores.forEach(s => {
      if(!byMonth[s.monthKey]) byMonth[s.monthKey] = [];
      byMonth[s.monthKey].push(s);
    });

    Object.values(byMonth).forEach(monthGroup => {
      const ranked = monthGroup.sort((a,b) => a.netScore - b.netScore || (a.back9 || 999) - (b.back9 || 999));
      ranked.forEach((s, idx) => {
        if(stats[s.playerId]) {
          stats[s.playerId].totalPts += idx < 6 ? PTS_TABLE[idx] : 2;
          if (s.longDrive) stats[s.playerId].totalPts += 1;
          if (s.bestApproach) stats[s.playerId].totalPts += 1;
          stats[s.playerId].played += 1;
        }
      });
    });
    return Object.values(stats).sort((a,b) => b.totalPts - a.totalPts);
  };

  const navBtn = (v, txt) => (
    <button onClick={() => setView(v)} style={{
      flex:1, padding:'10px 2px', fontSize:'0.65rem', fontWeight:'bold',
      background: view === v ? '#fff' : '#111', color: view === v ? '#000' : '#fff',
      border:'1px solid #333', borderRadius:'8px'
    }}>{txt}</button>
  );

  if (loading) return <div style={{background:'#000', color:'#fff', height:'100vh', display:'flex', justifyContent:'center', alignItems:'center'}}>Copa Maci...</div>;

  return (
    <div style={{ background: '#000', color: '#fff', minHeight: '100vh', padding: '15px', fontFamily: 'sans-serif' }}>
      
      <div style={{textAlign:'center', marginBottom:'20px'}}>
        <h1 style={{fontSize:'1.1rem'}}>COPA MACI 2026</h1>
      </div>

      <div style={{display:'flex', gap:'4px', marginBottom:'20px'}}>
        {navBtn("ranking", "RANKING")}
        {navBtn("gross", "GROSS")}
        {navBtn("giras", "GIRAS")}
        {navBtn("cargar", "CARGAR")}
      </div>

      {view === "ranking" && (
        <div>
          {getAnnualRanking().map((p, i) => (
            <div key={p.id} onClick={() => setSelectedPlayer(p)} style={{
              padding:'12px', background:'#0a1a0a', border:'1px solid #1b331b', 
              borderRadius:'10px', marginBottom:'8px', display:'flex', justifyContent:'space-between', alignItems:'center'
            }}>
              <span style={{fontSize:'0.9rem'}}>{i+1}. {p.name}</span>
              <span style={{color:'#bbf7bb', fontWeight:'bold'}}>{p.totalPts} <small style={{fontSize:'0.6rem', color:'#666'}}>PTS</small></span>
            </div>
          ))}
        </div>
      )}

      {view === "gross" && (
        <div>
          {allScores.sort((a,b) => a.totalGross - b.totalGross).map((s, i) => (
            <div key={i} style={{padding:'10px', borderBottom:'1px solid #222', display:'flex', justifyContent:'space-between'}}>
              <span style={{fontSize:'0.8rem'}}>{PLAYERS.find(p => p.id === s.playerId)?.name}</span>
              <span style={{fontWeight:'bold'}}>{s.totalGross}</span>
            </div>
          ))}
        </div>
      )}

      {view === "giras" && (
        <div style={{textAlign:'center', padding:'40px 0'}}>
          <div style={{fontSize:'1.5rem', fontWeight:'bold'}}>RDM 1.5 - 2.5 LDS</div>
          <p style={{color:'#888', fontSize:'0.8rem'}}> Ryder Cup Maci </p>
        </div>
      )}

      {view === "cargar" && (
        <div style={{background:'#0a1a0a', padding:'15px', borderRadius:'12px', border:'1px solid #1b331b'}}>
          <select value={card.playerId} onChange={e=>setCard({...card, playerId: e.target.value})} style={{width:'100%', padding:'10px', marginBottom:'10px', background:'#000', color:'#fff'}}>
            {PLAYERS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <input type="text" placeholder="Fecha (Ej: 12 Abr)" value={card.dateLabel} onChange={e=>setCard({...card, dateLabel: e.target.value})} style={{width:'100%', padding:'10px', marginBottom:'10px', background:'#000', color:'#fff', boxSizing:'border-box'}} />
          <input type="number" placeholder="Hándicap" onChange={e=>setCard({...card, hcp: e.target.value})} style={{width:'100%', padding:'10px', marginBottom:'10px', background:'#000', color:'#fff', boxSizing:'border-box'}} />
          
          <div style={{display:'flex', gap:'10px', marginBottom:'10px'}}>
             <input type="number" placeholder="Ida" onChange={e=>setCard({...card, subtotalIda: e.target.value})} style={{flex:1, padding:'10px', background:'#000', color:'#fff'}} />
             <input type="number" placeholder="Vuelta" onChange={e=>setCard({...card, subtotalVuelta: e.target.value})} style={{flex:1, padding:'10px', background:'#000', color:'#fff'}} />
          </div>

          <button onClick={handleSave} style={{width:'100%', padding:'15px', background:'#bbf7bb', color:'#000', fontWeight:'bold', border:'none', borderRadius:'8px'}}>FINALIZAR TARJETA</button>
        </div>
      )}

      {selectedPlayer && (
        <div style={{position:'fixed', top:0, left:0, width:'100%', height:'100%', background:'#000', padding:'20px', boxSizing:'border-box', overflowY:'auto', zIndex:100}}>
          <button onClick={() => setSelectedPlayer(null)} style={{padding:'8px 15px', marginBottom:'15px', background:'#333', color:'#fff', border:'none', borderRadius:'5px'}}>✕ VOLVER</button>
          <h2 style={{color:'#bbf7bb', fontSize:'1.2rem'}}>{selectedPlayer.name}</h2>
          
          <div style={{height:180, width:'100%', background:'#080808', borderRadius:'10px', padding:'5px', marginTop:'10px'}}>
            <ResponsiveContainer>
              <LineChart data={allScores.filter(s => s.playerId === selectedPlayer.id)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis dataKey="dateLabel" stroke="#666" fontSize={9} />
                <YAxis stroke="#666" fontSize={9} />
                <Tooltip contentStyle={{background:'#111', border:'none'}} />
                <Line type="monotone" dataKey="netScore" stroke="#bbf7bb" strokeWidth={2} dot={{fill:'#bbf7bb'}} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <h3 style={{fontSize:'0.75rem', color:'#888', marginTop:'25px'}}>HISTORIAL DE TARJETAS</h3>
          {allScores.filter(s => s.playerId === selectedPlayer.id).reverse().map((s, i) => (
            <div key={i} style={{padding:'12px', borderBottom:'1px solid #1b331b', display:'flex', justifyContent:'space-between', fontSize:'0.85rem'}}>
              <span>{s.dateLabel} - {s.course}</span>
              <span style={{color:'#bbf7bb'}}>{s.netScore} Netos ({s.totalGross} G)</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
