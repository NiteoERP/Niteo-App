'use server';

import { GoogleGenerativeAI } from '@google/generative-ai';

export async function scanInvoice(base64Image: string, mimeType: string, inventory: any[]) {
  if (!process.env.GEMINI_API_KEY) {
    return { error: 'Falta configurar GEMINI_API_KEY en .env.local' };
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // Lista de modelos a intentar en orden de preferencia (nombres verificados en API v1beta)
    const modelsToTry = [
      'gemini-flash-latest',       // Modelo estable y rápido para lectura de facturas
      'gemini-flash-lite-latest'   // Modelo ultra ligero de respaldo
    ];

    const inventoryContext = inventory.map(i => \`{"id": "${i.id}", "nombre": "${i.nombre}", "unidad": "${i.unidad_medida}"${i.palabras_clave ? `, "alias": "${i.palabras_clave}"` : ''}}\`).join('\n');

    const prompt = `
Eres un asistente experto en contabilidad y gestión de inventarios para un negocio en Venezuela.
Analiza esta imagen de una factura o ticket de compra y extrae los datos en formato JSON estricto.

Reglas de extracción y degradación (MUY IMPORTANTE):
1. NO INVENTES DATOS. Si un texto, precio o cantidad está borroso o ilegible, devuelve null o "?? Ilegible".
2. LIMPIA EL NOMBRE: En "nombre_original_factura" devuelve SOLO el nombre base del producto. ELIMINA pesos (Kg, g), unidades, empaques, cajas, o palabras como "Bulto x 12". Ej. Si dice "Harina Pan 1Kg Bulto 24", extrae solo "Harina Pan".
3. Si el precio o cantidad es ilegible, devuelve null en esos campos (el usuario los llenará manualmente).
4. Detecta la moneda: "USD" (Dólares) o "VES" (Bolívares). Observa símbolos como "Ref", "$", "Bs", "Bs.D".
5. Extrae el proveedor. Si es ilegible, usa "Desconocido".
6. Extrae la fecha de emisión (YYYY-MM-DD).
7. Si es una factura a crédito, extrae la "fecha_vencimiento" (fecha límite de pago, YYYY-MM-DD). Si no hay, null.
8. Extrae el IVA y el Descuento (si los hay). Si no hay, usa 0.
9. MATCHEA CON EL INVENTARIO: Busca el insumo semánticamente más cercano. Si el producto es "Harina Pan" pero en inventario está "Harina de Maíz Pan", úsalo. Si no hay nada parecido, pon null.
10. DETECTA BULTOS: Si indica caja, bulto o empaque múltiple (ej. "Bulto x 12"), pon "es_bulto": true, y extrae "unidades_por_bulto_estimado" (ej. 12). Si es unidad, false.
11. UNIDAD DE MEDIDA: Extrae la unidad en la que se mide (ej. "Kg", "Litros", "Caja", "Galón"). Si no dice nada explícito, usa "Unidad".

Inventario disponible:
?${inventoryContext}

Estructura JSON requerida (devuelve SOLO el objeto JSON):
{
  "proveedor_nombre": "String | null",
  "numero_factura": "String | null",
  "fecha": "YYYY-MM-DD | null",
  "fecha_vencimiento": "YYYY-MM-DD | null",
  "moneda": "USD" | "VES",
  "subtotal": Number | null,
  "monto_iva": Number,
  "descuento_total": Number,
  "monto_total": Number | null,
  "items": [
    {
      "nombre_original_factura": "String | ?? Nombre Ilegible",
      "insumo_id_recomendado": "String | null",
      "cantidad": Number | null,
      "unidad_medida_sugerida": "String (Ej: Kg, Litros, Unidad)",
      "es_bulto": Boolean,
      "unidades_por_bulto_estimado": Number | null,
      "precio_unitario": Number | null,
      "precio_total": Number | null
    }
  ]
}
`;

    let lastError: any;
    for (const modelName of modelsToTry) {
      try {
        console.log(`Intentando escanear con modelo: ${modelName}`);
        const model = genAI.getGenerativeModel({ 
          model: modelName, 
          generationConfig: { responseMimeType: 'application/json' } 
        });

        const result = await model.generateContent([
          prompt,
          { inlineData: { data: base64Image, mimeType } }
        ]);

        const responseText = result.response.text();
        const parsed = JSON.parse(responseText);
        
        return { success: true, data: parsed, usedModel: modelName };
      } catch (error: any) {
        console.warn(`[Fallback IA] Falló el modelo ${modelName}:`, error.message);
        lastError = error;
      }
    }
    
    // Si todos fallaron, lanzamos el último error
    throw lastError;
  } catch (error: any) {
    console.error('Error procesando factura con IA:', error);
    return { error: 'Error procesando la imagen con IA: ' + error.message };
  }
}
