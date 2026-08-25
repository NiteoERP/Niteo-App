
const fs = require('fs');
let content = fs.readFileSync('src/middleware.ts', 'utf8');

const replacement = \
        // 3. Validacion de Suscripcion (Ahora leemos DB para LIFETIME bypass)
        const { data: sub } = await supabase.from('suscripciones_empresas').select('plan, estado').eq('empresa_id', profile.empresa_id).single();
        const isLifetime = sub?.plan === 'LIFETIME';
        const isActiva = sub?.estado === 'activa' || sub?.estado === 'ACTIVA';

        // Si NO es LIFETIME y tampoco esta ACTIVA, lo bloqueamos al billing
        if (!isLifetime && !isActiva) {
          const url = request.nextUrl.clone();
          url.pathname = '/dashboard/billing';
          return NextResponse.redirect(url);
        }
\;

// Replace the previous JWT check with DB check
content = content.replace(/const subscription_status = user\.app_metadata\?\.subscription_status;[\s\S]*?(?=\/\/ 4\. HARDENING)/g, replacement);

fs.writeFileSync('src/middleware.ts', content, 'utf8');
console.log('Middleware patched');

