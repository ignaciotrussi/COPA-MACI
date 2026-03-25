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

// ─── CONSTANTES ──────────────────────────────
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
].sort((a, b) => a.name.localeCompare(b.name));

const COURSES = ["Hacoaj", "Jockey Club", "Los Lagartos", "Hindú Club", "CASI", "Otro"];
const PTS_TABLE = [10, 8, 6, 5, 4, 3, 2, 2, 2, 2, 2];

// ─── APP PRINCIPAL ───────────────────────────
export default function App() {
  const [view, setView] = useState("home"); // home, setup, wizard, ranking_anual
  const [scores, setScores] = useState([]);
  const [setup, setSetup] = useState({ date: new Date().toISOString().split('T')[0], playerId: "", hcp: "", course: "Hacoaj", tee: "Blanco" });

  useEffect(() => {
    const q = query(collection(db, "scores"), orderBy("date", "desc"));
    const unsubscribe = onSnapshot(q, (snap) => {
      setScores(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, []);

  // Lógica: Mejor neto mensual -> Puntos Copa
  const calculatePoints = () => {
    const pts = {}; PLAYERS.forEach(p => pts[p.id] = 0);
    const months = [...new Set(scores.map(s => s.date.substring(0, 7)))];
    months.forEach(m => {
      const bests = [];
      PLAYERS.forEach(p => {
        const pScores = scores.filter(s => s.playerId === p.id && s.date.startsWith(m));
        if (pScores.length > 0) bests.push({ id: p.id, neto: Math.min(...pScores.map(s => s.netScore)) });
      });
      bests.sort((a,b) => a.neto - b.neto).forEach((item, idx) => { pts[item.id] += PTS_TABLE[idx] || 1; });
    });
    return pts;
  };

  const currentPoints = calculatePoints();

  return (
    <div style={{ maxWidth: 500, margin: "0 auto", padding: 20, backgroundColor: "#000", minHeight: "100vh", color: "white", fontFamily: "'Barlow Condensed', sans-serif" }}>
      
      {/* LOGO CM OFICIAL */}
      <header style={{ textAlign: "center", marginBottom: 30 }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 15 }}>
          <LogoSVG size={100} />
        </div>
        <h1 style={{ letterSpacing: 8, margin: 0, fontSize: 32 }}>COPA MACI</h1>
        <p style={{ color: "#444", fontSize: 11, letterSpacing: 4 }}>THE GOLF CHAMPIONSHIP</p>
      </header>

      {view === "home" && (
        <>
          <section style={{ marginBottom: 25 }}>
            <span style={S.label}>Field de Jugadores / Puntos Copa</span>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {PLAYERS.map(p => (
                <div key={p.id} style={S.card}>
                  <div style={S.avatar}>{p.av}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: 17 }}>{p.name.toUpperCase()}</div>
                    <div style={{ fontSize: 10, color: "#555" }}>MAT: {p.mat}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 26, fontWeight: 900 }}>{currentPoints[p.id]}</div>
                    <div style={{ fontSize: 9, color: "#444" }}>PTS</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <button onClick={() => setView("setup")} style={S.btnPrimary}>+ NUEVO TORNEO / JUGAR FECHA</button>
            <button onClick={() => setView("ranking_anual")} style={S.btnSecondary}>VER RANKING ANUAL ACUMULADO</button>
          </div>
        </>
      )}

      {view === "setup" && (
        <div style={{ animation: "fadeIn 0.3s" }}>
          <button onClick={() => setView("home")} style={S.backBtn}>← CANCELAR</button>
          <h2 style={{ letterSpacing: 2, marginBottom: 25 }}>CONFIGURAR PARTIDA</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
            <label style={S.label}>FECHA
              <input type="date" style={S.input} value={setup.date} onChange={e => setSetup({...setup, date: e.target.value})} />
            </label>
            <label style={S.label}>JUGADOR
              <select style={S.input} onChange={e => setSetup({...setup, playerId: e.target.value})}>
                <option value="">Elegir de la lista...</option>
                {PLAYERS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
            <div style={{ display: "flex", gap: 10 }}>
              <label style={{...S.label, flex:1}}>HCP JUEGO
                <input type="number" style={S.input} placeholder="0" onChange={e => setSetup({...setup, hcp: e.target.value})} />
              </label>
              <label style={{...S.label, flex:1}}>CANCHA
                <select style={S.input} onChange={e => setSetup({...setup, course: e.target.value})}>
                  {COURSES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
            </div>
            <button onClick={() => setView("wizard")} disabled={!setup.playerId} style={S.btnPrimary}>INICIAR TARJETA ONLINE</button>
          </div>
        </div>
      )}

      {view === "wizard" && (
        <Wizard setup={setup} allScores={scores} onSave={async (d) => { await addDoc(collection(db, "scores"), {...d, createdAt: new Date()}); setView("home"); }} onBack={() => setView("home")} />
      )}

      {view === "ranking_anual" && (
        <div>
          <button onClick={() => setView("home")} style={S.backBtn}>← VOLVER AL FIELD</button>
          <h2 style={{ letterSpacing: 2, marginBottom: 20 }}>RANKING ANUAL ACUMULADO</h2>
          {PLAYERS.map((p, i) => (
            <div key={p.id} style={{ ...S.card, opacity: currentPoints[p.id] > 0 ? 1 : 0.4 }}>
              <span style={{ fontWeight: 900, color: "#444", width: 25 }}>{i+1}</span>
              <span style={{ flex: 1, fontWeight: 700 }}>{p.name.toUpperCase()}</span>
              <span style={{ fontWeight: 900, fontSize: 20 }}>{currentPoints[p.id]} PTS</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Wizard({ setup, allScores, onSave, onBack }) {
  const [holes, setHoles] = useState(Array(18).fill(""));
  const gross = holes.reduce((a, b) => a + (parseInt(b) || 0), 0);
  const net = gross - (parseInt(setup.hcp) || 0);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20, alignItems: "center" }}>
        <button onClick={onBack} style={S.backBtn}>SALIR</button>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#00ff88" }}>GROSS: {gross}</div>
          <div style={{ fontSize: 14, color: "#FFD700" }}>NETO: {net}</div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 6, marginBottom: 25 }}>
        {holes.map((h, i) => (
          <div key={i}>
            <div style={{ fontSize: 9, color: "#444", textAlign: "center", marginBottom: 3 }}>{i+1}</div>
            <input type="number" style={{...S.input, padding: 8, textAlign: "center", fontSize: 16}} value={h} onChange={e => {
              const n = [...holes]; n[i] = e.target.value; setHoles(n);
            }} />
          </div>
        ))}
      </div>
      <div style={{ marginBottom: 25, background: "#0a0a0a", padding: 15, borderRadius: 10, border: "1px solid #111" }}>
        <span style={S.label}>Scores del día en vivo (Live)</span>
        {allScores.filter(s => s.date === setup.date).map(s => (
          <div key={s.id} style={{ display:"flex", justifyContent:"space-between", fontSize: 13, padding: "8px 0", borderBottom: "1px solid #111" }}>
            <span>{PLAYERS.find(p => p.id === s.playerId)?.name}</span>
            <span style={{ fontWeight: 900, color: "#FFD700" }}>{s.netScore} NETO</span>
          </div>
        ))}
        {allScores.filter(s => s.date === setup.date).length === 0 && <div style={{fontSize: 12, color: "#333", marginTop: 5}}>Nadie más está cargando hoy.</div>}
      </div>
      <button onClick={() => onSave({ ...setup, holes, gross, netScore: net })} style={S.btnPrimary}>GUARDAR Y CERRAR TARJETA</button>
    </div>
  );
}

function LogoSVG({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      <circle cx="100" cy="100" r="90" stroke="white" strokeWidth="12" />
      <path d="M 158 100 A 58 58 0 1 0 142 148" stroke="white" strokeWidth="18" strokeLinecap="round" />
      <path d="M 55 160 L 55 85 L 100 135 L 145 85 L 145 160" stroke="white" strokeWidth="18" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const S = {
  card: { background: "#0c0c0c", padding: "14px 18px", borderRadius: 12, display: "flex", alignItems: "center", gap: 15, border: "1px solid #1a1a1a" },
  avatar: { width: 34, height: 34, borderRadius: "50%", background: "#111", border: "1px solid #222", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 12, color: "#666" },
  label: { fontSize: 10, color: "#444", letterSpacing: 3, textTransform: "uppercase", marginBottom: 8, display: "block" },
  input: { width: "100%", padding: 14, background: "#111", color: "#fff", border: "1px solid #2a2a2a", borderRadius: 10, boxSizing: "border-box", fontSize: 16 },
  btnPrimary: { background: "#fff", color: "#000", border: "none", padding: 18, fontWeight: 900, borderRadius: 10, cursor: "pointer", width: "100%", letterSpacing: 2, fontSize: 14 },
  btnSecondary: { background: "#000", color: "#fff", border: "1.5px solid #222", padding: 18, fontWeight: 900, borderRadius: 10, cursor: "pointer", width: "100%", letterSpacing: 2, fontSize: 14 },
  backBtn: { background: "none", border: "none", color: "#666", cursor: "pointer", marginBottom: 15, fontSize: 12, letterSpacing: 1, fontWeight: 700 }
};
