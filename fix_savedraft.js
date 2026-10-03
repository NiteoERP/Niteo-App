const fs = require('fs');

let content = fs.readFileSync('src/app/dashboard/caja/nuevo/page.tsx', 'utf8');

const regex = /const saveDraft = \(sedeId: string, txs: any\[\], mets: any\[\]\) => \{[\s\S]*?localStorage\.setItem[\s\S]*?\} catch \(_\) \{\}\r?\n  \};/;

const replacement = `const cloudSaveTimer = React.useRef<NodeJS.Timeout | null>(null);

  const saveDraft = (sedeId: string, txs: any[], mets: any[]) => {
    if (!sedeId) return;
    try {
      const draftKey = \`niteo_draft_cierre_\${sedeId}\`;
      const metodos_custom = mets.filter(m => m.isCustom).map(m => ({
        id: m.id, color: m.color, defaultMoneda: m.defaultMoneda, isCustom: true, iconKey: 'GripHorizontal',
      }));
      localStorage.setItem(draftKey, JSON.stringify({ transacciones: txs, metodos_custom }));

      if (cloudSaveTimer.current) clearTimeout(cloudSaveTimer.current);
      cloudSaveTimer.current = setTimeout(() => {
        saveCloudDraft(sedeId, txs, metodos_custom).catch(console.error);
      }, 5000);
    } catch (_) {}
  };`;

content = content.replace(regex, replacement);

fs.writeFileSync('src/app/dashboard/caja/nuevo/page.tsx', content, 'utf8');
