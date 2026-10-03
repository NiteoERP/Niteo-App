const fs = require('fs');
let content = fs.readFileSync('src/actions/compras-actions.ts', 'utf8');

content = content.replace(
  "import { getTasaBcvAction } from './config-actions';",
  "import { getTasaBcvAction, getTasaBcvForDateAction } from './config-actions';"
);

content = content.replace(
  "export async function getTasaDelDia(): Promise<number> {\r\n  const data = await getTasaBcvAction();\r\n  return data.tasa || 36.50;\r\n}",
  "export async function getTasaDelDia(dateStr?: string): Promise<number> {\r\n  if (dateStr) {\r\n    const data = await getTasaBcvForDateAction(dateStr);\r\n    return data.tasa || 36.50;\r\n  }\r\n  const data = await getTasaBcvAction();\r\n  return data.tasa || 36.50;\r\n}"
);

content = content.replace(
  "export async function getTasaDelDia(): Promise<number> {\n  const data = await getTasaBcvAction();\n  return data.tasa || 36.50;\n}",
  "export async function getTasaDelDia(dateStr?: string): Promise<number> {\n  if (dateStr) {\n    const data = await getTasaBcvForDateAction(dateStr);\n    return data.tasa || 36.50;\n  }\n  const data = await getTasaBcvAction();\n  return data.tasa || 36.50;\n}"
);

fs.writeFileSync('src/actions/compras-actions.ts', content, 'utf8');