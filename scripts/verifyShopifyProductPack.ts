import { readFile } from "node:fs/promises";
import JSZip from "jszip";
import {
  buildShopifyProductCsv,
  buildShopifyProductFromDrop,
  buildShopifyReadme,
  buildShopifyThemeLiquidSnippet,
  inspectShopifyProductPack,
} from "../services/shopifyExportService";

const assert: (condition: unknown, message: string) => asserts condition = (condition, message) => {
  if (!condition) throw new Error(message);
};

const product = buildShopifyProductFromDrop({
  id: "drop_fixture_1",
  name: "Ivory Study",
  category: "Sculptural Object",
  vibe: "Quiet Materialism",
  price: 180,
  conceptThesis: "A physical object prepared as a reviewable commerce release.",
  materiality: "Porous stone",
  imageUrl: "https://cdn.example.com/mimi/ivory-study.jpg",
});

assert(product.status === "draft", "Mimi exports must default to Shopify draft status.");
assert(product.requiresShipping, "Physical Mimi Drop products must require shipping.");

const csv = buildShopifyProductCsv(product);
assert(csv.includes(",FALSE,180,TRUE,TRUE,"), "Shopify CSV must stay unpublished and require shipping.");
assert(csv.trim().endsWith(",draft"), "Shopify CSV must import as a draft.");

const zip = new JSZip();
zip.file("product.csv", csv);
zip.file("product.json", JSON.stringify(product, null, 2));
zip.file("product-jsonld.json", JSON.stringify(product.jsonLd, null, 2));
zip.file("theme-embed.liquid", buildShopifyThemeLiquidSnippet(product));
zip.file("README.md", buildShopifyReadme(product));

const generatedPack = await zip.generateAsync({ type: "uint8array" });
const generatedInspection = await inspectShopifyProductPack(generatedPack, "fixture.zip");
assert(generatedInspection.status === "ready", "A generated Mimi pack should pass release inspection.");

console.log("Shopify pack generation contract: PASS");
console.log("Draft publication and physical fulfillment defaults: PASS");
console.log("Release Pack Inspector ready-state: PASS");

const suppliedPackPath = process.argv[2];
if (suppliedPackPath) {
  const suppliedInspection = await inspectShopifyProductPack(
    await readFile(suppliedPackPath),
    suppliedPackPath.split("/").pop(),
  );

  console.log(`\nSupplied pack: ${suppliedInspection.status.toUpperCase()}`);
  suppliedInspection.checks.forEach((check) => {
    console.log(`  ${check.status.toUpperCase()} · ${check.label}: ${check.detail}`);
  });

  if (suppliedInspection.status === "invalid") {
    process.exitCode = 1;
  }
}
