import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // 1. Validar Variables de Entorno
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.error('Faltan variables de entorno de Supabase');
    // Continuar sin bloquear para no dar 500, pero la app fallará en el cliente
    return NextResponse.next();
  }

  // 2. Configurar Supabase SSR Middleware
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // 3. Verificar Sesión Activa
  const { data: { user } } = await supabase.auth.getUser();

  // Si el usuario ya está autenticado y visita /login o /register, u otras rutas base
  if (user && (request.nextUrl.pathname === '/' || request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/register')) {
    // Determine the best default page based on role/permissions if possible,
    // otherwise let them go to /dashboard and let the dashboard handle it.
    // We will let them go to /dashboard for now, and handle the redirect inside /dashboard
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  // Proteger rutas /dashboard
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    if (!user) {
      // Si no hay usuario, forzar al login
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }

    // Permitir acceso a la ruta de billing siempre, para evitar loop infinito
    if (request.nextUrl.pathname.startsWith('/dashboard/billing')) {
      return supabaseResponse;
    }

    // 4. LEER PERFIL DIRECTAMENTE DEL JWT (Cero latencia, cero bases de datos)
    try {
      let empresa_id = user.app_metadata?.empresa_id;
      let rol = user.app_metadata?.user_role;
      
      if (!empresa_id) {
        const { data: pDb } = await supabase.from('perfiles').select('empresa_id, rol').eq('id', user.id).maybeSingle();
        if (pDb?.empresa_id) {
          empresa_id = pDb.empresa_id;
          rol = rol || pDb.rol;
        }
      }

      const profile = empresa_id ? { empresa_id, rol: rol || 'CAJERO' } : null;

      // Si el perfil no existe, forzarlos al Onboarding principal
      if (!profile) {
        if (!request.nextUrl.pathname.startsWith('/onboarding')) {
          const url = request.nextUrl.clone();
          url.pathname = '/onboarding';
          return NextResponse.redirect(url);
        }
        return supabaseResponse; 
      }

      // Evitar loop infinito en onboarding si ya tienen perfil
      if (request.nextUrl.pathname.startsWith('/onboarding')) {
        const url = request.nextUrl.clone();
        url.pathname = '/dashboard';
        return NextResponse.redirect(url);
      }

      if (profile) {
        // 3. Validación de Suscripción (Ahora leemos DB para LIFETIME bypass)
        const { data: sub } = await supabase.from('suscripciones_empresas').select('plan, estado').eq('empresa_id', profile.empresa_id).maybeSingle();
        const plan = (sub?.plan || '').toUpperCase();
        const estado = (sub?.estado || 'ACTIVA').toUpperCase();

        const isLifetime = plan === 'LIFETIME';
        const isActiva = !sub || estado === 'ACTIVA' || estado === 'TRIAL' || estado === 'ACTIVO';

        // Si NO es LIFETIME y tampoco esta ACTIVA/TRIAL, lo bloqueamos al billing
        if (!isLifetime && !isActiva) {
          const url = request.nextUrl.clone();
          url.pathname = '/dashboard/billing';
          return NextResponse.redirect(url);
        }

        // 4. HARDENING DE ROLES EN FRONTEND
        const protectedAdminRoutes = ['/dashboard/gastos', '/dashboard/finanzas', '/dashboard/cierre'];
        const isTryingToAccessAdminRoute = protectedAdminRoutes.some(route => request.nextUrl.pathname.startsWith(route));
        
        // La jerarquía exige MASTER o GERENTE
        if (isTryingToAccessAdminRoute && (profile.rol === 'CAJERO' || profile.rol === 'COMPRADOR')) {
          const url = request.nextUrl.clone();
          url.pathname = '/dashboard'; // Devolverlos al home permitido
          return NextResponse.redirect(url);
        }

        // 5. Redireccionar desde /dashboard a la página por defecto del usuario
        if (request.nextUrl.pathname === '/dashboard' && profile.rol !== 'MASTER') {
          const { data: profileDb } = await supabase.from('perfiles').select('permisos, rol').eq('id', user.id).maybeSingle();
          const effectiveRole = profileDb?.rol || profile.rol;
          if (effectiveRole !== 'MASTER') {
            const permisos = profileDb?.permisos || [];
            
            if (!permisos.includes('dashboard')) {
              const url = request.nextUrl.clone();
              if (permisos.includes('pos')) url.pathname = '/dashboard/ventas';
              else if (permisos.includes('caja')) url.pathname = '/dashboard/caja';
              else if (permisos.includes('inventario')) url.pathname = '/dashboard/inventario';
              else if (permisos.includes('compras')) url.pathname = '/dashboard/compras';
              else if (permisos.includes('reportes')) url.pathname = '/dashboard/informes';
              else if (permisos.includes('clientes')) url.pathname = '/dashboard/clientes';
              else url.pathname = '/dashboard/caja'; // Fallback

              return NextResponse.redirect(url);
            }
          }
        }
      }
    } catch (err) {
      console.error('Error no controlado en middleware:', err);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js|woff|woff2|ttf|otf)$).*)',
  ],
};
