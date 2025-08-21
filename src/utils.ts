// ID corto seguro (a-z0-9). length por defecto 8.
export const generateShortId= (length = 8): string => {
    // crypto aleatorio mejor que Math.random
    const bytes = crypto.getRandomValues(new Uint8Array(length));
    const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
    let out = "";
    for (let i = 0; i < length; i++) {
        out += alphabet[bytes[i]! % alphabet.length];
    }
    return out;
}
