import React, { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy } from "firebase/firestore";

// ─── CONFIGURACIÓN FIREBASE ──────────────────
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

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
].sort((a,b) => a.name.localeCompare(b.name));

export default function App() {
  const [view, setView] = useState("home"); // home, setup, wizard, ranking_gross
  const [scores, setScores] = useState([]);
  const [setup, setSetup] = useState({ playerId: "p01", course: "Hacoaj", tee: "Blanco", hcp: "", date: new Date().toISOString().split('T')[0] });

  useEffect(() => {
    const q = query(collection(db, "scores"), orderBy("date", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setScores(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  // ─── LÓGICA DE RANKINGS ───
  
  // 1. Obtener el mejor Gross de cada jugador por cada mes
  const getGrossStats = () => {
    const stats = {}; // { playerId: { m03: 78, m04: 82... } }

    scores.forEach(s => {
      const month = s.date.substring(0, 7); // "2026-03"
      if (!stats[s.playerId]) stats[s.playerId] = {};
      if (!stats[s.playerId][month] || s.gross < stats[s.playerId][month]) {
        stats[s.playerId][month] = s.gross;
      }
    });

    // Convertir a ranking acumulado (promedio o suma de mejores gross mensuales)
    return PLAYERS.map(p => {
      const playerMonths = stats[p.id] || {};
      const monthlyValues = Object.values(playerMonths);
      const avgGross = monthlyValues.length > 0 
        ? (monthlyValues.reduce((a, b) => a + b, 0) / monthlyValues.length).toFixed(1) 
        : "-";
      const bestEver = monthlyValues.length > 0 ? Math.min(...monthlyValues) : "-";
      
      return { ...p, avgGross, bestEver, playedMonths: monthlyValues.length };
    }).sort((a, b) => (a.avgGross === "-" ? 1 : b.avgGross === "-" ? -1 : a.avgGross - b.avgGross));
  };

  return (
    <div style={{ maxWidth: 500, margin: "0 auto", padding: "20px", backgroundColor: "#000", minHeight: "100vh", color: "#fff", fontFamily: "'Barlow Condensed', sans-serif" }}>
      
      {view === "home" && (
        <>
          <header style={{ textAlign: "center", marginBottom: 30 }}>
            <h1 style={{ letterSpacing: 6, margin: 0 }}>COPA MACI</h1>
          </header>

          <div style={{ marginBottom: 25 }}>
            <span style={lbl}>RANKING GROSS ANUAL (Mejor promedio)</span>
            <div style={{ background: "#111", borderRadius: 10, padding: 10, border: "1px solid #222" }}>
              {getGrossStats().slice(0, 5).map((p, i) => (
                <div key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: i < 4 ? "1px solid #1a1a1a" : "none" }}>
                  <span style={{ fontSize: 14 }}>{i+1}. {p.name}</span>
                  <span style={{ fontWeight: 900, color: "#00ff88" }}>{p.avgGross} G</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button onClick={() => setView("ranking_gross")} style={btnSecondary}>RANKING GROSS DETALLADO</button>
            <button onClick={() => setView("setup")} style={btnPrimary}>NUEVA TARJETA / TORNEO</button>
          </div>
        </>
      )}

      {view === "ranking_gross" && (
        <div>
          <button onClick={() => setView("home")} style={back}>← VOLVER</button>
          <h2 style={{ letterSpacing: 2 }}>RANKING GROSS ACUMULADO</h2>
          <table style={{ width: "100%", textAlign: "left", fontSize: 14 }}>
            <thead>
              <tr style={{ color: "#444" }}>
                <th>JUGADOR</th>
                <th>PROM.</th>
                <th>BEST</th>
                <th>MESES</th>
              </tr>
            </thead>
            <tbody>
              {getGrossStats().map(p => (
                <tr key={p.id} style={{ borderBottom: "1px solid #111" }}>
                  <td style={{ padding: "10px 0" }}>{p.name}</td>
                  <td style={{ fontWeight: 900 }}>{p.avgGross}</td>
                  <td>{p.bestEver}</td>
                  <td>{p.playedMonths}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {view === "setup" && (
        <SetupView setup={setup} setSetup={setSetup} onNext={() => setView("wizard")} onBack={() => setView("home")} />
      )}

      {view === "wizard" && (
        <ScorecardOnline setup={setup} onSave={async (d) => { await addDoc(collection(db, "scores"), {...d, createdAt: new Date()}); setView("home"); }} />
      )}
    </div>
  );
}

// --- VISTAS SECUNDARIAS ---
function SetupView({ setup, setSetup, onNext, onBack }) {
  return (
    <div>
      <button onClick={onBack} style={back}>← VOLVER</button>
      <h2 style={{ letterSpacing: 2 }}>CONFIGURAR PARTIDA</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
        <label style={lbl}>Fecha de Juego
          <input type="date" style={inpt} value={setup.date} onChange={e => setSetup({...setup, date: e.target.value})} />
        </label>
        <label style={lbl}>Jugador
          <select style={inpt} value={setup.playerId} onChange={e => setSetup({...setup, playerId: e.target.value})}>
            {PLAYERS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <div style={{ display: "flex", gap: 10 }}>
          <label style={{ ...lbl, flex: 1 }}>Hcp Juego
            <input type="number" style={inpt} placeholder="0" onChange={e => setSetup({...setup, hcp: e.target.value})} />
          </label>
          <label style={{ ...lbl, flex: 1 }}>Tee
            <select style={inpt} onChange={e => setSetup({...setup, tee: e.target.value})}>
              <option value="Blanco">Blanco</option><option value="Negro">Negro</option><option value="Azul">Azul</option>
            </select>
          </label>
        </div>
        <button onClick={onNext} style={btnPrimary}>CARGAR TARJETA ONLINE</button>
      </div>
    </div>
  );
}

function ScorecardOnline({ setup, onSave }) {
  const [holes, setHoles] = useState(Array(18).fill(""));
  const gross = holes.reduce((a, b) => a + (parseInt(b) || 0), 0);
  const net = gross - (parseInt(setup.hcp) || 0);

  return (
    <div>
      <div style={{ background: "#111", padding: 15, borderRadius: 10, marginBottom: 20, textAlign: "center" }}>
        <div style={{ fontWeight: 900 }}>{PLAYERS.find(p => p.id === setup.playerId)?.name}</div>
        <div style={{ fontSize: 24, color: "#00ff88" }}>GROSS ACTUAL: {gross}</div>
        <div style={{ fontSize: 14, color: "#444" }}>NETO ESTIMADO: {net}</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 5, marginBottom: 20 }}>
        {holes.map((h, i) => (
          <input key={i} type="number" placeholder={i+1} style={{...inpt, padding: 8, textAlign: "center"}} value={h} onChange={e => {
            const n = [...holes]; n[i] = e.target.value; setHoles(n);
          }} />
        ))}
      </div>
      <button onClick={() => onSave({ ...setup, holes, gross, netScore: net })} style={btnPrimary}>GUARDAR TARJETA</button>
    </div>
  );
}

const btnPrimary = { background: "#fff", color: "#000", border: "none", padding: "16px", fontWeight: 900, borderRadius: 8, cursor: "pointer", width: "100%" };
const btnSecondary = { background: "#111", color: "#fff", border: "1px solid #333", padding: "16px", fontWeight: 900, borderRadius: 8, cursor: "pointer", width: "100%" };
const inpt = { width: "100%", padding: 12, background: "#111", color: "#fff", border: "1px solid #333", borderRadius: 8, boxSizing: "border-box" };
const lbl = { fontSize: 10, color: "#444", letterSpacing: 2, textTransform: "uppercase", marginBottom: 5, display: "block" };
const back = { background: "none", border: "none", color: "#555", cursor: "pointer", marginBottom: 10 };
