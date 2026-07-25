async function test() {
  const p = '/api';
  const res = await fetch(`https://stitch.withgoogle.com${p}`);
  const text = await res.text();
  console.log(text.substring(0, 200));
}
test();
