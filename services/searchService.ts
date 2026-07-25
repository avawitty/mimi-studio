import { GoogleGenAI } from "@google/genai";
import { getClient } from "./geminiClient";
import { db } from "./firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { auth } from "./firebase";

export const searchGrounding = async (searchQuery: string) => {
  if (!auth.currentUser) return { results: [], summary: "Please log in to search your data." };

  try {
    // Fetch relevant data
    const zinesSnapshot = await getDocs(query(collection(db, "zines"), where("userId", "==", auth.currentUser.uid)));
    const pocketSnapshot = await getDocs(query(collection(db, "pocket"), where("userId", "==", auth.currentUser.uid)));

    const zines = zinesSnapshot.docs.map(doc => ({ id: doc.id, type: 'zine', ...doc.data() }));
    const pocketItems = pocketSnapshot.docs.map(doc => ({ id: doc.id, type: 'pocket', ...doc.data() }));

    const allData = [...zines, ...pocketItems];

    // Use Gemini to search/ground
    const { ai } = getClient();
    const prompt = `
      You are a search assistant. Given the following user query and the available data, find the most relevant items and provide a summary.
      
      Query: "${searchQuery}"
      
      Data:
      ${JSON.stringify(allData)}
      
      Return a JSON object with:
      - results: Array of objects with { id, type, title, relevanceScore }
      - summary: A brief summary of the findings.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Search error:", error);
    return { results: [], summary: "An error occurred during search." };
  }
};
