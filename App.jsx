import React, { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, doc, deleteDoc, updateDoc } from "firebase/firestore";

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
const PTS_TABLE = [10, 8, 6, 5, 4, 3, 2, 2, 2, 2, 2]; 
const ADMIN_PIN = "1234"; 

// ─── APP PRINCIPAL ───────────────────────────
export default function App() {
  const [view, setView] = useState("home"); 
  const [scores, setScores] = useState([]);
  const [players, setPlayers] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [setup, setSetup] = useState({ 
    date: new Date().toISOString().split('T')[0], 
    playerId: "", hcp: "", course: "Hacoaj", customCourse: "", tee: "Blanco" 
  });

  useEffect(() => {
    const qS = query(collection(db, "scores"), orderBy("date", "desc"));
    const unsubS = onSnapshot(qS, (snap) => setScores(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const qP = query(collection(db, "players"), orderBy("name", "asc"));
    const unsubP = onSnapshot(qP, (snap) => setPlayers(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => { unsubS(); unsubP(); };
  }, []);

  const getRankedPlayers = () => {
    return players.map(p => {
      let totalPts = 0;
      const months = [...new Set(scores.map(s => s.date.substring(0, 7)))];
      months.forEach(m => {
        const mScores = scores.filter(s => s.date.substring(0, 7) === m);
        const bests = players.map(pl => {
          const pScores = mScores.filter(s => s.playerId === pl.id).sort((a, b) => a.netScore - b.netScore || a.grossScore - b.grossScore);
          const pBest = pScores[0];
          return { pId: pl.id, net: pBest ? pBest.netScore : 999, gross: pBest ? pBest.grossScore : 999 };
        }).sort((a, b) => a.net - b.net || a.gross - b.gross);
        const pos = bests.findIndex(b => b.pId === p.id);
        if (pos !== -1 && bests[pos].net < 999) totalPts += (PTS_TABLE[pos] || 0);
      });
      // Sumar extras
      scores.filter(s => s.playerId === p.id).forEach(s => {
        if (s.longDrive) totalPts += 1;
        if (s.bestApproach) totalPts += 1;
      });
      return { ...p, totalPts };
    }).sort((a, b) => b.totalPts - a.totalPts);
  };

  return (
    <div style={S.container}>
      <header style={S.header}>
        <div style={{fontSize: 50}}>⛳</div>
        <h1 style={{ letterSpacing: 6, margin: "10px 0 0" }}>COPA MACI</h1>
      </header>

      {view === "home" && (
        <>
          <div style={{ marginBottom: 25 }}>
            <span style={S.label}>RANKING COPA MACI</span>
            {getRankedPlayers().map((p, i) => (
              <div key={p.id} style={S.cardPlayer}>
                <span style={S.rankNumber}>{i + 1}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{p.name}</div>
                  <div style={{ fontSize: 10, color: "#666" }}>MAT: {p.mat}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 22, fontWeight: 900 }}>{p.totalPts}</div>
                  <div style={{ fontSize: 8, color: "#444" }}>PTS</div>
                </div>
              </div>
            ))}
          </div>
          <div style={S.adminSection}>
             {!isAdmin ? 
              <button onClick={() => { const p = prompt("PIN:"); if(p===ADMIN_PIN) setIsAdmin(true); }} style={S.btnAdmin}>ADMIN</button> :
              <button onClick={() => setView("add_player")} style={S.btnAdmin}>+ AGREGAR JUGADOR</button>
             }
          </div>
          <div style={S.navGrid}>
            <button onClick={() => setView("setup")} style={S.btnMenu}>⛳ CARGAR TARJETA</button>
            <button onClick={() => setView("history")} style={S.btnMenu}>⛳ VER HISTORIAL</button>
            <button onClick={() => setView("gira")} style={S.btnMenu}>⛳ MODO GIRA</button>
          </div>
        </>
      )}

      {view === "setup" && <SetupView setup={setup} setSetup={setSetup} players={players} onNext={() => setView("live")} onBack={() => setView("home")} />}
      {view === "live" && <LiveScoring setup={setup} onSave={async (d) => { await addDoc(collection(db, "scores"), {...d, createdAt: new Date()}); setView("home"); }} onBack={() => setView("home")} />}
      {view === "history" && <HistoryView scores={scores} players={players} isAdmin={isAdmin} db={db} onBack={() => setView("home")} />}
      {view === "add_player" && <AddPlayerView onBack={() => setView("home")} db={db} />}
      {view === "gira" && <GiraView players={players} onSave={async (d) => { await addDoc(collection(db, "scores"), {...d, createdAt: new Date()}); setView("home"); }} onBack={() => setView("home")} />}
    </div>
  );
}

// ─── VISTAS SECUNDARIAS ──────────────────────

function SetupView({ setup, setSetup, players, onNext, onBack }) {
  const COURSES = ["Hacoaj", "Jockey Club", "Los Lagartos", "Otro"];
  return (
    <div style={S.view}>
      <button onClick={onBack} style={S.back}>← VOLVER</button>
      <h2 style={{ letterSpacing: 2 }}>NUEVA TARJETA</h2>
      <select style={S.input} value={setup.course} onChange={e => setSetup({...setup, course: e.target.value})}>
        {COURSES.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
      {setup.course === "Otro" && <input style={S.input} placeholder="Nombre de la cancha" onChange={e => setSetup({...setup, customCourse: e.target.value})} />}
      <select style={S.input} onChange={e => setSetup({...setup, playerId: e.target.value})}>
        <option value="">Seleccionar Jugador...</option>
        {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <input type="number" style={S.input} placeholder="HCP de Juego" onChange={e => setSetup({...setup, hcp: e.target.value})} />
      <button onClick={onNext} disabled={!setup.playerId} style={S.btnPrimary}>INICIAR HOYO 1</button>
    </div>
  );
}

function LiveScoring({ setup, isGira = false, onSave, onBack }) {
  const [holes, setHoles] = useState(Array(18).fill(""));
  const [extra, setExtra] = useState({ longDrive: false, bestApproach: false });
  const [matchRes, setMatchRes] = useState("Ganó");
  const gross = holes.reduce((a, b) => a + (parseInt(b) || 0), 0);
  const net = gross - (parseInt(setup.hcp) || 0);

  return (
    <div style={S.view}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
        <button onClick={onBack} style={S.back}>SALIR</button>
        <div style={{ textAlign: "right", fontSize: 12, fontWeight: 900 }}>G: {gross} | <span style={{color:"#FFD700"}}>N: {net}</span></div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 5, marginBottom: 20 }}>
        {holes.map((h, i) => (
          <input key={i} type="number" placeholder={i+1} style={{...S.input, padding: 8, textAlign: "center", marginBottom:0}} value={h} onChange={e => {
            const n = [...holes]; n[i] = e.target.value; setHoles(n);
          }} />
        ))}
      </div>
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <button onClick={() => setExtra({...extra, longDrive: !extra.longDrive})} style={{ ...S.btnExtra, backgroundColor: extra.longDrive ? "#008800" : "#222" }}>🚀 LONG DRIVE</button>
        <button onClick={() => setExtra({...extra, bestApproach: !extra.bestApproach})} style={{ ...S.btnExtra, backgroundColor: extra.bestApproach ? "#008800" : "#222" }}>🎯 APPROACH</button>
      </div>
      {isGira && (
        <div style={{ marginBottom: 15 }}>
          <select style={S.input} value={matchRes} onChange={e => setMatchRes(e.target.value)}>
            <option value="Ganó">Ganó (1 pt)</option>
            <option value="Empató">Empató (0.5 pts)</option>
            <option value="Perdió">Perdió (0 pts)</option>
          </select>
        </div>
      )}
      <button onClick={() => onSave({ ...setup, holes, grossScore: gross, netScore: net, ...extra, type: isGira ? "gira" : "anual", giraPts: isGira ? (matchRes==="Ganó"?1:matchRes==="Empató"?0.5:0) : 0 })} style={S.btnPrimary}>GUARDAR TODO</button>
    </div>
  );
}

function HistoryView({ scores, players, isAdmin, db, onBack }) {
  const [expandedId, setExpandedId] = useState(null);
  const [editHoles, setEditHoles] = useState([]);

  const handleUpdate = async (s) => {
    const gross = editHoles.reduce((a, b) => a + (parseInt(b) || 0), 0);
    await updateDoc(doc(db, "scores", s.id), { holes: editHoles, grossScore: gross, netScore: gross - s.hcp });
    setExpandedId(null);
  };

  return (
    <div style={S.view}>
      <button onClick={onBack} style={S.back}>← VOLVER</button>
      {scores.map(s => (
        <div key={s.id} style={S.cardHistory}>
          <div onClick={() => { setExpandedId(expandedId === s.id ? null : s.id); setEditHoles(s.holes || Array(18).fill("")); }} style={{cursor:"pointer"}}>
            <div style={{display:"flex", justifyContent:"space-between", fontWeight:800}}>
               <span>{players.find(p => p.id === s.playerId)?.name}</span>
               <span style={{fontSize:10, color:"#555"}}>{s.date}</span>
            </div>
            <div style={{fontSize:11, color:"#FFD700"}}>Neto: {s.netScore} | {s.course}</div>
          </div>
          {expandedId === s.id && (
            <div style={{marginTop:10, borderTop:"1px solid #333", paddingTop:10}}>
               <div style={{display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:3}}>
                 {editHoles.map((h, i) => (
                   isAdmin ? <input key={i} type="number" style={S.inputHole} value={h} onChange={e => { const n = [...editHoles]; n[i] = e.target.value; setEditHoles(n); }} />
                   : <div key={i} style={{textAlign:"center", fontSize:12}}>{h}</div>
                 ))}
               </div>
               {isAdmin && <div style={{display:"flex", gap:5, marginTop:10}}>
                  <button onClick={() => handleUpdate(s)} style={S.btnSaveFull}>OK</button>
                  <button onClick={() => deleteDoc(doc(db, "scores", s.id))} style={S.btnDeleteFull}>BORRAR</button>
               </div>}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function GiraView({ players, onSave, onBack }) {
  return (
    <div style={S.view}>
      <button onClick={onBack} style={S.back}>← VOLVER</button>
      <h2 style={{color:"#FFD700"}}>MODO GIRA</h2>
      <p style={{fontSize:12}}>Cargar tarjeta como GIRA para sumar puntos de equipo.</p>
      {/* Reusa el mismo setup pero marca type como Gira */}
      <button onClick={() => alert("Usa 'Cargar Tarjeta' y marcá el resultado de Gira al final.")} style={S.btnPrimary}>ENTENDIDO</button>
    </div>
  );
}

function AddPlayerView({ onBack, db }) {
  const [form, setForm] = useState({ name: "", mat: "" });
  return (
    <div style={S.view}>
      <input style={S.input} placeholder="Nombre" onChange={e => setForm({...form, name: e.target.value})} />
      <input style={S.input} placeholder="Matrícula" onChange={e => setForm({...form, mat: e.target.value})} />
      <button onClick={async () => { await addDoc(collection(db, "players"), form); onBack(); }} style={S.btnPrimary}>GUARDAR</button>
    </div>
  );
}

// ─── ESTILOS ─────────────────────────────────
const S = {
  container: { maxWidth: 500, margin: "0 auto", padding: 20, backgroundColor: "#000", minHeight: "100vh", color: "white", fontFamily: "sans-serif" },
  header: { textAlign: "center", marginBottom: 30 },
  cardPlayer: { display: "flex", alignItems: "center", padding: "15px 0", borderBottom: "1px solid #111" },
  rankNumber: { fontSize: 20, fontWeight: 900, color: "#FFD700", width: 35 },
  label: { fontSize: 10, letterSpacing: 2, color: "#444", fontWeight: 800, display: "block", marginBottom: 10 },
  navGrid: { display: "flex", flexDirection: "column", gap: 10, marginTop: 20 },
  btnMenu: { backgroundColor: "#fff", color: "#000", border: "none", padding: "15px", borderRadius: 8, fontWeight: 900, cursor: "pointer", transform: "scale(0.85)", display: "flex", justifyContent: "center", alignItems: "center", gap: 10 },
  btnPrimary: { backgroundColor: "#FFD700", color: "#000", border: "none", padding: 15, borderRadius: 8, fontWeight: 800, width: "100%", cursor: "pointer" },
  input: { width: "100%", padding: 12, marginBottom: 10, borderRadius: 8, border: "1px solid #333", backgroundColor: "#111", color: "white" },
  back: { background: "none", color: "#FFD700", border: "none", cursor: "pointer", fontWeight: 800, marginBottom: 10 },
  cardHistory: { backgroundColor: "#111", padding: 15, borderRadius: 10, marginBottom: 10, border: "1px solid #222" },
  btnAdmin: { background: "none", color: "#333", border: "1px solid #222", padding: "5px 10px", fontSize: 10, borderRadius: 4, cursor: "pointer" },
  adminSection: { textAlign: "center", marginBottom: 20 },
  btnExtra: { flex: 1, padding: 12, borderRadius: 8, border: "none", color: "white", fontSize: 10, fontWeight: 800, cursor: "pointer" },
  inputHole: { width: "100%", padding: 5, backgroundColor: "#000", color: "#fff", border: "1px solid #333", textAlign: "center" },
  btnSaveFull: { flex: 1, backgroundColor: "#28a745", border: "none", color: "#fff", padding: 8, borderRadius: 4, fontSize: 10 },
  btnDeleteFull: { flex: 1, backgroundColor: "#dc3545", border: "none", color: "#fff", padding: 8, borderRadius: 4, fontSize: 10 },
  view: { display: "flex", flexDirection: "column" }
};
