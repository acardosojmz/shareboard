const newBtn = document.getElementById("newBtn");
const editor = document.getElementById("editor");

let ws;
let boardId;
let typingTimeout;
const RELAY_MS = 250; // puedes mover a 200/300

newBtn.onclick = async () => {
    try {
        const res = await fetch("/api/new-board", { method: "POST" });
        const json = await res.json();
        boardId = json.id;
        history.replaceState(null, "", `/${boardId}`);
        connectWebSocket();
    } catch (e) {
        alert("No se pudo crear el board");
        console.error(e);
    }
};

function connectWebSocket() {
    if (!boardId) return alert("Crea un board primero.");

    const proto = location.protocol === "https:" ? "wss" : "ws";
    ws = new WebSocket(`${proto}://${location.host}/ws/${boardId}`);

    ws.onopen = () => console.log("🔌 WS conectado");

    ws.onmessage = (event) => {
        // Actualiza SIEMPRE al recibir (simple: último que escribe gana)
        editor.value = event.data;
    };

    ws.onclose = (e) => {
        console.log("WS desconectado:", e.reason || e.code);
        // Reintento simple
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
    const path = location.pathname;
    if (path.length > 1) {
        boardId = path.slice(1);
        connectWebSocket();
    }
});
