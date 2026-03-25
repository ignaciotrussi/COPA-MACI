import React, { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, doc, updateDoc } from "firebase/firestore";

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

// ─── DATOS CONSTANTES ────────────────────────
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

const COURSES = ["Hacoaj", "Jockey Club", "Los Lagartos", "Hindú Club", "CASI", "Otro"];
const TEES = ["Blanco", "Negro", "Amarillo", "Azul", "Rojo"];

// ─── LOGO SVG ────────────────────────────────
function LogoSVG({ size = 60 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      <circle cx="100" cy="100" r="90" stroke="white" strokeWidth="14" />
      <path d="M 58 155 L 58 90 L 100 128 L 142 90 L 142 155" stroke="white" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── APP PRINCIPAL ───────────────────────────
export default function App() {
  const [view, setView] = useState("home"); // home, ranking, setup, wizard
  const [scores, setScores] = useState([]);
  const [setup, setSetup] = useState({ playerId: "", course: "Hacoaj", tee: "Blanco", hcp: "" });

  useEffect(() => {
    const q = query(collection(db, "scores"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setScores(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  return (
    <div style={{ maxWidth: 500, margin: "0 auto", padding: "20px", backgroundColor: "#000", minHeight: "100vh", color: "#fff", fontFamily: "'Barlow Condensed', sans-serif" }}>
      
      {/* HEADER SIEMPRE PRESENTE */}
      <header style={{ textAlign: "center", marginBottom: 30 }}>
        <LogoSVG />
        <h1 style={{ letterSpacing: 6, margin: "10px 0 0", fontSize: 28 }}>COPA MACI</h1>
      </header>

      {view === "home" && (
        <>
          <div style={{ marginBottom: 20 }}>
            <span style={{ fontSize: 10, color: "#444", letterSpacing: 2 }}>LISTA DE JUGADORES</span>
            <div style={{ marginTop: 10 }}>
              {PLAYERS.map(p => (
                <div key={p.id} style={{ display: "flex", alignItems: "center", padding: "12px 0", borderBottom: "1px solid #111" }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#111", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, marginRight: 12, border: "1px solid #222" }}>{p.av}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{p.name}</div>
                    <div style={{ fontSize: 10, color: "#444" }}>MAT: {p.mat}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div style={{ position: "sticky", bottom: 20, display: "flex", flexDirection: "column", gap: 10 }}>
            <button onClick={() => setView("ranking")} style={btnPrimary}>VER RANKING COPA</button>
            <button onClick={() => setView("setup")} style={btnSecondary}>+ NUEVO TORNEO / CARGAR</button>
          </div>
        </>
      )}

      {view === "ranking" && (
        <div>
          <button onClick={() => setView("home")} style={{ color: "#555", background: "none", border: "none", marginBottom: 15 }}>← VOLVER</button>
          <h2>RANKING ACUMULADO</h2>
          {/* Aquí iría la lógica de puntos que definamos luego */}
          <p style={{ color: "#444" }}>Próximamente: Tabla de puntos históricos.</p>
        </div>
      )}

      {view === "setup" && (
        <div>
          <button onClick={() => setView("home")} style={{ color: "#555", background: "none", border: "none", marginBottom: 15 }}>← CANCELAR</button>
          <h2 style={{ letterSpacing: 2 }}>CONFIGURAR PARTIDA</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
            <label style={lbl}>Elegir Jugador
              <select style={inpt} onChange={e => setSetup({...setup, playerId: e.target.value})}>
                <option value="">Seleccioná...</option>
                {PLAYERS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
            <label style={lbl}>Elegir Cancha
              <select style={inpt} onChange={e => setSetup({...setup, course: e.target.value})}>
                {COURSES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <div style={{ display: "flex", gap: 10 }}>
              <label style={{ ...lbl, flex: 1 }}>Tee de Salida
                <select style={inpt} onChange={e => setSetup({...setup, tee: e.target.value})}>
                  {TEES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </label>
              <label style={{ ...lbl, flex: 1 }}>Hándicap Juego
                <input type="number" style={inpt} placeholder="0" onChange={e => setSetup({...setup, hcp: e.target.value})} />
              </label>
            </div>
            <button onClick={() => setView("wizard")} disabled={!setup.playerId} style={{ ...btnPrimary, marginTop: 20 }}>CARGAR TARJETA ONLINE</button>
          </div>
        </div>
      )}

      {view === "wizard" && (
        <ScorecardOnline 
          setup={setup} 
          scores={scores} 
          onSave={async (data) => {
            await addDoc(collection(db, "scores"), { ...data, createdAt: new Date() });
            setView("home");
          }} 
        />
      )}
    </div>
  );
}

// ─── COMPONENTE TARJETA ONLINE ────────────────
function ScorecardOnline({ setup, scores, onSave }) {
  const [holes, setHoles] = useState(Array(18).fill(""));
  
  const gross = holes.reduce((a, b) => a + (parseInt(b) || 0), 0);
  const net = gross - (parseInt(setup.hcp) || 0);

  return (
    <div>
      <div style={{ background: "#111", padding: 15, borderRadius: 10, marginBottom: 20, border: "1px solid #222" }}>
        <div style={{ fontWeight: 900, fontSize: 18 }}>{PLAYERS.find(p => p.id === setup.playerId)?.name}</div>
        <div style={{ fontSize: 11, color: "#555" }}>{setup.course} · Salida {setup.tee} · Hcp {setup.hcp}</div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, borderTop: "1px solid #222", paddingTop: 10 }}>
          <span>GROSS: {gross}</span>
          <span style={{ color: "#FFD700" }}>NETO: {net}</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 5, marginBottom: 20 }}>
        {holes.map((h, i) => (
          <div key={i}>
            <div style={{ fontSize: 8, color: "#444", textAlign: "center" }}>H{i+1}</div>
            <input 
              type="number" 
              style={{ ...inpt, padding: 8, fontSize: 14, textAlign: "center" }} 
              value={h} 
              onChange={e => {
                const newHoles = [...holes];
                newHoles[i] = e.target.value;
                setHoles(newHoles);
              }}
            />
          </div>
        ))}
      </div>

      {/* VER CÓMO VAN LOS DEMÁS (Live Leaderboard) */}
      <div style={{ marginBottom: 20 }}>
        <span style={lbl}>Scores del día en vivo</span>
        {scores.filter(s => s.course === setup.course).map(s => (
          <div key={s.id} style={{ fontSize: 12, padding: "5px 0", borderBottom: "1px solid #111", display: "flex", justifyContent: "space-between" }}>
            <span>{PLAYERS.find(p => p.id === s.playerId)?.name}</span>
            <span style={{ fontWeight: 900 }}>{s.netScore}</span>
          </div>
        ))}
      </div>

      <button onClick={() => onSave({ ...setup, holes, gross, netScore: net })} style={btnPrimary}>GUARDAR Y CERRAR TARJETA</button>
    </div>
  );
}

// ─── ESTILOS REUTILIZABLES ────────────────────
const btnPrimary = { background: "#fff", color: "#000", border: "none", padding: "16px", fontWeight: 900, borderRadius: 8, cursor: "pointer", fontSize: 14, letterSpacing: 1 };
const btnSecondary = { background: "#111", color: "#fff", border: "1px solid #333", padding: "16px", fontWeight: 900, borderRadius: 8, cursor: "pointer", fontSize: 14, letterSpacing: 1 };
const inpt = { width: "100%", padding: 12, background: "#111", color: "#fff", border: "1px solid #333", borderRadius: 8, fontSize: 16, boxSizing: "border-box" };
const lbl = { fontSize: 10, color: "#444", letterSpacing: 2, textTransform: "uppercase", marginBottom: 5, display: "block" };
