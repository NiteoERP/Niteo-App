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
const NEW_FILES = [
  'WhatsApp Image 2026-10-14 at 2.38.36 PM.jpeg',
  'WhatsApp Image 2026-10-14 at 2.45.30 PM.jpeg',
  'WhatsApp Image 2026-10-14 at 2.45.30 PM (1).jpeg'
];

async function extractFromImage(filename) {
  const filePath = path.join(FOLDER, filename);
  const imgData = fs.readFileSync(filePath).toString('base64');

  const prompt = `
Analiza cuidadosamente esta imagen del menú de la pizzería / restaurante El Peluche.
Extrae TODOS los productos, pizzas (con sus tamaños si los hay: Pequeña, Mediana, Familiar), hamburguesas, comidas rápidas, etc., con sus precios exactos en USD y su descripción o ingredientes.

Para cada plato o producto:
{
  "archivo": "${filename}",
  "categoria_menu": "Nombre de la sección (ej: PIZZAS TRADICIONALES, PIZZAS ESPECIALES, HAMBURGUESAS, etc.)",
  "productos": [
    {
      "nombre": "Nombre exacto del producto en mayúsculas (ej: PIZZA MARGARITA FAMILIAR, PIZZA MARGARITA MEDIANA, PIZZA MARGARITA PEQUEÑA, etc.)",
      "precio": 0.0, // Precio en USD (número float o entero)
      "ingredientes_o_descripcion": "Ingredientes o descripción completa que aparece en el menú",
      "es_combo": false, // true si es un combo/promoción compuesta
      "contenido_combo": "Si es combo describe qué incluye para cocina, si no es combo pon null"
    }
  ]
}

Responde ÚNICAMENTE con el JSON válido (puede ser un objeto o un array de objetos por sección).
`;

  const result = await model.generateContent([
    {
      inlineData: {
        mimeType: 'image/jpeg',
        data: imgData
      }
    },
    prompt
  ]);

  return JSON.parse(result.response.text());
}

async function main() {
  const allResults = {};
  for (const f of NEW_FILES) {
    console.log(`Extrayendo ${f}...`);
    try {
      const data = await extractFromImage(f);
      allResults[f] = data;
      console.log(`  -> Éxito en ${f}`);
    } catch (e) {
      console.error(`  -> Error en ${f}:`, e.message);
    }
  }

  fs.writeFileSync(path.join(__dirname, 'extracted_3_new_images.json'), JSON.stringify(allResults, null, 2), 'utf8');
  console.log('Guardado en extracted_3_new_images.json');
}

main().catch(console.error);
