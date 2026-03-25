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
];

const PTS_TABLE =;

// ─── APP PRINCIPAL ───────────────────────────
export default function App() {
  const [view, setView] = useState("home"); 
  const [scores, setScores] = useState([]);
  const [setup, setSetup] = useState({ date: new Date().toISOString().split('T'), playerId: "", hcp: "", course: "Hacoaj", longDrive: false, bestApproach: false });

  useEffect(() => {
    const q = query(collection(db, "scores"), orderBy("date", "desc"));
    const unsubscribe = onSnapshot(q, (snap) => {
      setScores(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, []);

  // --- LÓGICA DE PUNTOS (NETO + DESEMPATE POR VUELTA + EXTRAS) ---
  const calculateCopaStats = () => {
    const totalPts = {}; PLAYERS.forEach(p => totalPts[p.id] = 0);
    const months = [...new Set(scores.map(s => s.date.substring(0, 7)))];

    months.forEach(m => {
      const bestsByMonth = [];
      PLAYERS.forEach(p => {
        const pScores = scores.filter(s => s.playerId === p.id && s.date.startsWith(m));
        if (pScores.length > 0) {
          // Mejor tarjeta: menor Neto. Empate: menor Back 9 (hoyos 10-18)
          const sorted = pScores.sort((a, b) => {
            if (a.netScore !== b.netScore) return a.netScore - b.netScore;
            return a.back9Gross - b.back9Gross;
          });
          const best = sorted;
          bestsByMonth.push({ id: p.id, neto: best.netScore, back9: best.back9Gross, ld: best.longDrive, ba: best.bestApproach });
        }
      });

      // Ranking del mes con desempate por Back 9
      bestsByMonth.sort((a, b) => a.neto !== b.neto ? a.neto - b.neto : a.back9 - b.back9).forEach((item, idx) => {
        let pts = PTS_TABLE[idx] || 1; 
        if (item.ld) pts += 1;
        if (item.ba) pts += 1;
        totalPts[item.id] += pts;
      });
    });

    return PLAYERS.map(p => ({ ...p, pts: totalPts[p.id] })).sort((a, b) => b.pts - a.pts);
  };

  const rankedPlayers = calculateCopaStats();

  return (
    <div style={{ maxWidth: 500, margin: "0 auto", padding: 20, backgroundColor: "#000", minHeight: "100vh", color: "white", fontFamily: "'Barlow Condensed', sans-serif" }}>
      
      <header style={{ textAlign: "center", marginBottom: 30 }}>
        <LogoSVG size={100} />
        <h1 style={{ letterSpacing: 8, margin: "10px 0 0", fontSize: 32 }}>COPA MACI</h1>
      </header>

      {view === "home" && (
        <>
          <section style={{ marginBottom: 25 }}>
            <span style={S.label}>RANKING COPA (PUNTOS ACUMULADOS)</span>
            {rankedPlayers.map((p, i) => (
              <div key={p.id} style={{ ...S.card, borderColor: i === 0 ? "#FFD700" : "#1a1a1a" }}>
                <div style={{ ...S.avatar, color: i === 0 ? "#FFD700" : "#555" }}>{p.av}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: 17 }}>{p.name.toUpperCase()}</div>
                  <div style={{ fontSize: 10, color: "#444" }}>MAT: {p.mat}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 26, fontWeight: 900, color: i === 0 ? "#FFD700" : "#fff" }}>{p.pts}</div>
                  <div style={{ fontSize: 9, color: "#444" }}>PTS</div>
                </div>
              </div>
            ))}
          </section>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <button onClick={() => setView("setup")} style={S.btnPrimary}>+ NUEVO TORNEO / CARGAR TARJETA</button>
            <button onClick={() => setView("ranking_gross")} style={S.btnSecondary}>RANKING GROSS ANUAL</button>
          </div>
        </>
      )}

      {view === "setup" && (
        <SetupView setup={setup} setSetup={setSetup} onNext={() => setView("wizard")} onBack={() => setView("home")} />
      )}

      {view === "wizard" && (
        <Wizard setup={setup} allScores={scores} onSave={async (d) => { await addDoc(collection(db, "scores"), {...d, createdAt: new Date()}); setView("home"); }} onBack={() => setView("home")} />
      )}

      {view === "ranking_gross" && (
        <RankingGross scores={scores} onBack={() => setView("home")} />
      )}

    </div>
  );
}

// ─── COMPONENTES SECUNDARIOS ───

function SetupView({ setup, setSetup, onNext, onBack }) {
  return (
    <div>
      <button onClick={onBack} style={S.backBtn}>← VOLVER</button>
      <h2 style={{ letterSpacing: 2 }}>CONFIGURAR PARTIDA</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
        <input type="date" style={S.input} value={setup.date} onChange={e => setSetup({...setup, date: e.target.value})} />
        <select style={S.input} value={setup.playerId} onChange={e => setSetup({...setup, playerId: e.target.value})}>
          <option value="">Jugador...</option>
          {PLAYERS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <div style={{ display: "flex", gap: 10 }}>
          <input type="number" style={S.input} placeholder="HCP Juego" onChange={e => setSetup({...setup, hcp: e.target.value})} />
          <select style={S.input} onChange={e => setSetup({...setup, course: e.target.value})}>
            <option value="Hacoaj">Hacoaj</option><option value="CASI">CASI</option><option value="Jockey">Jockey</option>
          </select>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => setSetup({...setup, longDrive: !setup.longDrive})} style={{ ...S.btnCheck, borderColor: setup.longDrive ? "#fff" : "#222" }}>
            {setup.longDrive ? "✅" : "⚪"} LONG DRIVE
          </button>
          <button onClick={() => setSetup({...setup, bestApproach: !setup.bestApproach})} style={{ ...S.btnCheck, borderColor: setup.bestApproach ? "#fff" : "#222" }}>
            {setup.bestApproach ? "✅" : "⚪"} BEST APPROACH
          </button>
        </div>
        <button onClick={onNext} disabled={!setup.playerId} style={S.btnPrimary}>CARGAR TARJETA ONLINE</button>
      </div>
    </div>
  );
}

function Wizard({ setup, onSave, onBack }) {
  const [holes, setHoles] = useState(Array(18).fill(""));
  const gross = holes.reduce((a, b) => a + (parseInt(b) || 0), 0);
  const back9Gross = holes.slice(9, 18).reduce((a, b) => a + (parseInt(b) || 0), 0);
  const net = gross - (parseInt(setup.hcp) || 0);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
        <button onClick={onBack} style={S.backBtn}>CANCELAR</button>
        <div style={{ textAlign: "right" }}>
          <div style={{fontSize: 20, fontWeight: 900, color: "#00ff88"}}>GROSS: {gross}</div>
          <div style={{fontSize: 12, color: "#444"}}>VUELTA (B9): {back9Gross}</div>
          <div style={{fontSize: 24, color: "#FFD700", fontWeight: 900}}>NETO: {net}</div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 6, marginBottom: 20 }}>
        {holes.map((h, i) => (
          <input key={i} type="number" placeholder={i+1} style={{...S.input, padding: 8, textAlign: "center"}} value={h} onChange={e => {
            const n = [...holes]; n[i] = e.target.value; setHoles(n);
          }} />
        ))}
      </div>
      <button onClick={() => onSave({ ...setup, holes, gross, back9Gross, netScore: net })} style={S.btnPrimary}>GUARDAR TARJETA</button>
    </div>
  );
}

function RankingGross({ scores, onBack }) {
  const stats = PLAYERS.map(p => {
    const pScores = scores.filter(s => s.playerId === p.id);
    const bestG = pScores.length > 0 ? Math.min(...pScores.map(s => s.gross)) : "-";
    return { ...p, bestG };
  }).sort((a, b) => (a.bestG === "-" ? 1 : b.bestG === "-" ? -1 : a.bestG - b.bestG));

  return (
    <div>
      <button onClick={onBack} style={S.backBtn}>← VOLVER</button>
      <h2 style={{ letterSpacing: 2, marginBottom: 20 }}>RANKING MEJOR GROSS</h2>
      {stats.map((p, i) => (
        <div key={p.id} style={{ ...S.card, borderColor: i === 0 ? "#00ff88" : "#1a1a1a" }}>
          <span style={{ fontWeight: 900, color: "#444", width: 25 }}>{i+1}</span>
          <span style={{ flex: 1, fontWeight: 700 }}>{p.name.toUpperCase()}</span>
          <span style={{ fontWeight: 900, color: "#00ff88", fontSize: 22 }}>{p.bestG}</span>
        </div>
      ))}
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
  card: { background: "#0c0c0c", padding: "14px 18px", borderRadius: 12, display: "flex", alignItems: "center", gap: 15, border: "1.5px solid #1a1a1a", marginBottom: 8 },
  avatar: { width: 34, height: 34, borderRadius: "50%", background: "#111", border: "1px solid #222", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 12 },
  label: { fontSize: 10, color: "#444", letterSpacing: 3, textTransform: "uppercase", marginBottom: 8, display: "block" },
  input: { width: "100%", padding: 14, background: "#111", color: "#fff", border: "1px solid #2a2a2a", borderRadius: 10, fontSize: 16, boxSizing: "border-box" },
  btnPrimary: { background: "#fff", color: "#000", border: "none", padding: 18, fontWeight: 900, borderRadius: 10, cursor: "pointer", width: "100%", letterSpacing: 2 },
  btnSecondary: { background: "#000", color: "#fff", border: "1.5px solid #222", padding: 18, fontWeight: 900, borderRadius: 10, cursor: "pointer", width: "100%", letterSpacing: 2 },
  btnCheck: { background: "#111", color: "#fff", border: "1.5px solid #222", padding: 12, borderRadius: 8, cursor: "pointer", flex: 1, fontSize: 10, fontWeight: 700, letterSpacing: 1 },
  backBtn: { background: "none", border: "none", color: "#666", cursor: "pointer", marginBottom: 15, fontSize: 12 }
};
