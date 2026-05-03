import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { useRef, useCallback, useEffect } from "react";

// Utilidad para fusionar clases de Tailwind (shadcn/ui)
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Hook para autoincremento/decremento en pantallas táctiles
export function useAutoIncrement(action: () => void, delay = 400, intervalSpeed = 80) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Guardamos siempre la versión más reciente de la acción para evitar "stale closures" en React
  const savedAction = useRef(action);
  useEffect(() => {
    savedAction.current = action;
  }, [action]);

  const start = useCallback((e: React.SyntheticEvent) => {
    if (e.type === 'touchstart') {
      e.preventDefault(); 
    }
    
    savedAction.current();

    timeoutRef.current = setTimeout(() => {
      intervalRef.current = setInterval(() => {
        savedAction.current();
      }, intervalSpeed);
    }, delay);
  }, [delay, intervalSpeed]);

  const stop = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  return {
    onMouseDown: start,
    onMouseUp: stop,
    onMouseLeave: stop,
    onTouchStart: start,
    onTouchEnd: stop,
  };
}