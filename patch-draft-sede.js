const fs = require('fs');

let code = fs.readFileSync('src/app/dashboard/caja/nuevo/page.tsx', 'utf-8');

// Remove global DRAFT_KEY
code = code.replace(/const DRAFT_KEY = 'niteo_draft_cierre';\n/, '');

// Replace the mount effect with an effect that listens to selectedSedeId
code = code.replace(
  /\/\/ "?"?"? FIX 1: RESTAURAR BORRADOR DESDE localStorage AL MONTAR[^]*?}, \[\]\);/m,
  `// FIX 1: RESTAURAR BORRADOR DESDE localStorage AL CAMBIAR SEDE
  useEffect(() => {
    if (!selectedSedeId) return;
    try {
      const draftKey = \`niteo_draft_cierre_\${selectedSedeId}\`;
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const draft = JSON.parse(raw);
        if (draft.transacciones?.length > 0) {
          setTransacciones(draft.transacciones);
          setHasDraft(true);
        } else {
          setTransacciones([]);
          setHasDraft(false);
        }
        if (draft.metodos_custom?.length > 0) {
          const customRestored: MetodoConfig[] = draft.metodos_custom.map((m: any) => ({
            ...m,
            icon: ICON_MAP[m.iconKey] || GripHorizontal,
          }));
          setMetodos([...METODOS_DEFAULT, ...customRestored]);
        } else {
          setMetodos(METODOS_DEFAULT);
        }
      } else {
        setTransacciones([]);
        setHasDraft(false);
        setMetodos(METODOS_DEFAULT);
      }
    } catch (_) {
      setTransacciones([]);
      setHasDraft(false);
      setMetodos(METODOS_DEFAULT);
    }
  }, [selectedSedeId]);`
);

// Replace the save effect
code = code.replace(
  /\/\/ "?"?"? FIX 1: GUARDAR BORRADOR EN localStorage EN CADA CAMBIO[^]*?}, \[transacciones, metodos, loading\]\);/m,
  `// FIX 1: GUARDAR BORRADOR EN localStorage EN CADA CAMBIO
  useEffect(() => {
    if (loading || !selectedSedeId) return;
    try {
      const draftKey = \`niteo_draft_cierre_\${selectedSedeId}\`;
      const metodos_custom = metodos
        .filter(m => m.isCustom)
        .map(m => ({
          id: m.id,
          color: m.color,
          defaultMoneda: m.defaultMoneda,
          isCustom: true,
          iconKey: 'GripHorizontal',
        }));
      localStorage.setItem(draftKey, JSON.stringify({ transacciones, metodos_custom }));
      setHasDraft(transacciones.length > 0);
    } catch (_) { }
  }, [transacciones, metodos, loading, selectedSedeId]);`
);

// Fix limpiarBorrador
code = code.replace(
  /const limpiarBorrador = \(\) => {[^]*?setHasDraft\(false\);\n  };/m,
  `const limpiarBorrador = () => {
    if (selectedSedeId) {
      localStorage.removeItem(\`niteo_draft_cierre_\${selectedSedeId}\`);
    }
    setTransacciones([]);
    setMetodos(METODOS_DEFAULT);
    setHasDraft(false);
  };`
);

// Fix successful save clear
code = code.replace(
  /localStorage\.removeItem\(DRAFT_KEY\);/g,
  `if (selectedSedeId) localStorage.removeItem(\`niteo_draft_cierre_\${selectedSedeId}\`);`
);

// Revert handleSedeChange to not clear transacciones since the useEffect will handle it
code = code.replace(
  /const handleSedeChange = async \(newSedeId: string\) => \{\n    \/\/ Al cambiar de sede, debemos limpiar la informacin que estaba llenando para no mezclar datos\n    setTransacciones\(\[\]\);\n    setHasDraft\(false\);\n    try \{ localStorage\.removeItem\('niteo_draft_cierre'\); \} catch\(e\)\{\}\n    setSelectedSedeId\(newSedeId\);/m,
  `const handleSedeChange = async (newSedeId: string) => {\n    setSelectedSedeId(newSedeId);`
);

// Wait, the previous patch had Spanish character "información" corrupted to "informacin". I will just use a more robust regex
code = code.replace(
  /const handleSedeChange = async \(newSedeId: string\) => \{[\s\S]*?setSelectedSedeId\(newSedeId\);/m,
  `const handleSedeChange = async (newSedeId: string) => {\n    setSelectedSedeId(newSedeId);`
);

fs.writeFileSync('src/app/dashboard/caja/nuevo/page.tsx', code);

// Now patch CierreEnCursoBanner to check ALL drafts or only the one for the current branch?
// Usually, we just want to know if ANY draft exists.
let bannerCode = fs.readFileSync('src/components/cierres/CierreEnCursoBanner.tsx', 'utf-8');
bannerCode = bannerCode.replace(
  /const draft = localStorage\.getItem\(DRAFT_KEY\);/m,
  `let draft = null;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('niteo_draft_cierre_')) {
        draft = localStorage.getItem(key);
        break;
      }
    }`
);
bannerCode = bannerCode.replace(/const DRAFT_KEY = 'niteo_draft_cierre';\n/, '');

fs.writeFileSync('src/components/cierres/CierreEnCursoBanner.tsx', bannerCode);
