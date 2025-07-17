/**
 * Sistema de Log Centralizado para Diagnóstico
 * Monitora autenticação, navegação e carregamento de dados
 */

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
export type LogCategory = 'AUTH' | 'NAV' | 'DATA' | 'UI' | 'SUPABASE' | 'SESSION';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: LogCategory;
  message: string;
  data?: any;
  userId?: string;
  sessionId: string;
}

class Logger {
  private logs: LogEntry[] = [];
  private sessionId: string;
  private maxLogs = 1000; // Manter apenas os últimos 1000 logs
  private isEnabled = true;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.log('INFO', 'SESSION', 'Logger inicializado', { sessionId: this.sessionId });
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private formatTimestamp(): string {
    const now = new Date();
    return now.toISOString().replace('T', ' ').substr(0, 23);
  }

  private log(level: LogLevel, category: LogCategory, message: string, data?: any, userId?: string) {
    if (!this.isEnabled) return;

    const entry: LogEntry = {
      timestamp: this.formatTimestamp(),
      level,
      category,
      message,
      data,
      userId,
      sessionId: this.sessionId
    };

    this.logs.push(entry);

    // Manter apenas os logs mais recentes
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Console output com cores
    const color = this.getConsoleColor(level);
    const prefix = `[${entry.timestamp}] [${category}] [${level}]`;
    
    if (data) {
      console.log(`%c${prefix} ${message}`, `color: ${color}`, data);
    } else {
      console.log(`%c${prefix} ${message}`, `color: ${color}`);
    }

    // Salvar no localStorage para persistência
    this.saveToStorage();
  }

  private getConsoleColor(level: LogLevel): string {
    switch (level) {
      case 'DEBUG': return '#6B7280';
      case 'INFO': return '#3B82F6';
      case 'WARN': return '#F59E0B';
      case 'ERROR': return '#EF4444';
      default: return '#000000';
    }
  }

  private saveToStorage() {
    try {
      const recentLogs = this.logs.slice(-100); // Salvar apenas os 100 mais recentes
      localStorage.setItem('prisma_logs', JSON.stringify(recentLogs));
    } catch (error) {
      console.warn('Erro ao salvar logs no localStorage:', error);
    }
  }

  // Métodos públicos para diferentes tipos de log
  debug(category: LogCategory, message: string, data?: any, userId?: string) {
    this.log('DEBUG', category, message, data, userId);
  }

  info(category: LogCategory, message: string, data?: any, userId?: string) {
    this.log('INFO', category, message, data, userId);
  }

  warn(category: LogCategory, message: string, data?: any, userId?: string) {
    this.log('WARN', category, message, data, userId);
  }

  error(category: LogCategory, message: string, data?: any, userId?: string) {
    this.log('ERROR', category, message, data, userId);
  }

  // Métodos específicos para diferentes cenários
  authEvent(event: string, data?: any, userId?: string) {
    this.info('AUTH', `Auth Event: ${event}`, data, userId);
  }

  navigationEvent(from: string, to: string, userId?: string) {
    this.info('NAV', `Navigation: ${from} → ${to}`, { from, to }, userId);
  }

  dataLoad(component: string, status: 'start' | 'success' | 'error', data?: any, userId?: string) {
    const level = status === 'error' ? 'ERROR' : 'INFO';
    this.log(level, 'DATA', `Data Load [${component}]: ${status}`, data, userId);
  }

  supabaseCall(operation: string, table?: string, status?: 'start' | 'success' | 'error', data?: any, userId?: string) {
    const level = status === 'error' ? 'ERROR' : 'DEBUG';
    const message = table ? `Supabase [${table}]: ${operation}` : `Supabase: ${operation}`;
    this.log(level, 'SUPABASE', message, data, userId);
  }

  uiEvent(component: string, event: string, data?: any, userId?: string) {
    this.debug('UI', `UI Event [${component}]: ${event}`, data, userId);
  }

  sessionEvent(event: string, data?: any, userId?: string) {
    this.info('SESSION', `Session Event: ${event}`, data, userId);
  }

  // Métodos utilitários
  getLogs(category?: LogCategory, level?: LogLevel): LogEntry[] {
    let filteredLogs = this.logs;

    if (category) {
      filteredLogs = filteredLogs.filter(log => log.category === category);
    }

    if (level) {
      filteredLogs = filteredLogs.filter(log => log.level === level);
    }

    return filteredLogs;
  }

  getRecentLogs(minutes: number = 5): LogEntry[] {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    return this.logs.filter(log => new Date(log.timestamp) > cutoff);
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  clearLogs() {
    this.logs = [];
    localStorage.removeItem('prisma_logs');
    this.info('SESSION', 'Logs limpos');
  }

  // Carregar logs do localStorage na inicialização
  loadFromStorage() {
    try {
      const stored = localStorage.getItem('prisma_logs');
      if (stored) {
        const storedLogs = JSON.parse(stored);
        this.info('SESSION', 'Logs carregados do localStorage', { count: storedLogs.length });
      }
    } catch (error) {
      this.warn('SESSION', 'Erro ao carregar logs do localStorage', error);
    }
  }

  // Método para debug em produção
  getDebugInfo() {
    return {
      sessionId: this.sessionId,
      totalLogs: this.logs.length,
      recentErrors: this.getLogs(undefined, 'ERROR').slice(-10),
      recentWarnings: this.getLogs(undefined, 'WARN').slice(-10),
      authLogs: this.getLogs('AUTH').slice(-20),
      navigationLogs: this.getLogs('NAV').slice(-10)
    };
  }
}

// Instância singleton
export const logger = new Logger();

// Carregar logs salvos na inicialização
logger.loadFromStorage();

// Expor globalmente para debug
if (typeof window !== 'undefined') {
  (window as any).prismaLogger = logger;
}