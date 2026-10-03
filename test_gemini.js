const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config({ path: '.env.local' });

async function testModels() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const models = [
    'gemini-1.5-flash',
    'gemini-1.5-flash-latest',
    'gemini-flash-latest',
    'gemini-flash-lite-latest',
    'gemini-pro-vision',
    'gemini-1.5-pro'
  ];

  for (const name of models) {
    try {
      const model = genAI.getGenerativeModel({ model: name });
      const result = await model.generateContent("Hola, responde solo con la palabra 'OK'.");
      console.log(`[SUCCESS] ${name}`);
    } catch (e) {
      console.error(`[FAIL] ${name} -> ${e.message.split('\n')[0]}`);
    }
  }
}
testModels();