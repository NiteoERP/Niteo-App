const fs = require('fs');
let content = fs.readFileSync('src/app/dashboard/proveedores/page.tsx', 'utf8');

const regex = /const compressImage = /;

const replacement = `useEffect(() => {
    const fetchTasaPorFecha = async () => {
      if (!facFecha) return;
      try {
        const { getTasaBcvForDateAction } = await import('@/actions/config-actions');
        const res = await getTasaBcvForDateAction(facFecha);
        if (res && res.tasa) {
          setFacTasa(res.tasa);
        }
      } catch (e) {
        console.error('Error fetching rate for date:', e);
      }
    };
    fetchTasaPorFecha();
  }, [facFecha]);

  const compressImage = `;

content = content.replace(regex, replacement);
fs.writeFileSync('src/app/dashboard/proveedores/page.tsx', content, 'utf8');