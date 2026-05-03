import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import React, { useRef, useCallback, useEffect } from "react";

// Utilidad para fusionar clases de Tailwind (shadcn/ui)
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Hook para autoincremento/decremento en pantallas táctiles
export function useAutoIncrement(action: () => void, delay = 400, intervalSpeed = 80) {
  const timeoutRef = useRef<any>(null);
  const intervalRef = useRef<any>(null);
  
  // Guardamos siempre la versión más reciente de la acción para evitar "stale closures"
  const savedAction = useRef(action);
  useEffect(() => {
    savedAction.current = action;
  }, [action]);

  const stop = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    timeoutRef.current = null;
    intervalRef.current = null;
  }, []);

  const start = useCallback((e: React.SyntheticEvent) => {
    // Evitamos comportamientos por defecto del navegador (scroll, zoom)
    // en touch devices para que el long-press sea capturado siempre
    if (e.type === 'touchstart') {
      // No llamamos a e.preventDefault() aquí para evitar errores de listeners pasivos,
      // confiamos en 'touch-none' y select-none en el CSS.
    }
    
    // Si ya hay algo corriendo, lo paramos por seguridad
    stop();
    
    savedAction.current();

    timeoutRef.current = setTimeout(() => {
      intervalRef.current = setInterval(() => {
        savedAction.current();
      }, intervalSpeed);
    }, delay);
  }, [delay, intervalSpeed, stop]);

  // Limpieza al desmontar
  useEffect(() => {
    return () => stop();
  }, [stop]);

  return {
    onMouseDown: (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      start(e);
    },
    onMouseUp: stop,
    onMouseLeave: stop,
    onTouchStart: start,
    onTouchEnd: stop,
    onTouchCancel: stop,
  };
}