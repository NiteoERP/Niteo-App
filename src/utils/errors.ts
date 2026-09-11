export function translateAuthError(errorMsg: string): string {
  if (!errorMsg) return 'Ocurrió un error inesperado.';
  
  const msg = errorMsg.toLowerCase();
  
  if (msg.includes('email not confirmed')) {
    return 'Debes confirmar tu correo electrónico antes de iniciar sesión. Revisa tu bandeja de entrada.';
  }
  if (msg.includes('invalid login credentials')) {
    return 'El correo electrónico o la contraseña son incorrectos.';
  }
  if (msg.includes('user already registered')) {
    return 'Ya existe una cuenta registrada con este correo electrónico.';
  }
  if (msg.includes('password should be at least')) {
    return 'La contraseña es demasiado corta. Debe tener al menos 6 caracteres.';
  }
  if (msg.includes('too many requests') || msg.includes('rate limit')) {
    return 'Por seguridad, has realizado demasiados intentos. Por favor, espera un par de minutos.';
  }
  if (msg.includes('new password should be different')) {
    return 'La nueva contraseña debe ser diferente a la contraseña anterior.';
  }
  if (msg.includes('token expired') || msg.includes('expired')) {
    return 'El enlace de recuperación ha expirado. Por favor, solicita uno nuevo.';
  }
  if (msg.includes('user not found')) {
    return 'No hemos encontrado un usuario con estos datos.';
  }
  if (msg.includes('weak password')) {
    return 'La contraseña es muy débil. Usa letras, números y símbolos.';
  }
  
  // Mensaje por defecto si no reconocemos el error exacto de Supabase
  return `Error: ${errorMsg}`;
}
