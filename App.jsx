import React, { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import logoMaci from "./logo.jpg";

const API_URL = "https://onrender.com"; 

const PLAYERS = [
  { id:"p01", name:"Esteban Chicco", mat:"56229", av:"EC" },
  { id:"p02", name:"Juan José Hardoy", mat:"112534", av:"JH" },
  { id:"p03", name:"Manuel Gosende", mat:"175387", av:"MG" },
  { id:"p04", name:"Rodrigo López Martínez", mat:"132679", av:"RL" },
  { id:"p05", name:"Ignacio Trussi", mat:"46215", av:"IT" },
  { id:"p06", name:"Andrés Torres Carbonell", mat:"52274", av:"AT" },
  { id:"p07", name:"Federico Procaccini", mat:"121277", av:"FP" },
  { id:"p08", name:"Ignacio Macías", mat:"45585", av:"IM" },
  { id:"p09", name:"Mariano Bustillo", mat:"119275", av:"MB" },
  { id:"p10", name:"Carlos Segundo Morixe", mat:"119372", av:"CM" },
  { id:"p11", name:"Francisco Goldaracena", mat:"173455", av:"FG" },
];

const PTS_TABLE = [10, 8, 6, 5, 4, 3];
const COURSES = ["Hacoaj", "Jockey Club", "Los Lagartos", "Hindú Club", "CASI", "Otro"];

export default function App() {
  const [view, setView] = useState("ranking");
  const [dbScores, setDbScores] = useState([]);
  const [giraMatches, setGiraMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  
  const [card, setCard] = useState({ 
    playerId: "p01", date: "", course: "Hacoaj", hcp: 0, 
    grossHoles: Array(18).fill(0), subtotalIda: 0, subtotalVuelta: 0,
    longDrive: false, bestApproach: false 
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resS, resG] = await Promise.all([
          fetch(`${API_URL}/scores`).then(r => r.json()),
          fetch(`${API_URL}/gira`).then(r => r.json())
        ]);
        setDbScores(Array.isArray(resS) ? resS : []);
        setGiraMatches(Array.isArray(resG) ? resG : []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const calcIda = () => card.grossHoles.slice(0, 9).reduce((a, b) => a + (parseInt(b) || 0), 0) || (parseInt(card.subtotalIda) || 0);
  const calcVuelta = () => card.grossHoles.slice(9, 18).reduce((a, b) => a + (parseInt(b) || 0), 0) || (parseInt(card.subtotalVuelta) || 0);
  
  const handleSave = async () => {
    const totalG = calcIda() + calcVuelta();
    const net = totalG - (parseInt(card.hcp) || 0);
    const data = { ...card, totalGross: totalG, netScore: net, back9: calcVuelta() };

    await fetch(`${API_URL}/scores`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    window.location.reload();
  };

  const getAnnualRanking = () => {
    const stats = {};
    PLAYERS.forEach(p => { stats[p.id] = { ...p, totalPts: 0 }; });
    const byMonth = {};
    [...dbScores].forEach(s => {
      const mKey = s.date.substring(0, 7);
      if(!byMonth[mKey]) byMonth[mKey] = [];
      byMonth[mKey].push(s);
    });
    Object.values(byMonth).forEach(group => {
      group.sort((a,b) => a.netScore - b.netScore).forEach((s, idx) => {
        if(stats[s.playerId]) {
          stats[s.playerId].totalPts += idx < 6 ? PTS_TABLE[idx] : 2;
          if (s.longDrive) stats[s.playerId].totalPts += 1;
        }
      });
    });
    return Object.values(stats).sort((a,b) => b.totalPts - a.totalPts);
  };

  const navBtn = (v, t) => (
    <button onClick={() => setView(v)} style={{
      flex: 1, padding: '10px 2px', fontSize: '0.65rem', fontWeight: 'bold',
      background: view === v ? '#fff' : '#111', color: view === v ? '#000' : '#fff',
      border: '1px solid #333', borderRadius: '8px'
    }}>{t}</button>
  );

  if (loading) return <div style={{background:'#000', color:'#fff', height:'100vh', display:'flex', justifyContent:'center', alignItems:'center'}}>Copa Maci...</div>;

  return (
    <div style={{ background: '#000', color: 'white', minHeight: '100vh', padding: '15px', fontFamily: 'sans-serif' }}>
      <div style={{textAlign:'center', marginBottom:'15px'}}><img src={logoMaci} style={{width:'70px', borderRadius:'50%'}} /></div>
      
      <div style={{display:'flex', gap:'4px', marginBottom:'20px'}}>
        {navBtn("ranking", "RANKING")}
        {navBtn("gross", "GROSS")}
        {navBtn("giras", "GIRAS")}
        {navBtn("cargar", "CARGAR")}
      </div>

      {view === "ranking" && (
        <div>
          {getAnnualRanking().map((p, i) => (
            <div key={p.id} onClick={() => setSelectedPlayer(p)} style={{padding:'12px', background:'#0a1a0a', border:'1px solid #1b331b', borderRadius:'10px', marginBottom:'8px', display:'flex', justifyContent:'space-between'}}>
              <span>{i+1}. {p.name}</span>
              <span style={{color:'#bbf7bb', fontWeight:'bold'}}>{p.totalPts} PTS</span>
            </div>
          ))}
        </div>
      )}

      {view === "gross" && (
        <div>
          {dbScores.sort((a,b) => a.totalGross - b.totalGross).map((s, i) => (
            <div key={i} style={{padding:'12px', borderBottom:'1px solid #222', display:'flex', justifyContent:'space-between'}}>
              <span>{PLAYERS.find(p => p.id === s.playerId)?.name}</span>
              <span style={{fontWeight:'bold'}}>{s.totalGross} GOLPES</span>
            </div>
          ))}
        </div>
      )}

      {view === "giras" && <div style={{textAlign:'center', padding:'40px'}}><h2>RDM 1.5 - 2.5 LDS</h2><p style={{color:'#666'}}>Gira Ryder Maci</p></div>}

      {view === "cargar" && (
        <div style={{background:'#0a1a0a', padding:'15px', borderRadius:'12px', border:'1px solid #1b331b'}}>
          <select value={card.playerId} onChange={e=>setCard({...card, playerId:e.target.value})} style={{width:'100%', padding:'10px', marginBottom:'10px', background:'#000', color:'#fff'}}>
            {PLAYERS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <input type="date" onChange={e=>setCard({...card, date:e.target.value})} style={{width:'100%', padding:'10px', marginBottom:'10px', background:'#000', color:'#fff'}} />
          <input type="number" placeholder="Hándicap" onChange={e=>setCard({...card, hcp:e.target.value})} style={{width:'100%', padding:'10px', marginBottom:'10px', background:'#000', color:'#fff'}} />
          
          <div style={{display:'grid', gridTemplateColumns:'repeat(6, 1fr)', gap:'5px', marginBottom:'15px'}}>
            {card.grossHoles.map((h, i) => (
              <input key={i} type="number" placeholder={i+1} onChange={e => {
                const n = [...card.grossHoles]; n[i] = e.target.value; setCard({...card, grossHoles:n});
              }} style={{width:'100%', padding:'8px', textAlign:'center', background:'#111', color:'#fff', border:'1px solid #333'}} />
            ))}
          </div>
          <button onClick={handleSave} style={{width:'100%', padding:'15px', background:'#bbf7bb', color:'#000', fontWeight:'bold', border:'none', borderRadius:'10px'}}>FINALIZAR TARJETA</button>
        </div>
      )}
    </div>
  );
}
