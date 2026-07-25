async function test() {
  const paths = ['/api', '/api/v1', '/generate', '/v1/generate'];
  for (const p of paths) {
    try {
      const res = await fetch(`https://stitch.withgoogle.com${p}`);
      console.log(p, res.status);
    } catch(e) {
      console.log(p, 'Failed');
    }
  }
}
test();
