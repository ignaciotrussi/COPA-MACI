import React, { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy } from "firebase/firestore";

// ─── CONFIGURACIÓN FIREBASE (Cargá esto en Vercel Settings) ──────────────────
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

// ─── LOGO SVG ────────────────────────────────────────────────────────────────
function LogoSVG({ size = 48 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      <circle cx="100" cy="100" r="90" stroke="white" strokeWidth="14" fill="none" />
      <path d="M 158 100 A 58 58 0 1 0 142 148" stroke="white" strokeWidth="14" fill="none" strokeLinecap="round" />
      <path d="M 58 155 L 58 90 L 100 128 L 142 90 L 142 155" stroke="white" strokeWidth="14" fill="none" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// ─── DATOS CONSTANTES ────────────────────────────────────────────────────────
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

const MONTHS = [
  { id:"m01", label:"Marzo" }, { id:"m02", label:"Abril" }, { id:"m03", label:"Mayo" },
  { id:"m04", label:"Junio" }, { id:"m05", label:"Julio" }, { id:"m06", label:"Agosto" },
  { id:"m07", label:"Septiembre" }, { id:"m08", label:"Octubre" }
];

// ─── ESTILOS ─────────────────────────────────────────────────────────────────
const S = {
  card: { background:"#0a0a0a", border:"1px solid #1a1a1a", borderRadius:8, padding: "15px", marginBottom: "10px" },
  label: { fontSize:10, color:"#444", letterSpacing:2, textTransform:"uppercase", display:"block", marginBottom: 5 },
  pos: { width:30, height:30, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800 }
};

// ─── COMPONENTE PRINCIPAL ────────────────────────────────────────────────────
export default function App() {
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);

  // Escuchar cambios en Firebase en tiempo real
  useEffect(() => {
    const q = query(collection(db, "scores"), orderBy("netScore", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setScores(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return <div style={{color:"white", textAlign:"center", marginTop:50}}>Cargando Copa Maci...</div>;

  return (
    <div style={{ maxWidth: 500, margin: "0 auto", padding: 20, backgroundColor: "#000", minHeight: "100vh", color: "white", fontFamily: "sans-serif" }}>
      <header style={{ textAlign: "center", marginBottom: 30 }}>
        <LogoSVG size={80} />
        <h1 style={{ letterSpacing: 4, fontSize: 32, margin: "10px 0 0" }}>COPA MACI</h1>
        <p style={{ color: "#444", fontSize: 12 }}>TEMPORADA 2026</p>
      </header>

      <section>
        <h2 style={S.label}>Leaderboard General</h2>
        {PLAYERS.map((player, index) => {
            const playerScores = scores.filter(s => s.playerId === player.id);
            const totalPoints = playerScores.length * 10; // Ejemplo simple de puntos
            return (
                <div key={player.id} style={S.card}>
                    <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
                        <div style={{ ...S.pos, background: index === 0 ? "#FFD700" : "#222", color: index === 0 ? "#000" : "#fff" }}>{index + 1}</div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: "bold" }}>{player.name}</div>
                            <div style={{ fontSize: 12, color: "#666" }}>Mat: {player.mat}</div>
                        </div>
                        <div style={{ fontSize: 24, fontWeight: 900 }}>{totalPoints}</div>
                    </div>
                </div>
            );
        })}
      </section>
    </div>
  );
}
