const fs = require('fs');

let code = fs.readFileSync('src/actions/cierres-actions.ts', 'utf-8');

code = code.replace(
  /const \{ data, error \} = await query;\n\s*if \(error\) \{\n\s*console\.error\(error\);\n\s*return \[\];\n\s*\}\n\s*return data \|\| \[\];/,
  `const { data, error } = await query;
  if (error) {
    console.error(error);
    return [];
  }
  
  if (!data || data.length === 0) return [];

  // Mapear nombres de usuario manualmente desde perfiles ya que la FK apunta a auth.users
  const userIds = [...new Set(data.map(c => c.usuario_id))];
  const { data: perfilesData } = await supabase
    .from('perfiles')
    .select('id, nombre_completo')
    .in('id', userIds);

  const perfilMap = new Map();
  if (perfilesData) {
    perfilesData.forEach(p => perfilMap.set(p.id, p.nombre_completo));
  }

  return data.map(c => ({
    ...c,
    usuarios: { nombre: perfilMap.get(c.usuario_id) || 'Cajero' }
  }));`
);

fs.writeFileSync('src/actions/cierres-actions.ts', code);
