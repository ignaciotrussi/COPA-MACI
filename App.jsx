import React, { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, doc, updateDoc, writeBatch } from "firebase/firestore";

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

const ADMIN_ID = "p05"; // Ignacio Trussi
const ADMIN_PIN = "1234"; // CAMBIÁ TU PIN ACÁ

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

const COURSES = {
  "Hacoaj": { pars: [4,3,5,4,3,5,4,4,4, 4,4,3,5,4,3,5,4,4] },
  "Jockey Club": { pars: [4,5,3,4,4,3,5,4,4, 4,3,5,4,4,3,5,4,4] },
  "Los Lagartos": { pars: [4,4,3,5,4,4,3,5,4, 4,4,3,5,4,4,3,5,4] },
  "Hindú Club": { pars: [4,4,4,3,5,4,4,3,4, 4,4,4,3,5,4,4,3,4] },
  "CASI": { pars: [4,3,4,5,4,3,4,5,4, 4,3,4,5,4,3,4,5,4] },
  "Otro campo": { pars: [4,4,4,3,5,4,4,3,4, 4,4,4,3,5,4,4,3,4] },
};

const TEES = ["Blanco", "Negro", "Amarillo", "Azul", "Rojo"];

// ─── ESTILOS ─────────────────────────────────
const S = {
  card: { background:"#0a0a0a", border:"1px solid #1a1a1a", borderRadius:10, padding: 15, marginBottom: 12 },
  label: { fontSize:11, color:"#555", letterSpacing:2, textTransform:"uppercase", marginBottom: 5, display: "block" },
  input: { width: "100%", padding: 12, background: "#111", color: "#fff", border: "1px solid #333", borderRadius: 6, fontSize: 16, boxSizing: "border-box" }
};

export default function App() {
  const [view, setView] = useState("login"); // "login", "leaderboard", "wizard"
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [scores, setScores] = useState([]);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    const q = query(collection(db, "scores"), orderBy("netScore", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setScores(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = (id) => {
    const selected = PLAYERS.find(p => p.id === id);
    if (id === ADMIN_ID) {
      const pin = prompt("Ingresá el PIN de Administrador:");
      if (pin === ADMIN_PIN) {
        setIsAdmin(true);
        setUser(selected);
        setView("leaderboard");
      } else {
        alert("PIN incorrecto");
      }
    } else {
      setIsAdmin(false);
      setUser(selected);
      setView("leaderboard");
    }
  };

  const closeMonth = async () => {
    if (window.confirm("¿Cerrar mes? Esto bloqueará todas las tarjetas actuales.")) {
      const batch = writeBatch(db);
      scores.forEach(s => {
        if (!s.locked) batch.update(doc(db, "scores", s.id), { locked: true });
      });
      await batch.commit();
      alert("Mes cerrado.");
    }
  };

  const handleSave = async (data) => {
    if (editingId) {
      await updateDoc(doc(db, "scores", editingId), data);
    } else {
      await addDoc(collection(db, "scores"), { ...data, locked: false, createdAt: new Date() });
    }
    setView("leaderboard");
    setEditingId(null);
  };

  if (view === "login") {
    return (
      <div style={{ maxWidth: 500, margin: "0 auto", padding: 50, textAlign: "center", backgroundColor: "#000", minHeight: "100vh", color: "white" }}>
        <h2 style={{ letterSpacing: 4 }}>COPA MACI</h2>
        <p style={{ color: "#444" }}>Seleccioná tu jugador</p>
        <select onChange={(e) => handleLogin(e.target.value)} style={S.input}>
          <option value="">-- Jugador --</option>
          {PLAYERS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 500, margin: "0 auto", padding: 20, backgroundColor: "#000", minHeight: "100vh", color: "white", fontFamily: "'Barlow Condensed', sans-serif" }}>
      {view === "leaderboard" ? (
        <>
          <header style={{ textAlign: "center", marginBottom: 20 }}>
            <h1 style={{ letterSpacing: 5, fontSize: 32, margin: 0 }}>COPA MACI</h1>
            <p style={{ color: "#555" }}>Hola, {user.name} {isAdmin && "(Admin)"}</p>
            <button onClick={() => setView("wizard")} style={{ background: "#fff", color: "#000", border: "none", padding: 12, fontWeight: 900, borderRadius: 6, width: "100%", cursor: "pointer" }}>+ CARGAR TARJETA</button>
            {isAdmin && <button onClick={closeMonth} style={{ background: "#d44", color: "#fff", border: "none", padding: 8, borderRadius: 6, width: "100%", marginTop: 10, cursor: "pointer", fontSize: 12 }}>🔒 CERRAR MES</button>}
          </header>

          <section>
            {scores.map(s => (
              <div key={s.id} onClick={() => {
                if (s.locked && !isAdmin) return alert("Mes cerrado.");
                setEditingId(s.id); setView("wizard");
              }} style={{ ...S.card, border: s.locked ? "1px solid #300" : "1px solid #222" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 18 }}>{PLAYERS.find(p => p.id === s.playerId)?.name}</div>
                    <div style={{ fontSize: 11, color: "#444" }}>{s.course} · Neto: {s.netScore} (G: {s.gross})</div>
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 900 }}>{s.netScore} {s.locked && "🔒"}</div>
                </div>
              </div>
            ))}
          </section>
        </>
      ) : (
        <Wizard onSave={handleSave} onBack={() => {setView("leaderboard"); setEditingId(null);}} initialData={scores.find(s => s.id === editingId)} />
      )}
    </div>
  );
}

function Wizard({ onSave, onBack, initialData }) {
  const [form, setForm] = useState(initialData || { playerId: "p01", course: "Hacoaj", tee: "Blanco", hcp: 0, holes: Array(18).fill(0) });
  const gross = form.holes.reduce((a, b) => a + (parseInt(b) || 0), 0);
  const net = gross - (parseInt(form.hcp) || 0);

  return (
    <div style={{ paddingBottom: 40 }}>
      <button onClick={onBack} style={{ color: "#555", background: "none", border: "none", cursor: "pointer", marginBottom: 15 }}>← VOLVER</button>
      <h2 style={{ letterSpacing: 2 }}>{initialData ? "EDITAR" : "NUEVA"} TARJETA</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
        <label style={S.label}>Jugador
          <select style={S.input} value={form.playerId} onChange={e => setForm({...form, playerId: e.target.value})}>
            {PLAYERS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <div style={{ display: "flex", gap: 10 }}>
          <label style={{ ...S.label, flex: 2 }}>Campo
            <select style={S.input} value={form.course} onChange={e => setForm({...form, course: e.target.value})}>
              {Object.keys(COURSES).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label style={{ ...S.label, flex: 1 }}>Hcp
            <input type="number" style={S.input} value={form.hcp} onChange={e => setForm({...form, hcp: e.target.value})} />
          </label>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 5 }}>
          {form.holes.map((h, i) => (
            <div key={i}><span style={{ fontSize: 9, color: "#444" }}>H{i+1}</span>
            <input type="number" style={{ ...S.input, padding: 8, fontSize: 14 }} value={h || ""} onChange={e => {
              const n = [...form.holes]; n[i] = e.target.value; setForm({...form, holes: n});
            }} /></div>
          ))}
        </div>
        <div style={{ background: "#111", padding: 15, borderRadius: 8, textAlign: "center", fontWeight: 900 }}>
          GROSS: {gross} | NETO: {net}
        </div>
        <button onClick={() => onSave({ ...form, gross, netScore: net })} style={{ background: "#fff", color: "#000", padding: 15, border: "none", fontWeight: 900, borderRadius: 6, cursor: "pointer" }}>
          GUARDAR TARJETA
        </button>
      </div>
    </div>
  );
}
