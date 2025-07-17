import { useState } from 'react';
import { AuthError, NetworkError, TimeoutError, SupabaseError } from '../utils/errors';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

interface NotificationState {
  isOpen: boolean;
  type: NotificationType;
  title: string;
  message: string;
}

export function useNotification() {
  const [notification, setNotification] = useState<NotificationState>({
    isOpen: false,
    type: 'info',
    title: '',
    message: ''
  });

  const showNotification = (
    type: NotificationType,
    title: string,
    message: string
  ) => {
    setNotification({
      isOpen: true,
      type,
      title,
      message
    });
  };

  const hideNotification = () => {
    setNotification(prev => ({
      ...prev,
      isOpen: false
    }));
  };

  // Convenience methods
  const showSuccess = (title: string, message: string) => {
    showNotification('success', title, message);
  };

  const showError = (title: string, message: string) => {
    showNotification('error', title, message);
  };

  /**
   * Mostra notificação de erro baseada no tipo de erro
   * @param error - Objeto de erro
   * @param defaultTitle - Título padrão se não puder determinar o tipo
   */
  const showErrorFromException = (error: Error, defaultTitle: string = 'Erro') => {
    console.log('🔔 [showErrorFromException] Processando erro:', error);
    
    if (error instanceof AuthError) {
      showNotification('warning', 'Sessão Expirada', 'Sua sessão expirou. Faça login novamente para continuar.');
    } else if (error instanceof NetworkError) {
      showNotification('error', 'Problema de Conexão', 'Verifique sua conexão com a internet e tente novamente.');
    } else if (error instanceof TimeoutError) {
      showNotification('warning', 'Tempo Esgotado', 'A requisição demorou muito para responder. Tente novamente.');
    } else if (error instanceof SupabaseError) {
      showNotification('error', 'Erro no Servidor', 'Ocorreu um problema no servidor. Tente novamente em alguns instantes.');
    } else {
      showNotification('error', defaultTitle, error.message || 'Ocorreu um erro inesperado.');
    }
  };

  const showWarning = (title: string, message: string) => {
    showNotification('warning', title, message);
  };

  const showInfo = (title: string, message: string) => {
    showNotification('info', title, message);
  };

  return {
    notification,
    showNotification,
    hideNotification,
    showSuccess,
    showError,
    showErrorFromException,
    showWarning,
    showInfo
  };
}