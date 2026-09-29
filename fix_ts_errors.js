const fs = require('fs');
let code = fs.readFileSync('c:/Users/Usuario/Documents/Niteo App/niteo-pos/frontend/src/TerminalPOS.tsx', 'utf8');

code = code.replace("catch (e) {", "catch (e: any) {");
code = code.replace("showToast(\"Error al cargar historial: \" + (e.message || e), 'error');", "setResultado({ ok: false, msg: \"Error al cargar historial: \" + (e.message || e) });");

code = code.replace("catch(e) {", "catch (e: any) {");
code = code.replace("showToast(\"Error cargando detalles\", 'error');", "setResultado({ ok: false, msg: \"Error cargando detalles\" });");

fs.writeFileSync('c:/Users/Usuario/Documents/Niteo App/niteo-pos/frontend/src/TerminalPOS.tsx', code);
