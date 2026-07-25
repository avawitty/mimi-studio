async function test() {
  const p = '/';
  const res = await fetch(`https://stitch.withgoogle.com${p}`);
  const text = await res.text();
  const scripts = text.match(/<script[^>]+src="([^"]+)"/g);
  console.log(scripts);
}
test();
