import React, { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const API_URL = "https://onrender.com"; 

// --- DATOS FIJOS PARA QUE NO APAREZCA VACÍO ---
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

const PTS_TABLE = [10, 8, 6, 5, 4, 3];

// Logo SVG integrado para que no falle la imagen
function LogoMaci() {
  return (
    <svg width="60" height="60" viewBox="0 0 200 200" style={{display:'block', margin:'0 auto'}}>
      <circle cx="100" cy="100" r="90" stroke="white" strokeWidth="14" fill="none" />
      <path d="M 60 158 L 60 92 L 100 130 L 140 92 L 140 158" stroke="white" strokeWidth="14" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export default function App() {
  const [view, setView] = useState("ranking");
  const [scores, setScores] = useState([]);
  const [giraMatches, setGiraMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  
  const [card, setCard] = useState({ 
    playerId: "p01", date: "", course: "Hacoaj", hcp: 0, 
    grossHoles: Array(18).fill(0), longDrive: false, bestApproach: false 
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resS, resG] = await Promise.all([
          fetch(`${API_URL}/scores`).then(r => r.json()),
          fetch(`${API_URL}/gira`).then(r => r.json())
        ]);
        setScores(Array.isArray(resS) ? resS : []);
        setGiraMatches(Array.isArray(resG) ? resG : []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const getAnnualRanking = () => {
    const stats = {};
    PLAYERS.forEach(p => { stats[p.id] = { ...p, totalPts: 0 }; });
    
    const byMonth = {};
    scores.forEach(s => {
      const mKey = s.date.substring(0, 7); // YYYY-MM
      if(!byMonth[mKey]) byMonth[mKey] = [];
      byMonth[mKey].push({ ...s, net: parseInt(s.totalGross) - parseInt(s.hcp) });
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
      const g = parseInt(s.totalGross);
      if (!bestByPlayer[s.playerId] || g < bestByPlayer[s.playerId].totalGross) {
        bestByPlayer[s.playerId] = s;
      }
    });
    return Object.values(bestByPlayer).sort((a, b) => a.totalGross - b.totalGross);
  };

  const handleSave = async () => {
    const totalG = card.grossHoles.reduce((a, b) => a + (parseInt(b) || 0), 0);
    const data = { ...card, totalGross: totalG };
    await fetch(`${API_URL}/scores`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    window.location.reload();
  };

  const navBtnStyle = (v) => ({
    flex: 1, padding: '12px 5px', fontSize: '0.7rem', fontWeight: 'bold',
    background: view === v ? '#fff' : '#111', color: view === v ? '#000' : '#fff',
    border: '1px solid #333', borderRadius: '8px', cursor: 'pointer'
  });

  if (loading) return <div style={{background:'#000', color:'#fff', height:'100vh', display:'flex', justifyContent:'center', alignItems:'center'}}>Copa Maci 2026...</div>;

  return (
    <div style={{ background: '#000', color: 'white', minHeight: '100vh', padding: '15px', fontFamily: 'sans-serif' }}>
      
      <LogoMaci />

      <div style={{display:'flex', gap:'5px', margin:'20px 0'}}>
        <button onClick={() => setView("ranking")} style={navBtnStyle("ranking")}>RANKING</button>
        <button onClick={() => setView("gross")} style={navBtnStyle("gross")}>GROSS</button>
        <button onClick={() => setView("giras")} style={navBtnStyle("giras")}>GIRAS</button>
        <button onClick={() => setView("cargar")} style={navBtnStyle("cargar")}>CARGAR</button>
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
            <div key={i} style={{padding:'15px', borderBottom:'1px solid #222', display:'flex', justifyContent:'space-between'}}>
              <span>{PLAYERS.find(p => p.id === s.playerId)?.name}</span>
              <span style={{fontWeight:'bold'}}>{s.totalGross} GOLPES</span>
            </div>
          ))}
        </div>
      )}

      {view === "giras" && (
        <div style={{textAlign:'center', padding:'40px 0'}}>
          <h2 style={{fontSize:'2rem'}}>RDM 0 - 0 LDS</h2>
          <p style={{color:'#666'}}>Gira Ryder Cup 2026</p>
        </div>
      )}

      {view === "cargar" && (
        <div style={{background:'#0a1a0a', padding:'20px', borderRadius:'15px', border:'1px solid #1b331b'}}>
          <select value={card.playerId} onChange={e=>setCard({...card, playerId:e.target.value})} style={{width:'100%', padding:'12px', marginBottom:'10px', background:'#000', color:'#fff'}}>
            {PLAYERS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <input type="date" onChange={e=>setCard({...card, date:e.target.value})} style={{width:'100%', padding:'12px', marginBottom:'10px', background:'#000', color:'#fff'}} />
          <input type="number" placeholder="Hándicap" onChange={e=>setCard({...card, hcp:e.target.value})} style={{width:'100%', padding:'12px', marginBottom:'10px', background:'#000', color:'#fff'}} />
          
          <div style={{display:'grid', gridTemplateColumns:'repeat(6, 1fr)', gap:'5px', marginBottom:'20px'}}>
            {card.grossHoles.map((h, i) => (
              <input key={i} type="number" placeholder={i+1} onChange={e => {
                const n = [...card.grossHoles]; n[i] = e.target.value; setCard({...card, grossHoles:n});
              }} style={{width:'100%', padding:'8px', textAlign:'center', background:'#111', color:'#fff', border:'1px solid #333'}} />
            ))}
          </div>

          <button onClick={handleSave} style={{width:'100%', padding:'15px', background:'#bbf7bb', color:'#000', fontWeight:'bold', border:'none', borderRadius:'10px'}}>FINALIZAR TARJETA</button>
        </div>
      )}

      {selectedPlayer && (
        <div style={{position:'fixed', top:0, left:0, width:'100%', height:'100%', background:'#000', padding:'20px', overflowY:'auto', zIndex: 100}}>
          <button onClick={() => setSelectedPlayer(null)} style={{padding:'10px', marginBottom:'20px', background:'#222', color:'#fff', border:'none'}}>✕ CERRAR</button>
          <h2 style={{color:'#bbf7bb'}}>{selectedPlayer.name}</h2>
          <div style={{height: 250, width: '100%', marginTop:'20px'}}>
            <ResponsiveContainer>
              <LineChart data={scores.filter(s => s.playerId === selectedPlayer.id)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis dataKey="date" stroke="#666" />
                <YAxis stroke="#666" />
                <Tooltip contentStyle={{background:'#111', border:'none'}} />
                <Line type="monotone" dataKey="totalGross" stroke="#bbf7bb" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
