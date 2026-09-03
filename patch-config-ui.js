const fs = require('fs');

let layoutCode = fs.readFileSync('src/app/dashboard/configuracion/layout.tsx', 'utf-8');
layoutCode = layoutCode.replace(
  `{ name: 'Mensajes y Alertas', href: '#', icon: Bell },`,
  `// { name: 'Mensajes y Alertas', href: '#', icon: Bell },`
).replace(
  `{ name: 'Día laborable', href: '#', icon: Calendar },`,
  `// { name: 'Día laborable', href: '#', icon: Calendar },`
).replace(
  `{ name: 'Avanzado', href: '#', icon: Settings },`,
  `// { name: 'Avanzado', href: '#', icon: Settings },`
).replace(
  `{ name: 'Da laborable', href: '#', icon: Calendar },`,
  `// { name: 'Día laborable', href: '#', icon: Calendar },`
);
fs.writeFileSync('src/app/dashboard/configuracion/layout.tsx', layoutCode);

let sedesCode = fs.readFileSync('src/app/dashboard/configuracion/sedes/SedesClient.tsx', 'utf-8');
// Fix Generar Master Key logic (remove window.confirm, just generate it)
sedesCode = sedesCode.replace(
  `if (!confirm('Estǭs seguro? Generar una nueva llave invalidarǭ la conexin actual de Niteo Sync en esta sede.')) {\n      return;\n    }`,
  ``
).replace(
  `if (!confirm('¿Estás seguro? Generar una nueva llave invalidará la conexión actual de Niteo Sync en esta sede.')) {\n      return;\n    }`,
  ``
);

// Add state for form success
sedesCode = sedesCode.replace(
  `const [newKeyVisible, setNewKeyVisible] = useState<{ id: string, key: string } | null>(null);`,
  `const [newKeyVisible, setNewKeyVisible] = useState<{ id: string, key: string } | null>(null);\n  const [successMsg, setSuccessMsg] = useState('');\n  const formRef = React.useRef<HTMLFormElement>(null);`
);

// Update form
sedesCode = sedesCode.replace(
  `<form action={async (formData) => {\n          const res = await crearSede(formData);\n          if (res?.error) alert(res.error);\n        }} className="max-w-xl space-y-4">`,
  `<form ref={formRef} action={async (formData) => {\n          const res = await crearSede(formData);\n          if (res?.error) {\n            alert(res.error);\n          } else {\n            setSuccessMsg('Sucursal creada exitosamente.');\n            formRef.current?.reset();\n            setTimeout(() => setSuccessMsg(''), 3000);\n          }\n        }} className="max-w-xl space-y-4">`
);

// Add success message
sedesCode = sedesCode.replace(
  `<div className="grid grid-cols-1 md:grid-cols-2 gap-4">`,
  `{successMsg && (\n            <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl text-emerald-400 text-sm mb-4">\n              {successMsg}\n            </div>\n          )}\n          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">`
);

fs.writeFileSync('src/app/dashboard/configuracion/sedes/SedesClient.tsx', sedesCode);

console.log("Applied UI fixes to Configuracion!");
