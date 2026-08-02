import { ZineMetadata } from "../types";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "./firebaseInit";
import { embeddingModelId, getEmbedding } from "./geminiService";

export const generateAndStoreZineEmbedding = async (zine: ZineMetadata) => {
    try {
        const textToEmbed = `${zine.title} ${zine.content?.vocal_summary_blurb || ""} ${zine.content?.oracular_mirror || ""} ${zine.tone || ""}`;
        if (!textToEmbed.trim()) return;

        const embedding = await getEmbedding([{ text: textToEmbed.slice(0, 2000) }]);
        if (embedding?.length) {
            await updateDoc(doc(db, "zine_working", zine.id), {
                embedding,
                embedding_dims: embedding.length,
                embedding_model: embeddingModelId(),
            });
        }
    } catch (e) {
        console.warn("MIMI // Zine Embedding Generation Failed:", e);
    }
};
