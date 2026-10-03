const fs = require('fs');
let content = fs.readFileSync('src/app/dashboard/proveedores/page.tsx', 'utf8');

// Inject useEffect for facFecha -> facTasa
const target1 = "useEffect(() => {\r\n    const fetchM = async () => {\r\n      try {";
const replacement1 = `useEffect(() => {
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

  useEffect(() => {
    const fetchM = async () => {
      try {`;

content = content.replace(
  "  useEffect(() => {\n    const fetchM = async () => {\n      try {",
  `  useEffect(() => {
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

  useEffect(() => {
    const fetchM = async () => {
      try {`
);

fs.writeFileSync('src/app/dashboard/proveedores/page.tsx', content, 'utf8');