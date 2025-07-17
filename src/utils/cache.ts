/**
 * Sistema de cache local básico para dados do Supabase
 * Mantém dados em memória por um período configurável
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

class LocalCache {
  private cache = new Map<string, CacheEntry<any>>();
  private defaultTTL = 5 * 60 * 1000; // 5 minutos em millisegundos

  /**
   * Armazena dados no cache com TTL configurável
   * @param key - Chave única para os dados
   * @param data - Dados a serem armazenados
   * @param ttl - Tempo de vida em millisegundos (opcional)
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const now = Date.now();
    const timeToLive = ttl || this.defaultTTL;
    
    console.log(`💾 [Cache] Armazenando dados para chave: ${key}, TTL: ${timeToLive}ms`);
    
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + timeToLive
    });
  }

  /**
   * Recupera dados do cache se ainda válidos
   * @param key - Chave dos dados
   * @returns Dados do cache ou null se expirado/inexistente
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      console.log(`📭 [Cache] Nenhum dado encontrado para chave: ${key}`);
      return null;
    }

    const now = Date.now();
    
    if (now > entry.expiresAt) {
      console.log(`⏰ [Cache] Dados expirados para chave: ${key}`);
      this.cache.delete(key);
      return null;
    }

    const age = now - entry.timestamp;
    console.log(`📦 [Cache] Dados encontrados para chave: ${key}, idade: ${age}ms`);
    
    return entry.data;
  }

  /**
   * Remove dados específicos do cache
   * @param key - Chave dos dados a serem removidos
   */
  invalidate(key: string): void {
    console.log(`🗑️ [Cache] Invalidando cache para chave: ${key}`);
    this.cache.delete(key);
  }

  /**
   * Remove todos os dados do cache
   */
  clear(): void {
    console.log('🧹 [Cache] Limpando todo o cache');
    this.cache.clear();
  }

  /**
   * Verifica se uma chave existe no cache e ainda é válida
   * @param key - Chave a ser verificada
   * @returns true se existe e é válida, false caso contrário
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }

    const now = Date.now();
    
    if (now > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Retorna estatísticas do cache
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Instância singleton do cache
export const cache = new LocalCache();

/**
 * Gera chave de cache baseada no usuário e tipo de dados
 * @param userId - ID do usuário
 * @param dataType - Tipo de dados (ex: 'patients', 'sessions')
 * @param filters - Filtros adicionais (opcional)
 * @returns Chave única para o cache
 */
export function generateCacheKey(userId: string, dataType: string, filters?: Record<string, any>): string {
  const baseKey = `${userId}:${dataType}`;
  
  if (filters && Object.keys(filters).length > 0) {
    const filterString = Object.entries(filters)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('&');
    return `${baseKey}:${filterString}`;
  }
  
  return baseKey;
}