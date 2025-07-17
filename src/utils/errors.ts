/**
 * Classes de erro personalizadas para diferentes tipos de falha
 * Permite tratamento específico e mensagens de notificação mais claras
 */

export class AuthError extends Error {
  constructor(message: string = 'Erro de autenticação') {
    super(message);
    this.name = 'AuthError';
  }
}

export class NetworkError extends Error {
  constructor(message: string = 'Erro de conexão de rede') {
    super(message);
    this.name = 'NetworkError';
  }
}

export class TimeoutError extends Error {
  constructor(message: string = 'Timeout na requisição') {
    super(message);
    this.name = 'TimeoutError';
  }
}

export class SupabaseError extends Error {
  constructor(message: string = 'Erro no servidor') {
    super(message);
    this.name = 'SupabaseError';
  }
}

/**
 * Função utilitária para classificar erros do Supabase
 * @param error - Erro original do Supabase
 * @returns Erro classificado com tipo específico
 */
export function classifySupabaseError(error: any): Error {
  console.log('🔍 [classifySupabaseError] Classificando erro:', error);
  
  if (!error) {
    return new SupabaseError('Erro desconhecido');
  }

  const message = error.message || error.toString();
  const code = error.code;

  // Erros de autenticação
  if (code === 'PGRST301' || message.includes('JWT') || message.includes('auth') || message.includes('unauthorized')) {
    console.log('🔐 [classifySupabaseError] Erro de autenticação detectado');
    return new AuthError(`Sessão expirada: ${message}`);
  }

  // Erros de rede
  if (message.includes('fetch') || message.includes('network') || message.includes('connection') || code === 'NETWORK_ERROR') {
    console.log('🌐 [classifySupabaseError] Erro de rede detectado');
    return new NetworkError(`Problema de conexão: ${message}`);
  }

  // Erros de timeout
  if (message.includes('timeout') || message.includes('aborted')) {
    console.log('⏱️ [classifySupabaseError] Erro de timeout detectado');
    return new TimeoutError(`Requisição demorou muito: ${message}`);
  }

  // Outros erros do Supabase
  console.log('🔧 [classifySupabaseError] Erro genérico do Supabase');
  return new SupabaseError(`Erro no servidor: ${message}`);
}