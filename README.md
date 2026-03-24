# Copa Maci 2026 🏌️

App de seguimiento del campeonato anual. Ranking en tiempo real, carga de tarjetas online, estadísticas por jugador.

---

## Cómo publicarla (paso a paso)

### PASO 1 — Crear base de datos gratuita en Firebase

1. Entrá a **https://console.firebase.google.com**
2. Hacé click en **"Crear un proyecto"**
3. Nombre: `copa-maci` → Next → Next → Crear proyecto
4. En el menú izquierdo, click en **Firestore Database**
5. Click **"Crear base de datos"** → elegí **"Modo de prueba"** → Next → Habilitar
6. En el menú izquierdo, click en el ícono ⚙️ (Configuración del proyecto)
7. En la pestaña **"General"**, bajá hasta **"Tus apps"** → click en el ícono `</>`(Web)
8. Nombre: `copa-maci` → Registrar app
9. Te van a aparecer los datos de configuración. Copiá estos valores:
   ```
   apiKey
   authDomain
   projectId
   storageBucket
   messagingSenderId
   appId
   ```

### PASO 2 — Subir el código a GitHub

1. Creá una cuenta gratis en **https://github.com**
2. Click en **"New repository"** → nombre: `copa-maci` → Create repository
3. Bajate **GitHub Desktop** (https://desktop.github.com) o usá la web
4. Subí la carpeta `copa-maci` a ese repositorio

### PASO 3 — Publicar en Vercel

1. Entrá a **https://vercel.com** y creá una cuenta gratis (podés entrar con GitHub)
2. Click en **"Add New Project"**
3. Importá el repositorio `copa-maci`
4. Antes de hacer Deploy, click en **"Environment Variables"** y agregá cada variable:

   | Nombre | Valor |
   |--------|-------|
   | `VITE_FIREBASE_API_KEY` | (el valor de Firebase) |
   | `VITE_FIREBASE_AUTH_DOMAIN` | (el valor de Firebase) |
   | `VITE_FIREBASE_PROJECT_ID` | (el valor de Firebase) |
   | `VITE_FIREBASE_STORAGE_BUCKET` | (el valor de Firebase) |
   | `VITE_FIREBASE_MESSAGING_SENDER_ID` | (el valor de Firebase) |
   | `VITE_FIREBASE_APP_ID` | (el valor de Firebase) |

5. Click en **Deploy**
6. En 2 minutos tenés una URL tipo `copa-maci.vercel.app`

### PASO 4 — Compartir con los jugadores

Mandá la URL por WhatsApp. Desde el celular pueden:
- Ver el leaderboard en tiempo real
- Cargar su tarjeta hoyo por hoyo durante la ronda
- Ver sus estadísticas

---

## Desarrollo local (opcional)

```bash
npm install
cp .env.example .env.local
# completar .env.local con los datos de Firebase
npm run dev
```

---

## Notas

- Firebase Firestore en modo gratuito (Spark) soporta hasta 50.000 lecturas/día — más que suficiente para el torneo
- Los datos persisten en la nube y todos los jugadores ven lo mismo en tiempo real
- Si no configurás Firebase, la app funciona igual pero con localStorage (solo local, no compartido)
