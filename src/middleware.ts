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

    // 4. HARDENING SAAS (Comprobación de Suscripción) usando la nueva tabla "perfiles"
    try {
      const { data: profile, error: profileError } = await supabase
        .from('perfiles')
        .select('empresa_id, rol')
        .eq('id', user.id)
        .single();
      
      if (profileError) {
        console.error('Error al obtener perfil en middleware:', profileError);
      }

      if (profile) {
        // Validar suscripción
        const { data: sub } = await supabase
          .from('suscripciones_empresas')
          .select('estado')
          .eq('empresa_id', profile.empresa_id)
          .single();

        // Si no tiene suscripción o está vencida/suspendida -> Bloqueo total
        if (!sub || sub.estado === 'VENCIDA' || sub.estado === 'SUSPENDIDA') {
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
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
