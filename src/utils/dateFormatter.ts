/**
 * Utilitários para formatação de datas no padrão brasileiro com "aaaa"
 */

/**
 * Formata uma data para o padrão dd/mm/aaaa
 * @param dateInput - String de data ou objeto Date
 * @returns String formatada como dd/mm/yyyy
 */
export function formatToDDMM(dateInput: string | Date): string {
  try {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    
    if (isNaN(date.getTime())) {
      return 'Data inválida';
    }
    
    // Formatar para dd/mm/yyyy
    return date.toLocaleDateString('pt-BR');
  } catch (error) {
    return 'Data inválida';
  }
}

/**
 * Formata uma data e hora para o padrão dd/mm/yyyy HH:mm:ss
 * @param dateInput - String de data ou objeto Date
 * @returns String formatada como dd/mm/yyyy HH:mm:ss
 */
export function formatDateTime(dateInput: string | Date): string {
  try {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    
    if (isNaN(date.getTime())) {
      return 'Data inválida';
    }
    
    // Formatar para dd/mm/yyyy HH:mm:ss
    return date.toLocaleString('pt-BR');
  } catch (error) {
    return 'Data inválida';
  }
}

/**
 * Formata uma data e hora para o padrão dd/mm/yyyy HH:mm (sem segundos)
 * @param dateInput - String de data ou objeto Date
 * @returns String formatada como dd/mm/yyyy HH:mm
 */
export function formatDateTimeShort(dateInput: string | Date): string {
  try {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    
    if (isNaN(date.getTime())) {
      return 'Data inválida';
    }
    
    // Formatar para dd/mm/yyyy HH:mm
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    return 'Data inválida';
  }
}