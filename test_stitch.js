const fetch = require('node-fetch');

async function test() {
  try {
    const res = await fetch('https://stitch.withgoogle.com/api/generate', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer AQ.Ab8RN6IyzxKcsBHawVk9iETDEseYnhnPb7yjfXuvYGiUbZLTqw',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ prompt: 'a beautiful login page' })
    });
    console.log(res.status);
    console.log(await res.text());
  } catch (e) {
    console.error(e);
  }
}
test();
