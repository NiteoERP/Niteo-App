const fs = require('fs');

let code = fs.readFileSync('src/app/dashboard/informes/page.tsx', 'utf-8');

const newCategory = `    {
      id: 'compras',
      category: 'Compras y Proveedores',
      icon: Store,
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10 border-orange-500/20',
      reports: [
        { id: 'compras_proveedores', name: 'Histórico de Compras', desc: 'Registro detallado de compras a proveedores', icon: Receipt },
        { id: 'compras_metodos_pago', name: 'Compras por Método de Pago', desc: 'Desglose de compras según el método de pago usado', icon: CreditCard },
      ],
    },
  ];`;

code = code.replace(
  "  ];",
  newCategory
);

fs.writeFileSync('src/app/dashboard/informes/page.tsx', code);
console.log("Informes category added");
