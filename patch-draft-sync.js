const fs = require('fs');

let code = fs.readFileSync('src/app/dashboard/caja/nuevo/page.tsx', 'utf-8');

const newDraftLogic = `
  // --- DRAFT LOGIC ---
  const saveDraft = (sedeId: string, txs: any[], mets: any[]) => {
    if (!sedeId) return;
    try {
      const draftKey = \`niteo_draft_cierre_\${sedeId}\`;
      const metodos_custom = mets.filter(m => m.isCustom).map(m => ({
        id: m.id, color: m.color, defaultMoneda: m.defaultMoneda, isCustom: true, iconKey: 'GripHorizontal',
      }));
      localStorage.setItem(draftKey, JSON.stringify({ transacciones: txs, metodos_custom }));
    } catch (_) {}
  };

  const loadDraft = (sedeId: string) => {
    if (!sedeId) return false;
    try {
      const draftKey = \`niteo_draft_cierre_\${sedeId}\`;
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const draft = JSON.parse(raw);
        let hasData = false;
        
        if (draft.transacciones?.length > 0) {
          setTransacciones(draft.transacciones);
          hasData = true;
        } else {
          setTransacciones([]);
        }

        if (draft.metodos_custom?.length > 0) {
          const customRestored: MetodoConfig[] = draft.metodos_custom.map((m: any) => ({
            ...m, icon: ICON_MAP[m.iconKey] || GripHorizontal,
          }));
          setMetodos([...METODOS_DEFAULT, ...customRestored]);
        } else {
          setMetodos(METODOS_DEFAULT);
        }
        
        setHasDraft(hasData);
        return hasData;
      }
    } catch (_) {}
    
    setTransacciones([]);
    setMetodos(METODOS_DEFAULT);
    setHasDraft(false);
    return false;
  };

  // Guardar cada vez que transacciones cambie
  useEffect(() => {
    if (!loading && selectedSedeId) {
      saveDraft(selectedSedeId, transacciones, metodos);
      setHasDraft(transacciones.length > 0);
    }
  }, [transacciones, metodos]);
  // -------------------
`;

// Insert the new logic where the old one was
code = code.replace(
  /const \[newMetodoMoneda, setNewMetodoMoneda\] = useState<Moneda>\('VES'\);/,
  `const [newMetodoMoneda, setNewMetodoMoneda] = useState<Moneda>('VES');\n${newDraftLogic}`
);

// In loadInitial, after setting selectedSedeId, we call loadDraft!
code = code.replace(
  /if \(cierreRes\.targetSedeId\) setSelectedSedeId\(cierreRes\.targetSedeId\);\n\s*else if \(initialSedeId\) setSelectedSedeId\(initialSedeId\);/,
  `let finalSede = cierreRes.targetSedeId || initialSedeId;
        if (finalSede) {
          setSelectedSedeId(finalSede);
          loadDraft(finalSede);
        }`
);

// In handleSedeChange, load Draft explicitly
code = code.replace(
  /const handleSedeChange = async \(newSedeId: string\) => \{\n    setSelectedSedeId\(newSedeId\);/m,
  `const handleSedeChange = async (newSedeId: string) => {
    setSelectedSedeId(newSedeId);
    loadDraft(newSedeId);`
);

fs.writeFileSync('src/app/dashboard/caja/nuevo/page.tsx', code);
