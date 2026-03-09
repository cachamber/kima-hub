/**
 * Parse a pgvector embedding from its text representation "[0.1,0.2,...]" to a number array.
 */
export function parseEmbedding(text: string): number[] {
    if (!text || typeof text !== "string") {
        throw new Error("Invalid embedding: expected non-empty string");
    }
    const values = text.replace(/[\[\]]/g, "").split(",").map(Number);
    if (values.some(v => !Number.isFinite(v))) {
        throw new Error("Invalid embedding: contains non-numeric values");
    }
    return values;
}
