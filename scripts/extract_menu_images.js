const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: 'gemini-flash-lite-latest',
  generationConfig: {
    responseMimeType: 'application/json'
  }
});

const FOLDER = 'C:\\Users\\Usuario\\Desktop\\coctel';

async function extractFromImage(filename) {
  const filePath = path.join(FOLDER, filename);
  const imgData = fs.readFileSync(filePath).toString('base64');

  const prompt = `
Analiza cuidadosamente esta imagen del menú del restaurante Pizzería El Peluche / Peluche.
Extrae TODOS los productos, platos, combos, pizzas, hamburguesas, bebidas, etc., que aparecen en la imagen.

Para cada elemento, genera un objeto JSON con la siguiente estructura:
{
  "archivo": "${filename}",
  "categoria_menu": "nombre de la sección o categoría en la imagen (ej: PIZZAS TRADICIONALES, HAMBURGUESAS, COMBOS, BEBIDAS, PASTICHOS, etc.)",
  "productos": [
    {
      "nombre": "Nombre exacto del producto en mayúsculas (ej: PIZZA MARGARITA, BURGER PELUCHE, COMBO 1)",
      "precio": 0.0, // Precio en USD (número decimal o entero, si hay tamaños como Mediana/Familiar extrae cada tamaño como un producto independiente, ej: PIZZA MARGARITA MEDIANA, PIZZA MARGARITA FAMILIAR, etc.)
      "ingredientes_o_descripcion": "Descripción o lista de ingredientes tal como aparece en la imagen",
      "es_combo": false, // true si es un combo o promoción que incluye varios productos (ej: Burger + Papas + Bebida, o 2 Pizzas + Refresco)
      "contenido_combo": "Si es combo, describe exactamente qué incluye para enviarlo a la comanda de cocina"
    }
  ]
}

Responde ÚNICAMENTE con el objeto JSON válido.
`;

  try {
    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: imgData
        }
      },
      prompt
    ]);
    const text = result.response.text();
    return JSON.parse(text);
  } catch (err) {
    console.error(`Error procesando ${filename}:`, err.message);
    return { archivo: filename, error: err.message, productos: [] };
  }
}

async function runTest() {
  const testFiles = [
    'WhatsApp Image 2026-10-14 at 2.07.02 PM.jpeg',
    'WhatsApp Image 2026-10-14 at 2.07.03 PM.jpeg'
  ];

  for (const f of testFiles) {
    console.log(`Procesando ${f}...`);
    const data = await extractFromImage(f);
    console.log(JSON.stringify(data, null, 2));
  }
}

if (require.main === module) {
  runTest();
}

module.exports = { extractFromImage };
