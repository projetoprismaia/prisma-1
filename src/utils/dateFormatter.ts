/**
 * Utilitários para formatação de datas no padrão brasileiro com "aaaa"
 */

/**
 * Formata uma data para o padrão dd/mm/aaaa
 * @param dateInput - String de data ou objeto Date
 * @returns String formatada como dd/mm/aaaa
 */
export function formatToDDMMAAAA(dateInput: string | Date): string {
  try {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    
    if (isNaN(date.getTime())) {
      return 'Data inválida';
    }
    
    // Formatar para dd/mm/yyyy primeiro
    const formatted = date.toLocaleDateString('pt-BR');
    
    // Substituir yyyy por aaaa
    return formatted.replace(/(\d{4})$/, 'aaaa');
  } catch (error) {
    console.error('Erro ao formatar data:', error);
    return 'Data inválida';
  }
}

/**
 * Formata uma data e hora para o padrão dd/mm/aaaa HH:mm:ss
 * @param dateInput - String de data ou objeto Date
 * @returns String formatada como dd/mm/aaaa HH:mm:ss
 */
export function formatDateTimeToDDMMAAAA(dateInput: string | Date): string {
  try {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    
    if (isNaN(date.getTime())) {
      return 'Data inválida';
    }
    
    // Formatar para dd/mm/yyyy HH:mm:ss primeiro
    const formatted = date.toLocaleString('pt-BR');
    
    // Substituir yyyy por aaaa
    return formatted.replace(/(\d{4})/, 'aaaa');
  } catch (error) {
    console.error('Erro ao formatar data e hora:', error);
    return 'Data inválida';
  }
}

/**
 * Formata uma data e hora para o padrão dd/mm/aaaa HH:mm (sem segundos)
 * @param dateInput - String de data ou objeto Date
 * @returns String formatada como dd/mm/aaaa HH:mm
 */
export function formatDateTimeShortToDDMMAAAA(dateInput: string | Date): string {
  try {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    
    if (isNaN(date.getTime())) {
      return 'Data inválida';
    }
    
    // Formatar para dd/mm/yyyy HH:mm primeiro
    const formatted = date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    // Substituir yyyy por aaaa
    return formatted.replace(/(\d{4})/, 'aaaa');
  } catch (error) {
    console.error('Erro ao formatar data e hora curta:', error);
    return 'Data inválida';
  }
}