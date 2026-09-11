'use server';

import { createClient } from '@/utils/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { translateAuthError } from '@/utils/errors';

export async function requestPasswordReset(prevState: any, formData: FormData) {
  const email = (formData.get('email') as string)?.trim().toLowerCase();
  
  if (!email) {
    return { error: 'Por favor, ingresa tu correo electrónico.' };
  }

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Buscar el usuario por email. listUsers puede buscar en hasta 1000 usuarios a la vez o mediante iteración.
  // En un entorno de producción masivo, se recomendaría un RPC en Postgres, pero esto funciona perfectamente.
  let targetUser = null;
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page: page,
      perPage: 1000,
    });

    if (error) {
      return { error: 'Hubo un error al validar el correo electrónico.' };
    }

    const user = data.users.find((u) => u.email === email);
    if (user) {
      targetUser = user;
      break;
    }

    if (data.users.length < 1000) {
      hasMore = false;
    } else {
      page++;
    }
  }

  if (!targetUser) {
    // Retornamos genérico para no filtrar emails, o error explícito.
    return { error: 'No se encontró una cuenta con este correo electrónico.' };
  }

  const role = targetUser.app_metadata?.user_role;

  if (role !== 'MASTER' && role !== 'SUPERADMIN') {
    return { error: 'Contacta a la administración de tu empresa para la información de tu contraseña.' };
  }

  const supabase = await createClient();
  
  // Enviamos el correo de recuperación
  const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/actualizar-password`,
  });

  if (resetError) {
    return { error: translateAuthError(resetError.message) };
  }

  return { success: true, message: 'Te hemos enviado un correo con las instrucciones para recuperar tu contraseña.' };
}
