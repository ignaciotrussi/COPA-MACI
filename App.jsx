import React, { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, doc, deleteDoc, updateDoc } from "firebase/firestore";

// --- CONFIGURACIÓN FIREBASE (Reemplazar con tus variables) ---
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

// --- CONSTANTES ---
const PTS_TABLE = [10, 8, 6, 5, 4, 3, 2, 2, 2, 2, 2];
const ADMIN_PIN = "1234";

// Componente Logo (Imagen que enviaste)
const LogoMaci = () => (
  <div style={{ textAlign: "center", marginBottom: 20 }}>
    <img 
      src="https://i.ibb.co" // Reemplazar con tu URL de hosting de imagen o path local
      alt="COPA MACI LOGO" 
      style={{ width: 120, height: "auto" }}
    />
  </div>
);

export default function App() {
  const [view, setView] = useState("home");
  const [scores, setScores] = useState([]);
  const [players, setPlayers] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [setup, setSetup] = useState({ date: new Date().toISOString().split('T')[0], playerId: "", hcp: "", course: "Hacoaj", customCourse: "" });

  // Suscripción a Firebase
  useEffect(() => {
    const unsubS = onSnapshot(query(collection(db, "scores"), orderBy("date", "desc")), (snap) => {
      setScores(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubP = onSnapshot(query(collection(db, "players"), orderBy("name", "asc")), (snap) => {
      setPlayers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => { unsubS(); unsubP(); };
  }, []);

  // --- LÓGICA DE RANKING Y PUNTOS ---
  const getRankedPlayers = () => {
    return players.map(p => {
      let totalPts = 0;
      const months = [...new Set(scores.map(s => s.date.substring(0, 7)))];
      
      months.forEach(m => {
        const mScores = scores.filter(s => s.date.substring(0, 7) === m);
        const bests = players.map(pl => {
          const pScore = mScores.filter(s => s.playerId === pl.id)
            .sort((a, b) => a.netScore - b.netScore || a.grossScore - b.grossScore)[0]; // Desempate por mejor Gross
          return { pId: pl.id, net: pScore ? pScore.netScore : 999, gross: pScore ? pScore.grossScore : 999 };
        }).sort((a, b) => a.net - b.net || a.gross - b.gross);

        const pos = bests.findIndex(b => b.pId === p.id);
        if (pos !== -1 && bests[pos].net < 999) totalPts += (PTS_TABLE[pos] || 0);
      });

      // Sumar Long Drive y Best Approach
      scores.filter(s => s.playerId === p.id).forEach(s => {
        if (s.longDrive) totalPts += 1;
        if (s.bestApproach) totalPts += 1;
      });

      return { ...p, totalPts };
    }).sort((a, b) => b.totalPts - a.totalPts);
  };

  return (
    <div style={S.container}>
      <LogoMaci />
      <h1 style={S.title}>COPA MACI</h1>

      {view === "home" && (
        <>
          <div style={{ marginBottom: 25 }}>
            {getRankedPlayers().map((p, i) => (
              <div key={p.id} style={S.cardPlayer}>
                <span style={S.rankNum}>{i + 1}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800 }}>{p.name}</div>
                  <div style={{ fontSize: 10, color: "#666" }}>MAT: {p.mat}</div>
                </div>
                <div style={S.pointsContainer}>
                  <div style={{ fontSize: 22, fontWeight: 900 }}>{p.totalPts}</div>
                  <div style={{ fontSize: 8, color: "#444" }}>PTS</div>
                </div>
              </div>
            ))}
          </div>

          <div style={S.adminPanel}>
            {!isAdmin ? (
              <button onClick={() => { if(prompt("PIN:") === ADMIN_PIN) setIsAdmin(true); }} style={S.btnAdmin}>ADMIN</button>
            ) : (
              <button onClick={() => setView("manage_players")} style={S.btnAdmin}>GESTIONAR JUGADORES</button>
            )}
          </div>

          <div style={S.footerNav}>
            <button onClick={() => setView("setup")} style={S.btnNav}>⛳ CARGAR TARJETA</button>
            <button onClick={() => setView("history")} style={S.btnNav}>⛳ HISTORIAL</button>
            <button onClick={() => setView("gira")} style={S.btnNav}>⛳ MODO GIRA</button>
          </div>
        </>
      )}

      {/* Vistas Secundarias */}
      {view === "setup" && <SetupView setup={setup} setSetup={setSetup} players={players} onNext={() => setView("live")} onBack={() => setView("home")} />}
      {view === "live" && <LiveScoring setup={setup} onSave={async (d) => { await addDoc(collection(db, "scores"), d); setView("home"); }} onBack={() => setView("home")} />}
      {view === "history" && <HistoryView scores={scores} players={players} isAdmin={isAdmin} db={db} onBack={() => setView("home")} />}
      {view === "manage_players" && <ManagePlayers players={players} db={db} onBack={() => setView("home")} />}
      {view === "gira" && <GiraView players={players} onBack={() => setView("home")} />}
    </div>
  );
}

// --- VISTAS COMPONENTES ---

function ManagePlayers({ players, db, onBack }) {
  const [name, setName] = useState("");
  const [mat, setMat] = useState("");
  return (
    <div style={S.view}>
      <button onClick={onBack} style={S.back}>← VOLVER</button>
      <h3>AGREGAR / QUITAR JUGADOR</h3>
      <input style={S.input} placeholder="Nombre y Apellido" onChange={e => setName(e.target.value)} />
      <input style={S.input} placeholder="Matrícula" onChange={e => setMat(e.target.value)} />
      <button style={S.btnPrimary} onClick={async () => { await addDoc(collection(db, "players"), {name, mat}); onBack(); }}>AGREGAR</button>
      <div style={{ marginTop: 20 }}>
        {players.map(p => (
          <div key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #222" }}>
            <span>{p.name}</span>
            <button onClick={() => deleteDoc(doc(db, "players", p.id))} style={{ color: "red", background: "none", border: "none" }}>Quitar</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// Reutilizamos el LiveScoring ya diseñado anteriormente con Long Drive y Best Approach
function LiveScoring({ setup, isGira = false, onSave, onBack }) {
  const [holes, setHoles] = useState(Array(18).fill(""));
  const [extra, setExtra] = useState({ longDrive: false, bestApproach: false });
  const gross = holes.reduce((a, b) => a + (parseInt(b) || 0), 0);
  const net = gross - (parseInt(setup.hcp) || 0);

  return (
    <div style={S.view}>
      <button onClick={onBack} style={S.back}>SALIR</button>
      <div style={S.scoreBoard}>G: {gross} | N: {net}</div>
      <div style={S.holeGrid}>
        {holes.map((h, i) => (
          <input key={i} type="number" placeholder={i+1} style={S.inputHole} value={h} onChange={e => {
            const n = [...holes]; n[i] = e.target.value; setHoles(n);
          }} />
        ))}
      </div>
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <button onClick={() => setExtra({...extra, longDrive: !extra.longDrive})} style={{ ...S.btnExtra, backgroundColor: extra.longDrive ? "#008800" : "#222" }}>🚀 LONG DRIVE</button>
        <button onClick={() => setExtra({...extra, bestApproach: !extra.bestApproach})} style={{ ...S.btnExtra, backgroundColor: extra.bestApproach ? "#008800" : "#222" }}>🎯 APPROACH</button>
      </div>
      <button onClick={() => onSave({ ...setup, holes, grossScore: gross, netScore: net, ...extra, date: setup.date })} style={S.btnPrimary}>GUARDAR SCORE</button>
    </div>
  );
}

// Estilos finales
const S = {
  container: { maxWidth: 500, margin: "0 auto", padding: 20, backgroundColor: "#000", minHeight: "100vh", color: "#fff", fontFamily: "sans-serif" },
  title: { textAlign: "center", letterSpacing: 6, fontSize: 24, margin: "0 0 30px" },
  cardPlayer: { display: "flex", alignItems: "center", padding: "15px 12px", borderBottom: "1px solid #111", backgroundColor: "#0a0a0a", borderRadius: 8, marginBottom: 8 },
  rankNum: { width: 30, fontSize: 18, fontWeight: 900, color: "#FFD700" },
  pointsContainer: { textAlign: "right" },
  footerNav: { display: "flex", flexDirection: "column", gap: 10, marginTop: 20 },
  btnNav: { backgroundColor: "#fff", color: "#000", border: "none", padding: "12px", borderRadius: 8, fontWeight: 900, cursor: "pointer", transform: "scale(0.8)" },
  btnPrimary: { backgroundColor: "#FFD700", color: "#000", border: "none", padding: 15, borderRadius: 8, fontWeight: 800, width: "100%", cursor: "pointer" },
  input: { width: "100%", padding: 12, marginBottom: 10, borderRadius: 8, border: "1px solid #333", backgroundColor: "#111", color: "white" },
  adminPanel: { textAlign: "center", margin: "20px 0" },
  btnAdmin: { background: "none", color: "#333", border: "1px solid #222", padding: "5px 10px", borderRadius: 4, fontSize: 10 },
  holeGrid: { display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 5, marginBottom: 20 },
  inputHole: { padding: 10, textAlign: "center", backgroundColor: "#111", color: "#fff", border: "1px solid #333", borderRadius: 4 },
  btnExtra: { flex: 1, padding: 10, border: "none", borderRadius: 8, color: "#fff", fontSize: 10, fontWeight: 800 },
  scoreBoard: { fontSize: 20, fontWeight: 900, color: "#FFD700", textAlign: "right", marginBottom: 15 }
};
