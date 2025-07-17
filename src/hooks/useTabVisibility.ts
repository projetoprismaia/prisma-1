import { useState, useEffect, useRef } from 'react';

interface UseTabVisibilityReturn {
  isTabVisible: boolean;
  wasTabHidden: boolean;
  onTabVisible: (callback: () => void) => void;
}

export function useTabVisibility(): UseTabVisibilityReturn {
  const [isTabVisible, setIsTabVisible] = useState(!document.hidden);
  const [wasTabHidden, setWasTabHidden] = useState(false);
  const callbacksRef = useRef<(() => void)[]>([]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = !document.hidden;
      
      if (!isTabVisible && isVisible) {
        setWasTabHidden(true);
        
        // Executar todos os callbacks registrados
        callbacksRef.current.forEach(callback => {
          try {
            callback();
          } catch (error) {
            console.error('Erro no callback de visibilidade:', error);
          }
        });
      } else if (isTabVisible && !isVisible) {
        setWasTabHidden(false);
      }
      setIsTabVisible(isVisible);
    };

    // Adicionar listener para mudanças de visibilidade
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Também escutar eventos de foco da janela como fallback
    const handleFocus = () => {
      if (!document.hidden && !isTabVisible) {
        handleVisibilityChange();
      }
    };

    const handleBlur = () => {
      if (document.hidden && isTabVisible) {
        setIsTabVisible(false);
      }
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, [isTabVisible]); // Apenas isTabVisible como dependência

  const onTabVisible = (callback: () => void) => {
    callbacksRef.current.push(callback);
  };

  // Limpar flag após um tempo
  useEffect(() => {
    if (wasTabHidden) {
      const timer = setTimeout(() => {
        setWasTabHidden(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [wasTabHidden]);

  return {
    isTabVisible,
    wasTabHidden,
    onTabVisible
  };
}