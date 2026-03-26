import React, { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, getDocs, doc, deleteDoc } from "firebase/firestore";

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

// ─── JUGADORES INICIALES ──────────────────────
const INITIAL_PLAYERS = [
  { name: "Esteban Chicco", mat: "56229" },
  { name: "Juan José Hardoy", mat: "112534" },
  { name: "Manuel Gosende", mat: "175387" },
  { name: "Rodrigo López Martínez", mat: "132679" },
  { name: "Ignacio Trussi", mat: "46215" },
  { name: "Andrés Torres Carbonell", mat: "52274" },
  { name: "Federico Procaccini", mat: "121277" },
  { name: "Ignacio Macías", mat: "45585" },
  { name: "Mariano Bustillo", mat: "119275" },
  { name: "Carlos Segundo Morixe", mat: "119372" },
  { name: "Francisco Goldaracena", mat: "173455" }
];

const PTS_TABLE = [10, 8, 6, 5, 4, 3, 2, 2, 2, 2, 2];

// ─── COMPONENTE LOGO (Diseño CM) ──────────────
const LogoMaciSVG = () => (
  <svg width="120" height="120" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org" style={{ margin: "0 auto", display: "block" }}>
    <path d="M80 50C80 66.5685 66.5685 80 50 80C33.4315 80 20 66.5685 20 50C20 33.4315 33.4315 20 50 20C58.2843 20 65.7843 23.3579 71.2132 28.7868" stroke="white" strokeWidth="6" strokeLinecap="round""")/>>
    <path d="M30 75L50 45L70 75" stroke="white" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round""")/>>
    <path d="M40 60L50 45L60 60" stroke="white" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round""")/>>
  </svg>
);

export default function App() {
  const [view, setView] = useState("home");
  const [scores, setScores] = useState([]);
  const [players, setPlayers] = useState(INITIAL_PLAYERS); // Carga inicial por defecto
  const [isAdmin, setIsAdmin] = useState(false);
  const [setup, setSetup] = useState({ date: new Date().toISOString().split('T')[0], playerId: "", hcp: "", course: "Hacoaj" });

  useEffect(() => {
    // Sincronizar Jugadores desde Firebase (si existen)
    const unsubP = onSnapshot(collection(db, "players"), (snap) => {
      if (!snap.empty) {
        setPlayers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }
    });
    // Sincronizar Scores
    const unsubS = onSnapshot(query(collection(db, "scores"), orderBy("date", "desc")), (snap) => {
      setScores(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => { unsubP(); unsubS(); };
  }, []);

  const getRankedPlayers = () => {
    return players.map(p => {
      let pts = 0;
      // Lógica simplificada de puntos acumulados para el ejemplo
      scores.filter(s => s.playerId === (p.id || p.name)).forEach(s => {
        pts += s.longDrive ? 1 : 0;
        pts += s.bestApproach ? 1 : 0;
      });
      return { ...p, totalPts: pts };
    }).sort((a, b) => b.totalPts - a.totalPts);
  };

  return (
    <div style={S.container}>
      <header style={{ textAlign: "center", padding: "20px 0" }}>
        <LogoMaciSVG />
        <h1 style={{ letterSpacing: 8, fontSize: 24, marginTop: 10, fontWeight: 900 }}>COPA MACI</h1>
      </header>

      {view === "home" && (
        <>
          <div style={{ marginBottom: 20 }}>
            <span style={S.label}>RANKING ACTUAL</span>
            {getRankedPlayers().map((p, i) => (
              <div key={i} style={S.cardPlayer}>
                <span style={S.rankNum}>{i + 1}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: 16 }}>{p.name.toUpperCase()}</div>
                  <div style={{ fontSize: 10, color: "#666", letterSpacing: 1 }}>MATRÍCULA: {p.mat}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 24, fontWeight: 900, color: "#FFD700" }}>{p.totalPts}</div>
                  <div style={{ fontSize: 8, color: "#444" }}>PTS</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ textAlign: "center", marginBottom: 30 }}>
            {!isAdmin ? 
              <button onClick={() => { if(prompt("PIN ADMIN:") === "1234") setIsAdmin(true); }} style={S.btnAdmin}>MODO ADMINISTRADOR</button> :
              <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
                <button onClick={() => setView("add_player")} style={S.btnAdmin}>+ JUGADOR</button>
                <button onClick={() => setIsAdmin(false)} style={S.btnAdmin}>SALIR ADMIN</button>
              </div>
            }
          </div>

          <div style={S.footer}>
            <button onClick={() => setView("setup")} style={S.btnMenu}>⛳ CARGAR TARJETA</button>
            <button onClick={() => setView("history")} style={S.btnMenu}>⛳ VER HISTORIAL</button>
            <button onClick={() => setView("gira")} style={S.btnMenu}>⛳ MODO GIRA</button>
          </div>
        </>
      )}

      {/* Otras vistas se mantienen igual pero con estilos corregidos */}
      {view === "add_player" && <AddView onBack={() => setView("home")} db={db} />}
      {view === "setup" && <SetupView setup={setup} setSetup={setSetup} players={players} onNext={() => setView("live")} onBack={() => setView("home")} />}
      {view === "live" && <LiveView setup={setup} onSave={async (d) => { await addDoc(collection(db, "scores"), d); setView("home"); }} onBack={() => setView("home")} />}
    </div>
  );
}

// ─── COMPONENTES DE APOYO ────────────────────
function AddView({ onBack, db }) {
  const [f, setF] = useState({ name: "", mat: "" });
  return (
    <div style={S.container}>
      <button onClick={onBack} style={S.back}>← VOLVER</button>
      <h2>NUEVO JUGADOR</h2>
      <input style={S.input} placeholder="Nombre Completo" onChange={e => setF({...f, name: e.target.value})} />
      <input style={S.input} placeholder="Matrícula" onChange={e => setF({...f, mat: e.target.value})} />
      <button style={S.btnPrimary} onClick={async () => { await addDoc(collection(db, "players"), f); onBack(); }}>GUARDAR</button>
    </div>
  );
}

function SetupView({ setup, setSetup, players, onNext, onBack }) {
  return (
    <div style={S.container}>
      <button onClick={onBack} style={S.back}>← CANCELAR</button>
      <h2>CONFIGURAR VUELTA</h2>
      <select style={S.input} onChange={e => setSetup({...setup, playerId: e.target.value})}>
        <option value="">¿Quién sos?</option>
        {players.map((p, i) => <option key={i} value={p.id || p.name}>{p.name}</option>)}
      </select>
      <input type="number" style={S.input} placeholder="Handicap de juego" onChange={e => setSetup({...setup, hcp: e.target.value})} />
      <button style={S.btnPrimary} onClick={onNext}>SIGUIENTE</button>
    </div>
  );
}

function LiveView({ setup, onSave, onBack }) {
  const [holes, setHoles] = useState(Array(18).fill(""));
  const [extra, setExtra] = useState({ longDrive: false, bestApproach: false });
  const gross = holes.reduce((a, b) => a + (parseInt(b) || 0), 0);
  
  return (
    <div style={S.container}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
        <button onClick={onBack} style={S.back}>SALIR</button>
        <div style={{ textAlign: "right" }}>GROSS: <span style={{ color: "#FFD700" }}>{gross}</span></div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 5, marginBottom: 20 }}>
        {holes.map((h, i) => (
          <input key={i} type="number" placeholder={i+1} style={{...S.input, padding: 8, textAlign: "center", marginBottom: 0}} value={h} onChange={e => {
            const n = [...holes]; n[i] = e.target.value; setHoles(n);
          }} />
        ))}
      </div>
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <button onClick={() => setExtra({...extra, longDrive: !extra.longDrive})} style={{ ...S.btnExtra, backgroundColor: extra.longDrive ? "#008800" : "#222" }}>LONG DRIVE</button>
        <button onClick={() => setExtra({...extra, bestApproach: !extra.bestApproach})} style={{ ...S.btnExtra, backgroundColor: extra.bestApproach ? "#008800" : "#222" }}>APPROACH</button>
      </div>
      <button style={S.btnPrimary} onClick={() => onSave({...setup, holes, grossScore: gross, ...extra})}>FINALIZAR TARJETA</button>
    </div>
  );
}

// ─── ESTILOS ─────────────────────────────────
const S = {
  container: { maxWidth: 450, margin: "0 auto", padding: "20px", backgroundColor: "#000", minHeight: "100vh", color: "white", fontFamily: "sans-serif" },
  label: { fontSize: 10, letterSpacing: 3, color: "#444", fontWeight: 900, marginBottom: 15, display: "block" },
  cardPlayer: { display: "flex", alignItems: "center", padding: "18px 0", borderBottom: "1px solid #151515" },
  rankNum: { width: 40, fontSize: 20, fontWeight: 900, color: "#333" },
  footer: { display: "flex", flexDirection: "column", gap: 10 },
  btnMenu: { backgroundColor: "#fff", color: "#000", border: "none", padding: "14px", borderRadius: 10, fontWeight: 900, cursor: "pointer", transform: "scale(0.85)", textTransform: "uppercase", letterSpacing: 1 },
  btnPrimary: { backgroundColor: "#FFD700", color: "#000", border: "none", padding: 18, borderRadius: 10, fontWeight: 900, width: "100%", marginTop: 10 },
  input: { width: "100%", padding: 15, marginBottom: 10, borderRadius: 10, border: "1px solid #222", backgroundColor: "#111", color: "white" },
  back: { background: "none", color: "#444", border: "none", fontWeight: 800, cursor: "pointer" },
  btnAdmin: { background: "none", border: "1px solid #222", color: "#444", padding: "8px 15px", borderRadius: 6, fontSize: 10, fontWeight: 800 },
  btnExtra: { flex: 1, padding: 12, border: "none", borderRadius: 8, color: "white", fontWeight: 800, fontSize: 10 }
};
