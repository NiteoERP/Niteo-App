const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

async function run() {
  try {
    const result = await model.generateContent('Hola');
    console.log(result.response.text());
  } catch (e) {
    console.error(e.message);
  }
}
run();