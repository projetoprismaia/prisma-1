interface CacheEntry<T> {
  data: T;
  timestamp: number;
  key: string;
}

interface CacheConfig {
  ttl: number; // Time to live em milissegundos
  maxSize: number; // Número máximo de entradas no cache
}

class DataCache {
  private cache = new Map<string, CacheEntry<any>>();
  private config: CacheConfig = {
    ttl: 5 * 60 * 1000, // 5 minutos por padrão
    maxSize: 100 // Máximo 100 entradas
  };

  constructor(config?: Partial<CacheConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
    
    // Limpeza automática a cada 10 minutos
    setInterval(() => {
      this.cleanup();
    }, 10 * 60 * 1000);
  }

  /**
   * Obtém dados do cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      console.log(`🔍 [DataCache] Cache MISS para chave: ${key}`);
      return null;
    }

    const isExpired = this.isStale(key);
    
    if (isExpired) {
      console.log(`⏰ [DataCache] Cache HIT (STALE) para chave: ${key}`);
    } else {
      console.log(`✅ [DataCache] Cache HIT (FRESH) para chave: ${key}`);
    }
    
    return entry.data;
  }

  /**
   * Verifica se uma entrada do cache está expirada (stale)
   */
  isStale(key: string): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return true; // Se não existe, considera como stale
    }

    const now = Date.now();
    return now - entry.timestamp > this.config.ttl;
  }

  /**
   * Armazena dados no cache
   */
  set<T>(key: string, data: T): void {
    // Verificar se precisa remover entradas antigas
    if (this.cache.size >= this.config.maxSize) {
      this.evictOldest();
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      key
    };

    this.cache.set(key, entry);
    console.log(`💾 [DataCache] Dados armazenados no cache para chave: ${key}`);
  }

  /**
   * Remove uma entrada específica do cache
   */
  invalidate(key: string): void {
    const deleted = this.cache.delete(key);
    if (deleted) {
      console.log(`🗑️ [DataCache] Cache invalidado para chave: ${key}`);
    }
  }

  /**
   * Remove múltiplas entradas baseadas em um padrão
   */
  invalidatePattern(pattern: string): void {
    const keysToDelete: string[] = [];
    
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => {
      this.cache.delete(key);
      console.log(`🗑️ [DataCache] Cache invalidado por padrão para chave: ${key}`);
    });

    if (keysToDelete.length > 0) {
      console.log(`🧹 [DataCache] ${keysToDelete.length} entradas invalidadas com padrão: ${pattern}`);
    }
  }

  /**
   * Limpa todo o cache
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    console.log(`🧹 [DataCache] Cache completamente limpo (${size} entradas removidas)`);
  }

  /**
   * Remove entradas expiradas
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.config.ttl) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => {
      this.cache.delete(key);
    });

    if (keysToDelete.length > 0) {
      console.log(`🧹 [DataCache] Limpeza automática: ${keysToDelete.length} entradas expiradas removidas`);
    }
  }

  /**
   * Remove a entrada mais antiga quando o cache está cheio
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTimestamp = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      console.log(`🗑️ [DataCache] Entrada mais antiga removida: ${oldestKey}`);
    }
  }

  /**
   * Obtém estatísticas do cache
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      ttl: this.config.ttl,
      keys: Array.from(this.cache.keys())
    };
  }

  /**
   * Verifica se uma chave existe no cache (independente de expiração)
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Obtém dados do cache mesmo se expirados (útil para fallback)
   */
  getStale<T>(key: string): T | null {
    const entry = this.cache.get(key);
    return entry ? entry.data : null;
  }

  /**
   * Força a limpeza de todos os listeners e timers
   */
  destroy(): void {
    this.cache.clear();
    console.log('🗑️ [DataCache] Cache destruído e limpo');
  }
}

// Instância singleton do cache
export const dataCache = new DataCache({
  ttl: 3 * 60 * 1000, // 3 minutos para dados dinâmicos
  maxSize: 50
});

// Funções utilitárias para gerar chaves de cache consistentes
export const cacheKeys = {
  // Usuários (Admin)
  users: () => 'users_all',
  userPatientCounts: () => 'user_patient_counts',
  
  // Pacientes
  patients: (userId: string) => `patients_user_${userId}`,
  
  // Sessões
  sessions: (userId: string) => `sessions_user_${userId}`,
  sessionDetail: (sessionId: string) => `session_detail_${sessionId}`,
  
  // Dashboard
  dashboardAdmin: () => 'dashboard_admin_data',
  dashboardUser: (userId: string) => `dashboard_user_${userId}`,
  
  // Dados específicos
  audioDevices: () => 'audio_devices',
  userProfile: (userId: string) => `user_profile_${userId}`
};

// Hook personalizado para usar cache com SWR pattern
export function useCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: {
    enabled?: boolean;
    onSuccess?: (data: T) => void;
    onError?: (error: any) => void;
  } = {}
) {
  const { enabled = true, onSuccess, onError } = options;
  
  const fetchWithCache = async (): Promise<T> => {
    if (!enabled) {
      throw new Error('Fetch disabled');
    }

    // 1. Tentar obter dados do cache primeiro (pode ser stale ou fresh)
    const cachedData = dataCache.get<T>(key);
    const isDataStale = dataCache.isStale(key);
    
    // 2. Se tiver dados no cache, usar imediatamente (SWR pattern)
    if (cachedData && onSuccess) {
      console.log(`📦 [useCachedData] Usando dados do cache (${isDataStale ? 'STALE' : 'FRESH'}) para: ${key}`);
      onSuccess(cachedData);
    }
    
    // 3. Se dados estão stale ou não existem, buscar dados frescos em background
    if (isDataStale || !cachedData) {
      try {
        console.log(`🔄 [useCachedData] Buscando dados frescos para: ${key}`);
        const freshData = await fetcher();
        
        // 4. Atualizar cache com dados frescos
        dataCache.set(key, freshData);
        
        // 5. Se não tínhamos dados em cache, ou se os dados mudaram, notificar
        if (!cachedData || JSON.stringify(cachedData) !== JSON.stringify(freshData)) {
          console.log(`✨ [useCachedData] Dados atualizados para: ${key}`);
          if (onSuccess) {
            onSuccess(freshData);
          }
        }
        
        return freshData;
      } catch (error) {
        console.error(`❌ [useCachedData] Erro ao buscar dados para ${key}:`, error);
        
        // 6. Em caso de erro, usar dados do cache como fallback (se existirem)
        if (cachedData) {
          console.log(`🔄 [useCachedData] Usando dados do cache como fallback para: ${key}`);
          return cachedData;
        }
        
        // 7. Se não tiver fallback, propagar erro
        if (onError) {
          onError(error);
        }
        throw error;
      }
    }
    
    // 8. Se dados estão fresh e existem, retornar do cache
    if (cachedData) {
      return cachedData;
    }
    
    // 9. Fallback final - não deveria chegar aqui
    throw new Error(`Dados não disponíveis para: ${key}`);
  };

  return { fetchWithCache };
}