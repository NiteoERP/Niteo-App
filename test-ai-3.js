const fetch = require('node-fetch');
async function run() {
  try {
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models?key=' + process.env.GEMINI_API_KEY);
    const text = await res.text();
    console.log(text);
  } catch (e) {
    console.error(e.message);
  }
}
run();