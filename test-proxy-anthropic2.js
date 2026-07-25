import fetch from 'node-fetch';

async function testFetch() {
  try {
    const res = await fetch('http://0.0.0.0:3000/api/proxy/anthropic', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'test'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        messages: [{ role: 'user', content: [ { type: 'text', text: undefined } ] }],
        max_tokens: 1000
      })
    });
    console.log(res.status);
    console.log(await res.text());
  } catch(e) {
    console.error("error:", e);
  }
}
testFetch();
