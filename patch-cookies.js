const fs = require('fs');

let code = fs.readFileSync('src/actions/cierres-actions.ts', 'utf-8');

// Fix 1: cookies().set in verifySupervisor
code = code.replace(
  /cookies\(\)\.set\('supervisor_override', 'true', \{ maxAge: 15 \* 60, path: '\/' \}\);/,
  `const cookieStore = await cookies();\n  cookieStore.set('supervisor_override', 'true', { maxAge: 15 * 60, path: '/' });`
);

// Fix 2: cookies().get and cookies().delete in actualizarCierre
code = code.replace(
  /const hasOverride = cookies\(\)\.get\('supervisor_override'\)\?\.value === 'true';\n\s*if \(profile\?\.rol !== 'MASTER' && !hasOverride\) \{\n\s*return \{ error: 'No tienes permisos para modificar cierres\.' \};\n\s*\}\n\s*\/\/ Si usó el override, lo consumimos \(borramos la cookie\) para que no quede abierta\n\s*if \(hasOverride && profile\?\.rol !== 'MASTER'\) \{\n\s*cookies\(\)\.delete\('supervisor_override'\);\n\s*\}/,
  `const cookieStore = await cookies();
  const hasOverride = cookieStore.get('supervisor_override')?.value === 'true';
  if (profile?.rol !== 'MASTER' && !hasOverride) {
    return { error: 'No tienes permisos para modificar cierres.' };
  }
  // Si usó el override, lo consumimos (borramos la cookie) para que no quede abierta
  if (hasOverride && profile?.rol !== 'MASTER') {
    cookieStore.delete('supervisor_override');
  }`
);

fs.writeFileSync('src/actions/cierres-actions.ts', code);
