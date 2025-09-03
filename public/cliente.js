const newBtn = document.getElementById("newBtn");
const editor = document.getElementById("editor");

let ws;
let boardId;
let typingTimeout;
const RELAY_MS = 250; // puedes ajustar 200/300

// Determinar basePath según entorno
const basePath = location.hostname === "localhost" ? "" : "/shareboard";

// Crear un nuevo board
newBtn.onclick = async () => {
    try {
        const res = await fetch(`${basePath}/api/new-board`, { method: "POST" });
        const json = await res.json();
        boardId = json.id;

        // Actualizar URL correctamente
        history.replaceState(null, "", `${basePath}/${boardId}`);
        connectWebSocket();
    } catch (e) {
        alert("No se pudo crear el board");
        console.error(e);
    }
};

function connectWebSocket() {
    if (!boardId) return alert("Crea un board primero.");

    const proto = location.protocol === "https:" ? "wss" : "ws";
    ws = new WebSocket(`${proto}://${location.host}${basePath}/ws/${boardId}`);

    ws.onopen = () => console.log("🔌 WS conectado");

    ws.onmessage = (event) => {
        editor.value = event.data;
    };

    ws.onclose = (e) => {
        console.log("WS desconectado:", e.reason || e.code);
        // Reconectar automáticamente
        setTimeout(() => {
            if (document.visibilityState !== "hidden") connectWebSocket();
        }, 1000);
    };

    ws.onerror = (err) => console.error("WS error:", err);
}

// Debounce para no saturar WS
editor.addEventListener("input", () => {
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(editor.value);
        }
    }, RELAY_MS);
});

// Cargar según URL actual
window.addEventListener("load", () => {
    const pathSegments = location.pathname.split("/").filter(Boolean);

    if (basePath && pathSegments[0] === basePath.replace("/", "") && pathSegments[1]) {
        // Producción: /shareboard/:id
        boardId = pathSegments[1];
        connectWebSocket();
    } else if (!basePath && pathSegments[0]) {
        // Localhost: /:id
        boardId = pathSegments[0];
        connectWebSocket();
    }
});
