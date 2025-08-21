import { serve, ServerWebSocket } from "bun";
import { connectDB } from "./db";
import { createBoard, getBoardByShortId, updateBoardContent } from "./board";

await connectDB();
const port = Number(process.env.PORT || 3000);

interface WSData {
    boardId: string;          // UUID interno de la tabla
    initialContent?: string;  // Para primer render del cliente
}

// Set de clientes WS en el servidor
const clients = new Set<ServerWebSocket<WSData>>();

serve({
    port,

    websocket: {
        open(ws: ServerWebSocket<WSData>, _req: Request) {
            // El boardId viene desde upgrade(req, { data })
            if (ws.data?.boardId) {
                clients.add(ws);
                // Enviar contenido inicial al conectarse
                ws.send(ws.data.initialContent ?? "");
                console.log("WS abierto para board:", ws.data.boardId);
            } else {
                console.warn("WS sin boardId, cerrando");
                ws.close(1008, "No boardId");
            }
        },

        message(ws: ServerWebSocket<WSData>, message: string | Buffer) {
            if (!ws.data?.boardId) return ws.close(1008, "No boardId");
            const text = typeof message === "string" ? message : message.toString();

            // Broadcast a otros clientes del mismo board
            for (const client of clients) {
                if (client !== ws && client.data?.boardId === ws.data.boardId) {
                    try {
                        client.send(text);
                    } catch {}
                }
            }

            // Persistir en BD (no esperamos el resultado para no bloquear)
            updateBoardContent(ws.data.boardId, text).catch((e) =>
                console.error("Error updateBoardContent:", e)
            );
        },

        close(ws: ServerWebSocket<WSData>) {
            clients.delete(ws);
            console.log("WS cerrado");
        },
    },

    fetch: async (req, server) => {
        const url = new URL(req.url);

        // Crear nuevo board (POST)
        if (url.pathname === "/api/new-board" && req.method === "POST") {
            const shortId = await createBoard();
            return new Response(JSON.stringify({ id: shortId }), {
                headers: { "Content-Type": "application/json" },
            });
        }

        // WebSocket upgrade: /ws/:shortId
        if (url.pathname.startsWith("/ws/")) {
            const shortId = url.pathname.split("/")[2] || "";
            const board = await getBoardByShortId(shortId);

            if (!board) {
                return new Response("Board not found", { status: 404 });
            }

            // No respondas con socket aquí, solo upgrade
            const upgraded = server.upgrade(req, {
                data: { boardId: board.id, initialContent: board.content },
            });

            if (!upgraded) {
                return new Response("WebSocket upgrade failed", { status: 500 });
            }
            return; // Importante: terminar aquí
        }

        // Favicon opcional (evita 404 ruidoso)
        if (url.pathname === "/favicon.ico") {
            return new Response("", { headers: { "Content-Type": "image/x-icon" } });
        }

        // Serve index.html para raíz o rutas cortas /[a-z0-9]{6,10}
        if (url.pathname === "/" || /^\/[a-z0-9]{6,10}$/.test(url.pathname)) {
            return new Response(Bun.file("./public/index.html"), {
                headers: { "Content-Type": "text/html; charset=utf-8" },
            });
        }

        // Archivos estáticos: /public/*
        try {
            const file = Bun.file(`./public${url.pathname}`);
            if (await file.exists()) return new Response(file);
        } catch {}

        return new Response("Not Found", { status: 404 });
    },
});

console.log(`✅ ShareBoard server running on http://localhost:${port}`);
