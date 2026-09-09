const fs = require('fs');
let p = fs.readFileSync('src/app/dashboard/proveedores/page.tsx', 'utf8');

const targetStr = `              </button>
            </div>
          </div>
        </div>
      )}`;

const replaceStr = `              </button>
            </div>
              )}
          </div>
        </div>
      )}`;

p = p.replace(targetStr, replaceStr);

fs.writeFileSync('src/app/dashboard/proveedores/page.tsx', p);
console.log('✅ syntax fixed again');
