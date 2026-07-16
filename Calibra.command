#!/bin/bash
# Calibra — lanzador de doble clic para Mac.
# Colócalo en la carpeta del proyecto y ábrelo desde el Finder.

# Ir a la carpeta donde vive este archivo (la raíz del proyecto).
cd "$(dirname "$0")" || exit 1

clear
echo "───────────────────────────────"
echo "   Calibra"
echo "───────────────────────────────"
echo ""

# 1) Verificar que Node.js esté instalado.
if ! command -v node >/dev/null 2>&1; then
  echo "❌ Falta Node.js (se instala una sola vez)."
  echo ""
  echo "   Te abro la página de descarga. Instala la versión LTS,"
  echo "   luego vuelve a abrir este archivo."
  echo ""
  open "https://nodejs.org/es/download"
  echo "Presiona Enter para cerrar."
  read -r _
  exit 1
fi

# 2) Instalar dependencias la primera vez.
if [ ! -d "node_modules" ]; then
  echo "⏳ Preparando por primera vez (esto tarda un par de minutos)…"
  echo ""
  npm install || { echo "❌ Falló la instalación."; echo "Presiona Enter para cerrar."; read -r _; exit 1; }
  echo ""
fi

# 3) Abrir el navegador en cuanto el server responda.
(
  for _ in $(seq 1 60); do
    if curl -sf -o /dev/null http://localhost:3000/ 2>/dev/null; then
      open "http://localhost:3000"
      break
    fi
    sleep 1
  done
) &

# 4) Arrancar la app. Esta ventana queda abierta mientras la usas.
echo "✅ Abriendo Calibra en tu navegador…"
echo ""
echo "   👉 Deja ESTA ventana abierta mientras trabajas."
echo "   👉 Para cerrar la app: cierra esta ventana o presiona Ctrl+C."
echo ""
npm run dev
