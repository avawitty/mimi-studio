import { getAllShadowMemory } from './services/vectorSearch';

async function countMemory() {
  const memory = await getAllShadowMemory();
  console.log(`ARTIFACT_COUNT: ${memory.length}`);
}

countMemory();
