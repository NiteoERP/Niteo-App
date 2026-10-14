const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: 'gemini-flash-lite-latest',
  generationConfig: {
    responseMimeType: 'application/json'
  }
});

const FOLDER = 'C:\\Users\\Usuario\\Desktop\\coctel';
const OUT_FILE = path.join(__dirname, 'menu_extraction_results.json');

async function extractFromImage(filePath, filename) {
  const imgData = fs.readFileSync(filePath).toString('base64');

  const prompt = `
Analiza cuidadosamente esta imagen del menú del restaurante Pizzería El Peluche / Peluche.
Extrae TODOS los productos, platos, combos, pizzas, hamburguesas, bebidas, cócteles, entradas, etc., que aparecen en la imagen.

Para cada elemento, genera un objeto JSON con la siguiente estructura:
{
  "archivo": "${filename}",
  "categoria_menu": "Nombre de la sección o categoría del menú en la imagen (ej: PIZZAS TRADICIONALES, HAMBURGUESAS, COMBOS, BEBIDAS, PASTICHOS, PARRILLAS, FESTIN, etc.)",
  "productos": [
    {
      "nombre": "Nombre exacto del producto en mayúsculas (ej: PIZZA MARGARITA MEDIANA, HAMBURGUESA CLASICA, COMBO 2 PIZZAS, etc.)",
      "precio": 0.0, // Precio en USD (número float o entero, sin símbolo $). Si un plato tiene varios tamaños (ej: Mediana $10, Familiar $14), extrae cada tamaño como un producto separado con su nombre completo y su precio.
      "ingredientes_o_descripcion": "Descripción detallada o lista de ingredientes tal como aparece en la imagen",
      "es_combo": false, // true si es un combo, festín o promoción compuesta (ej: incluye burger + papas + refresco, o 2 pizzas + bebida, o balde de cervezas)
      "contenido_combo": "Si es combo, describe exactamente qué incluye para enviarlo como notas de preparación a la cocina. Si no es combo, pon null."
    }
  ]
}

Responde ÚNICAMENTE con el objeto JSON válido.
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
  const text = result.response.text();
  return JSON.parse(text);
}

async function main() {
  const files = fs.readdirSync(FOLDER);
  const seenHashes = new Set();
  const uniqueFiles = [];

  for (const f of files) {
    if (!f.endsWith('.jpeg') && !f.endsWith('.jpg') && !f.endsWith('.png')) continue;
    const fullPath = path.join(FOLDER, f);
    const buf = fs.readFileSync(fullPath);
    const hash = crypto.createHash('md5').update(buf).digest('hex');
    if (!seenHashes.has(hash)) {
      seenHashes.add(hash);
      uniqueFiles.push(f);
    }
  }

  console.log(`Encontradas ${uniqueFiles.length} imágenes únicas para procesar.`);

  let results = {};
  if (fs.existsSync(OUT_FILE)) {
    try {
      results = JSON.parse(fs.readFileSync(OUT_FILE, 'utf8'));
      console.log(`Cargados ${Object.keys(results).length} resultados previos de ${OUT_FILE}.`);
    } catch (e) {
      console.log('Iniciando archivo nuevo de resultados.');
    }
  }

  for (let i = 0; i < uniqueFiles.length; i++) {
    const filename = uniqueFiles[i];
    if (results[filename] && results[filename].productos && results[filename].productos.length > 0) {
      console.log(`[${i + 1}/${uniqueFiles.length}] Saltando ${filename} (ya procesado con ${results[filename].productos.length} productos)`);
      continue;
    }

    console.log(`[${i + 1}/${uniqueFiles.length}] Extrayendo ${filename}...`);
    try {
      const data = await extractFromImage(path.join(FOLDER, filename), filename);
      results[filename] = data;
      fs.writeFileSync(OUT_FILE, JSON.stringify(results, null, 2), 'utf8');
      console.log(`  -> Éxito: ${data.categoria_menu} (${data.productos ? data.productos.length : 0} productos)`);
    } catch (err) {
      console.error(`  -> Error en ${filename}:`, err.message);
    }

    // Esperar 1 segundo entre llamadas para ser amigables con el rate limit
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log('Extracción completada con éxito.');
}

main().catch(console.error);
