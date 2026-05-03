import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { useRef, useCallback } from "react";

// Utilidad para fusionar clases de Tailwind (shadcn/ui)
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Hook para autoincremento/decremento en pantallas táctiles
export function useAutoIncrement(action: () => void, delay = 400, intervalSpeed = 80) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const start = useCallback((e: React.SyntheticEvent) => {
    // Evita el comportamiento por defecto en móviles (como el scroll o selección)
    if (e.type === 'touchstart') {
      e.preventDefault(); 
    }
    
    // 1. Ejecutar la acción inmediatamente al tocar
    action();

    // 2. Iniciar el temporizador para detectar el "long press"
    timeoutRef.current = setTimeout(() => {
      // 3. Si sigue presionado después del delay, iniciar la repetición rápida
      intervalRef.current = setInterval(() => {
        action();
      }, intervalSpeed);
    }, delay);
  }, [action, delay, intervalSpeed]);

  const stop = useCallback(() => {
    // Limpiar ambos temporizadores al soltar el botón
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
