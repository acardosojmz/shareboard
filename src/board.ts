import { db } from "./db";
import { generateShortId } from "./utils";

export async function createBoard(): Promise<string> {
    // Garantiza unicidad reintentando si colisiona
    for (let i = 0; i < 5; i++) {
        const shortId = generateShortId(8);
        try {
            const res = await db.query(
                `INSERT INTO board (short_id) VALUES ($1) RETURNING id`,
                [shortId]
            );
            if (res.rows.length) return shortId;
        } catch (err: any) {
            // Si violación de unique, reintenta; si no, propaga
            if (!String(err?.message || "").includes("unique")) throw err;
        }
    }
    throw new Error("No fue posible generar short_id único.");
}

export async function getBoardByShortId(shortId: string): Promise<{ id: string; content: string } | null> {
    const res = await db.query(
        `SELECT id::string AS id, content::string AS content FROM board WHERE short_id = $1 LIMIT 1`,
        [shortId]
    );
    return res.rows[0] ?? null;
}

export async function updateBoardContent(id: string, content: string): Promise<void> {
    await db.query(`UPDATE board SET content = $1 WHERE id = $2`, [content, id]);
}
