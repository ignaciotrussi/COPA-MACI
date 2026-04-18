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
  { monthKey:"2026-03", dateLabel:"8 Mar",  playerId:"p02", netScore:69, back9:44, course:"Hacoaj", tee:"Blanco" },
  { monthKey:"2026-03", dateLabel:"8 Mar",  playerId:"p04", netScore:73, back9:51, course:"Hacoaj", tee:"Blanco" },
  { monthKey:"2026-03", dateLabel:"8 Mar",  playerId:"p05", netScore:74, back9:43, course:"Hacoaj", tee:"Blanco" },
  { monthKey:"2026-03", dateLabel:"8 Mar",  playerId:"p09", netScore:81, back9:50, course:"Hacoaj", tee:"Blanco" },
  { monthKey:"2026-03", dateLabel:"15 Mar", playerId:"p09", netScore:74, back9:null, course:"Hacoaj", tee:"Blanco" },
  { monthKey:"2026-03", dateLabel:"15 Mar", playerId:"p10", netScore:76, back9:null, longDrive:true, course:"Hacoaj", tee:"Blanco" },
  { monthKey:"2026-03", dateLabel:"15 Mar", playerId:"p05", netScore:77, back9:null, course:"Hacoaj", tee:"Blanco" },
  { monthKey:"2026-03", dateLabel:"15 Mar", playerId:"p08", netScore:85, back9:null, course:"Hacoaj", tee:"Blanco" },
  { monthKey:"2026-03", dateLabel:"22 Mar", playerId:"p07", netScore:75, back9:41, course:"Hacoaj", tee:"Blanco" },
  { monthKey:"2026-03", dateLabel:"22 Mar", playerId:"p06", netScore:75, back9:44, course:"Hacoaj", tee:"Blanco" },
  { monthKey:"2026-03", dateLabel:"22 Mar", playerId:"p01", netScore:76, back9:40, longDrive:true, course:"Hacoaj", tee:"Blanco" },
];

export default function App() {
  const [dbScores, setDbScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("ranking");

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

  if (loading) return <div style={{background:'#0a1a0a', color:'white', height:'100vh', display:'flex', justifyContent:'center', alignItems:'center'}}>Copa Maci...</div>;

  return (
    <div style={{ background: '#0a1a0a', color: 'white', minHeight: '100vh', padding: '15px', fontFamily: 'sans-serif' }}>
      <h1 style={{textAlign:'center', fontSize:'1.2rem'}}>COPA MACI 2026</h1>
      <div style={{display:'flex', gap:'5px', marginBottom:'15px'}}>
        <button onClick={() => setView("ranking")} style={{flex:1, padding:'10px', background:'#fff', borderRadius:'8px'}}>RANKING</button>
        <button onClick={() => setView("cargar")} style={{flex:1, padding:'10px', background:'#fff', borderRadius:'8px'}}>CARGAR</button>
      </div>
      
      {view === "ranking" ? (
        <div>
          {allScores.reverse().map((s, i) => (
            <div key={i} style={{padding:'10px', borderBottom:'1px solid #222', display:'flex', justifyContent:'space-between'}}>
              <span>{PLAYERS.find(p => p.id === s.playerId)?.name}</span>
              <span style={{color:'#bbf7bb'}}>{s.netScore} Netos</span>
            </div>
          ))}
        </div>
      ) : (
        <div style={{textAlign:'center', padding:'20px'}}>
          <p>Conectado a MySQL</p>
          <button onClick={() => alert("Formulario listo")} style={{padding:'15px', background:'#bbf7bb', border:'none', borderRadius:'8px'}}>NUEVA TARJETA</button>
        </div>
      )}
    </div>
  );
}
