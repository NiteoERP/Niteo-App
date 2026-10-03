const fs = require('fs');

let content = fs.readFileSync('src/app/dashboard/caja/nuevo/page.tsx', 'utf8');

// 1. Fix loadDraft
const loadDraftRegex = /const loadDraft = \(sedeId: string\) => \{[\s\S]*?setTransacciones\(\[\]\);\r?\n    setMetodos\(METODOS_DEFAULT\);\r?\n    setHasDraft\(false\);\r?\n    return false;\r?\n  \};/;
const loadDraftReplacement = `const loadDraft = async (sedeId: string) => {
    if (!sedeId) return false;
    try {
      const draftKey = \`niteo_draft_cierre_\${sedeId}\`;
      const raw = localStorage.getItem(draftKey);
      let hasData = false;
      if (raw) {
        const draft = JSON.parse(raw);
        if (draft.transacciones?.length > 0) {
          setTransacciones(draft.transacciones);
          hasData = true;
        }
        if (draft.metodos_custom?.length > 0) {
          const customRestored: MetodoConfig[] = draft.metodos_custom.map((m: any) => ({
            ...m, iconKey: m.iconKey || 'GripHorizontal',
          }));
          setMetodos([...METODOS_DEFAULT, ...customRestored]);
        }
        setHasDraft(hasData);
      }

      const cloudDraft = await getCloudDraft(sedeId);
      if (cloudDraft && (cloudDraft.transacciones?.length > 0 || cloudDraft.metodos_custom?.length > 0)) {
        if (cloudDraft.transacciones?.length > 0) {
          setTransacciones(cloudDraft.transacciones);
        }
        if (cloudDraft.metodos_custom?.length > 0) {
          const customRestored: MetodoConfig[] = cloudDraft.metodos_custom.map((m: any) => ({
            ...m, iconKey: m.iconKey || 'GripHorizontal',
          }));
          setMetodos([...METODOS_DEFAULT, ...customRestored]);
        }
        setHasDraft(cloudDraft.transacciones?.length > 0);
        return true;
      }
      return hasData;
    } catch (_) {}
    setTransacciones([]);
    setMetodos(METODOS_DEFAULT);
    setHasDraft(false);
    return false;
  };`;
content = content.replace(loadDraftRegex, loadDraftReplacement);

// 2. Fix limpiarBorrador
const limpiarBorradorRegex = /const limpiarBorrador = \(\) => \{[\s\S]*?if \(selectedSedeId\) localStorage\.removeItem\(`niteo_draft_cierre_\$\{selectedSedeId\}`\);/;
const limpiarBorradorReplacement = `const limpiarBorrador = () => {
    try { localStorage.removeItem('niteo_draft_cierre'); } catch (_) {}
    if (selectedSedeId) {
      localStorage.removeItem(\`niteo_draft_cierre_\${selectedSedeId}\`);
      clearCloudDraft(selectedSedeId).catch(console.error);
    }`;
content = content.replace(limpiarBorradorRegex, limpiarBorradorReplacement);

// 3. Fix handleGuardarCierre
const guardarCierreRegex = /\/\/ FIX 1: limpiar el borrador al guardar con éxito\r?\n\s*if \(selectedSedeId\) localStorage\.removeItem\(`niteo_draft_cierre_\$\{selectedSedeId\}`\);/;
const guardarCierreReplacement = `// FIX 1: limpiar el borrador al guardar con éxito
          if (selectedSedeId) {
            localStorage.removeItem(\`niteo_draft_cierre_\${selectedSedeId}\`);
            clearCloudDraft(selectedSedeId).catch(console.error);
          }`;
content = content.replace(guardarCierreRegex, guardarCierreReplacement);

// 4. Add imports if not present
if (!content.includes('saveCloudDraft')) {
  content = content.replace(
    "verificarTransaccionesDuplicadas } from '@/actions/cierres-actions';",
    "verificarTransaccionesDuplicadas, saveCloudDraft, getCloudDraft, clearCloudDraft } from '@/actions/cierres-actions';"
  );
}

fs.writeFileSync('src/app/dashboard/caja/nuevo/page.tsx', content, 'utf8');
