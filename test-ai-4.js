const fetch = require('node-fetch');
async function run() {
  try {
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models?key=' + process.env.GEMINI_API_KEY);
    const data = await res.json();
    console.log(data.models.map(m => m.name).join(', '));
  } catch (e) {
    console.error(e.message);
  }
}
run();