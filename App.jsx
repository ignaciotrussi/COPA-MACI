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

// ─── COMPONENTE PRINCIPAL ────────────────────
export default function App() {
  const [view, setView] = useState("home"); // home, setup, wizard, rankingGross
  const [scores, setScores] = useState([]);
  const [setup, setSetup] = useState({ playerId: "p01", course: "Hacoaj", tee: "Blanco", hcp: "", date: new Date().toISOString().split('T')[0] });

  useEffect(() => {
    const q = query(collection(db, "scores"), orderBy("date", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setScores(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  // --- LÓGICA DE CÁLCULO DE PUNTOS (Ranking Mensual) ---
  const calculatePoints = () => {
    const playerPoints = {};
    PLAYERS.forEach(p => playerPoints[p.id] = 0);

    // Agrupar por Mes
    const months = [...new Set(scores.map(s => s.date.substring(0, 7)))];
    
    months.forEach(m => {
      const bestNetos = [];
      PLAYERS.forEach(p => {
        const pMonthScores = scores.filter(s => s.playerId === p.id && s.date.startsWith(m));
        if (pMonthScores.length > 0) {
          const bestNeto = Math.min(...pMonthScores.map(s => s.netScore));
          bestNetos.push({ playerId: p.id, neto: bestNeto });
        }
      });
      // Ordenar netos del mes y asignar puntos
      bestNetos.sort((a, b) => a.neto - b.neto).forEach((item, idx) => {
        playerPoints[item.playerId] += PTS_TABLE[idx] || 1;
      });
    });
    return playerPoints;
  };

  const points = calculatePoints();

  return (
    <div style={{ maxWidth: 500, margin: "0 auto", padding: 20, backgroundColor: "#000", minHeight: "100vh", color: "white", fontFamily: "'Barlow Condensed', sans-serif" }}>
      
      {/* ─── FRONTING PRINCIPAL ─── */}
      {view === "home" && (
        <>
          <header style={{ textAlign: "center", marginBottom: 30 }}>
            <LogoSVG size={80} />
            <h1 style={{ letterSpacing: 6, margin: "10px 0 0" }}>COPA MACI</h1>
            <p style={{ color: "#444", fontSize: 10 }}>THE GOLF CHAMPIONSHIP 2026</p>
          </header>

          <section style={{ marginBottom: 25 }}>
            <span style={S.label}>Field de Jugadores / Ranking</span>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {PLAYERS.map(p => (
                <div key={p.id} style={S.cardPlayer}>
                  <div style={S.avatar}>{p.av}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{p.name}</div>
                    <div style={{ fontSize: 10, color: "#444" }}>MAT: {p.mat}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 22, fontWeight: 900, color: "#fff" }}>{points[p.id]}</div>
                    <div style={{ fontSize: 9, color: "#444" }}>PTS</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
            <button onClick={() => setView("setup")} style={S.btnPrimary}>JUGAR NUEVO TORNEO / CARGAR TARJETA</button>
            <button onClick={() => setView("rankingGross")} style={S.btnSecondary}>VER RANKING MEJOR GROSS</button>
          </section>
        </>
      )}

      {/* ─── SETUP: CONFIGURAR SALIDA ─── */}
      {view === "setup" && (
        <SetupView setup={setup} setSetup={setSetup} onNext={() => setView("wizard")} onBack={() => setView("home")} />
      )}

      {/* ─── WIZARD: CARGA ONLINE ─── */}
      {view === "wizard" && (
        <ScorecardOnline 
          setup={setup} 
          allScores={scores}
          onSave={async (d) => { await addDoc(collection(db, "scores"), {...d, createdAt: new Date()}); setView("home"); }} 
        />
      )}

      {/* ─── RANKING GROSS ─── */}
      {view === "rankingGross" && (
        <RankingGross scores={scores} onBack={() => setView("home")} />
      )}

    </div>
  );
}

// ─── VISTAS SECUNDARIAS ───

function SetupView({ setup, setSetup, onNext, onBack }) {
  return (
    <div>
      <button onClick={onBack} style={S.back}>← VOLVER</button>
      <h2 style={{ letterSpacing: 2 }}>NUEVO TORNEO</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
        <label style={S.label}>FECHA DE JUEGO
          <input type="date" style={S.input} value={setup.date} onChange={e => setSetup({...setup, date: e.target.value})} />
        </label>
        <label style={S.label}>JUGADOR
          <select style={S.input} value={setup.playerId} onChange={e => setSetup({...setup, playerId: e.target.value})}>
            {PLAYERS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <div style={{ display: "flex", gap: 10 }}>
          <label style={{ ...S.label, flex: 1 }}>HCP JUEGO
            <input type="number" style={S.input} placeholder="0" value={setup.hcp} onChange={e => setSetup({...setup, hcp: e.target.value})} />
          </label>
          <label style={{ ...S.label, flex: 1 }}>CANCHA
            <select style={S.input} value={setup.course} onChange={e => setSetup({...setup, course: e.target.value})}>
              {COURSES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
        </div>
        <button onClick={onNext} style={S.btnPrimary}>CARGAR TARJETA ONLINE</button>
      </div>
    </div>
  );
}

function ScorecardOnline({ setup, allScores, onSave }) {
  const [holes, setHoles] = useState(Array(18).fill(""));
  const gross = holes.reduce((a, b) => a + (parseInt(b) || 0), 0);
  const net = gross - (parseInt(setup.hcp) || 0);

  return (
    <div>
      <div style={{ background: "#111", padding: 15, borderRadius: 10, marginBottom: 15, border: "1px solid #222" }}>
        <div style={{ fontWeight: 900, fontSize: 18 }}>{PLAYERS.find(p => p.id === setup.playerId).name}</div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
          <span style={{color: "#444"}}>{setup.course} · Neto: {net}</span>
          <span style={{color: "#00ff88", fontWeight: 900}}>GROSS: {gross}</span>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 5, marginBottom: 20 }}>
        {holes.map((h, i) => (
          <input key={i} type="number" placeholder={i+1} style={{...S.input, padding: 8, textAlign: "center"}} value={h} onChange={e => {
            const n = [...holes]; n[i] = e.target.value; setHoles(n);
          }} />
        ))}
      </div>
      <div style={{ marginBottom: 15 }}>
        <span style={S.label}>Scores del resto hoy</span>
        {allScores.filter(s => s.date === setup.date).map(s => (
          <div key={s.id} style={{ fontSize: 12, background: "#0a0a0a", padding: 8, borderRadius: 5, marginBottom: 4, display: "flex", justifyContent: "space-between" }}>
            <span>{PLAYERS.find(p => p.id === s.playerId)?.name}</span>
            <span>{s.netScore} NETO</span>
          </div>
        ))}
      </div>
      <button onClick={() => onSave({ ...setup, holes, gross, netScore: net })} style={S.btnPrimary}>GUARDAR Y CERRAR</button>
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
      <button onClick={onBack} style={S.back}>← VOLVER</button>
      <h2 style={{ letterSpacing: 2 }}>RANKING MEJOR GROSS</h2>
      {stats.map((p, i) => (
        <div key={p.id} style={{ ...S.cardPlayer, marginBottom: 5 }}>
          <span>{i+1}. {p.name}</span>
          <span style={{ fontWeight: 900, color: "#00ff88" }}>{p.bestG} G</span>
        </div>
      ))}
    </div>
  );
}

// ─── DISEÑO Y LOGO ───────────────────────────
function LogoSVG({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      <circle cx="100" cy="100" r="90" stroke="white" strokeWidth="14" />
      <path d="M 158 100 A 58 58 0 1 0 142 148" stroke="white" strokeWidth="14" />
      <path d="M 58 155 L 58 90 L 100 128 L 142 90 L 142 155" stroke="white" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const S = {
  cardPlayer: { background: "#111", padding: "10px 15px", borderRadius: 8, display: "flex", alignItems: "center", gap: 15, border: "1px solid #1a1a1a" },
  avatar: { width: 30, height: 30, borderRadius: "50%", background: "#222", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 900 },
  label: { fontSize: 10, color: "#444", letterSpacing: 2, textTransform: "uppercase", marginBottom: 6, display: "block" },
  input: { width: "100%", padding: 12, background: "#111", color: "#fff", border: "1px solid #333", borderRadius: 8, boxSizing: "border-box", fontSize: 15 },
  btnPrimary: { background: "#fff", color: "#000", border: "none", padding: 16, fontWeight: 900, borderRadius: 8, cursor: "pointer", width: "100%", letterSpacing: 1 },
  btnSecondary: { background: "#111", color: "#fff", border: "1px solid #333", padding: 16, fontWeight: 900, borderRadius: 8, cursor: "pointer", width: "100%", letterSpacing: 1 },
  back: { background: "none", border: "none", color: "#555", cursor: "pointer", marginBottom: 10 }
};
