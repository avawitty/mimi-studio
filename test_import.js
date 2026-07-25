async function run() {
  try {
    await import("non-existent");
  } catch (e) {
    console.log("caught error:", e.message);
  }
}
run();
