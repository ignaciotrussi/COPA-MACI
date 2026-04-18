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

const SEED = [
  { monthKey:"2026-03", dateLabel:"8 Mar",  playerId:"p02", netScore:69, totalGross:84, hcp:15, back9:44, course:"Hacoaj", tee:"Blanco" },
  { monthKey:"2026-03", dateLabel:"8 Mar",  playerId:"p04", netScore:73, totalGross:88, hcp:15, back9:51, course:"Hacoaj", tee:"Blanco" },
  { monthKey:"2026-03", dateLabel:"8 Mar",  playerId:"p05", netScore:74, totalGross:84, hcp:10, back9:43, course:"Hacoaj", tee:"Blanco" },
  { monthKey:"2026-03", dateLabel:"8 Mar",  playerId:"p09", netScore:81, totalGross:96, hcp:15, back9:50, course:"Hacoaj", tee:"Blanco" },
  { monthKey:"2026-03", dateLabel:"15 Mar", playerId:"p09", netScore:74, totalGross:89, hcp:15, back9:null, course:"Hacoaj", tee:"Blanco" },
  { monthKey:"2026-03", dateLabel:"15 Mar", playerId:"p10", netScore:76, totalGross:91, hcp:15, back9:null, longDrive:true, course:"Hacoaj", tee:"Blanco" },
  { monthKey:"2026-03", dateLabel:"15 Mar", playerId:"p05", netScore:77, totalGross:87, hcp:10, back9:null, course:"Hacoaj", tee:"Blanco" },
  { monthKey:"2026-03", dateLabel:"15 Mar", playerId:"p08", netScore:85, totalGross:95, hcp:10, back9:null, course:"Hacoaj", tee:"Blanco" },
  { monthKey:"2026-03", dateLabel:"22 Mar", playerId:"p07", netScore:75, totalGross:85, hcp:10, back9:41, course:"Hacoaj", tee:"Blanco" },
  { monthKey:"2026-03", dateLabel:"22 Mar", playerId:"p06", netScore:75, totalGross:87, hcp:12, back9:44, course:"Hacoaj", tee:"Blanco" },
  { monthKey:"2026-03", dateLabel:"22 Mar", playerId:"p01", netScore:76, totalGross:86, hcp:10, back9:40, longDrive:true, course:"Hacoaj", tee:"Blanco" },
];

export default function App() {
  const [dbScores, setDbScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("ranking");
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [form, setForm] = useState({ playerId: "p01", dateLabel: "", netScore: "", totalGross: "", hcp: "", course: "Hacoaj" });

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

  const handleSave = async () => {
    if(!form.dateLabel || !form.netScore) return alert("Completa fecha y score");
    await fetch(`${API_URL}/scores`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    window.location.reload();
  };

  const getChartData = (pid) => {
    return allScores.filter(s => s.playerId === pid).map(s => ({
      fecha: s.dateLabel,
      Neto: parseInt(s.netScore),
      Hdc: parseInt(s.hcp || 0)
    }));
  };

  const navBtn = (v, txt) => (
    <button onClick={() => setView(v)} style={{
      flex:1, padding:'10px 5px', fontSize:'0.7rem', fontWeight:'bold',
      background: view === v ? '#fff' : '#111', color: view === v ? '#000' : '#fff',
      border:'1px solid #333', borderRadius:'8px', cursor:'pointer'
    }}>{txt}</button>
  );

  if (loading) return <div style={{background:'#0a1a0a', color:'white', height:'100vh', display:'flex', justifyContent:'center', alignItems:'center'}}>Copa Maci...</div>;

  return (
    <div style={{ background: '#000', color: 'white', minHeight: '100vh', padding: '15px', fontFamily: 'sans-serif' }}>
      
      {/* CABECERA */}
      <div style={{textAlign:'center', marginBottom:'20px'}}>
        <h1 style={{fontSize:'1.2rem', margin:0}}>COPA MACI 2026</h1>
      </div>

      {/* BOTONERA NAVEGACIÓN */}
      <div style={{display:'flex', gap:'5px', marginBottom:'20px'}}>
        {navBtn("ranking", "RANKING")}
        {navBtn("gross", "GROSS")}
        {navBtn("giras", "GIRAS")}
        {navBtn("cargar", "CARGAR")}
      </div>

      {/* VISTA RANKING */}
      {view === "ranking" && (
        <div>
          {PLAYERS.map(p => {
            const pScores = allScores.filter(s => s.playerId === p.id);
            const totalPts = pScores.length * 2; // Ejemplo simple de puntos
            return (
              <div key={p.id} onClick={() => setSelectedPlayer(p)} style={{
                padding:'15px', background:'#0a1a0a', border:'1px solid #1b331b', 
                borderRadius:'12px', marginBottom:'10px', display:'flex', justifyContent:'space-between'
              }}>
                <span>{p.name}</span>
                <span style={{color:'#bbf7bb', fontWeight:'bold'}}>{totalPts} PTS</span>
              </div>
            );
          })}
        </div>
      )}

      {/* VISTA GROSS */}
      {view === "gross" && (
        <div>
          <h3 style={{fontSize:'0.9rem', color:'#888'}}>MEJORES SCORES GROSS</h3>
          {allScores.sort((a,b) => a.totalGross - b.totalGross).map((s, i) => (
            <div key={i} style={{padding:'10px', borderBottom:'1px solid #222', display:'flex', justifyContent:'space-between'}}>
              <span>{PLAYERS.find(p => p.id === s.playerId)?.name}</span>
              <span style={{fontWeight:'bold'}}>{s.totalGross}</span>
            </div>
          ))}
        </div>
      )}

      {/* VISTA GIRAS */}
      {view === "giras" && (
        <div style={{textAlign:'center', padding:'40px 0'}}>
          <div style={{fontSize:'2rem', fontWeight:'bold', marginBottom:'10px'}}>RDM 1.5 - 2.5 LDS</div>
          <p style={{color:'#888'}}>Próxima fecha: Los Lagartos</p>
        </div>
      )}

      {/* VISTA CARGAR */}
      {view === "cargar" && (
        <div style={{background:'#0a1a0a', padding:'20px', borderRadius:'15px', border:'1px solid #1b331b'}}>
          <select onChange={e=>setForm({...form, playerId: e.target.value})} style={{width:'100%', padding:'12px', marginBottom:'10px', background:'#000', color:'#fff'}}>
            {PLAYERS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <input type="text" placeholder="Fecha (Ej: 12 Abr)" onChange={e=>setForm({...form, dateLabel: e.target.value})} style={{width:'100%', padding:'12px', marginBottom:'10px', background:'#000', color:'#fff', boxSizing:'border-box'}} />
          <input type="number" placeholder="Golpes Netos" onChange={e=>setForm({...form, netScore: e.target.value})} style={{width:'100%', padding:'12px', marginBottom:'10px', background:'#000', color:'#fff', boxSizing:'border-box'}} />
          <input type="number" placeholder="Golpes Gross" onChange={e=>setForm({...form, totalGross: e.target.value})} style={{width:'100%', padding:'12px', marginBottom:'10px', background:'#000', color:'#fff', boxSizing:'border-box'}} />
          <button onClick={handleSave} style={{width:'100%', padding:'15px', background:'#bbf7bb', color:'#000', fontWeight:'bold', border:'none', borderRadius:'10px'}}>FINALIZAR TARJETA</button>
        </div>
      )}

      {/* MODAL DE DETALLE JUGADOR */}
      {selectedPlayer && (
        <div style={{position:'fixed', top:0, left:0, width:'100%', height:'100%', background:'#000', padding:'20px', boxSizing:'border-box', overflowY:'auto'}}>
          <button onClick={() => setSelectedPlayer(null)} style={{padding:'10px', marginBottom:'20px'}}>✕ CERRAR</button>
          <h2 style={{color:'#bbf7bb'}}>{selectedPlayer.name}</h2>
          
          <div style={{height:200, width:'100%', background:'#080808', borderRadius:'15px', padding:'10px', boxSizing:'border-box'}}>
            <ResponsiveContainer>
              <LineChart data={getChartData(selectedPlayer.id)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis dataKey="fecha" stroke="#666" fontSize={10} />
                <YAxis stroke="#666" fontSize={10} />
                <Tooltip contentStyle={{background:'#111', border:'none'}} />
                <Line type="monotone" dataKey="Neto" stroke="#bbf7bb" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <h3 style={{fontSize:'0.8rem', color:'#888', marginTop:'30px'}}>HISTORIAL</h3>
          {allScores.filter(s => s.playerId === selectedPlayer.id).map((s, i) => (
            <div key={i} style={{padding:'10px', borderBottom:'1px solid #1b331b', display:'flex', justifyContent:'space-between', fontSize:'0.9rem'}}>
              <span>{s.dateLabel} - {s.course}</span>
              <span>{s.netScore} Netos ({s.totalGross} Gross)</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
