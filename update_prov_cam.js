const fs = require('fs');
let content = fs.readFileSync('src/app/dashboard/proveedores/page.tsx', 'utf8');

const regex = /<input type="file" accept="image\/\*" className="hidden" ref=\{fileInputRefFac\} onChange=\{handleScanInvoiceFac\} \/>\r?\n\s*<button \r?\n\s*onClick=\{\(\) => fileInputRefFac\.current\?\.click\(\)\}\r?\n\s*disabled=\{isScanningFac\}\r?\n\s*className="bg-indigo-600\/20 hover:bg-indigo-600\/30 text-indigo-400 border border-indigo-500\/30 px-3 py-1\.5 rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50 text-xs"\r?\n\s*title="Autocompletar con Foto \(IA\)"\r?\n\s*>\r?\n\s*\{isScanningFac \? <Loader2 size=\{14\} className="animate-spin" \/> : <Camera size=\{14\} \/>\}\r?\n\s*<span className="font-medium">\{isScanningFac \? 'Analizando\.\.\.' : 'Escanear Foto'\}<\/span>\r?\n\s*<\/button>/;

const replacement = `<input type="file" accept="image/*" className="hidden" ref={fileInputRefFac} onChange={handleScanInvoiceFac} />
                    <input type="file" accept="image/*" capture="environment" className="hidden" ref={fileInputRefFacCam} onChange={handleScanInvoiceFac} />
                    <button 
                      onClick={() => fileInputRefFacCam.current?.click()}
                      disabled={isScanningFac}
                      className="bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 px-3 py-1.5 rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50 text-xs"
                      title="Tomar Foto con Cámara"
                    >
                      {isScanningFac ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                      <span className="font-medium">{isScanningFac ? 'Analizando...' : 'Cámara'}</span>
                    </button>
                    <button 
                      onClick={() => fileInputRefFac.current?.click()}
                      disabled={isScanningFac}
                      className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 px-3 py-1.5 rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50 text-xs"
                      title="Elegir de Galería"
                    >
                      <span className="font-medium">Galería</span>
                    </button>`;

content = content.replace(regex, replacement);
fs.writeFileSync('src/app/dashboard/proveedores/page.tsx', content, 'utf8');