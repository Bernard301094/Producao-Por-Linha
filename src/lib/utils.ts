import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import React, { useRef, useCallback, useEffect } from "react";

// Utilidad para fusionar clases de Tailwind (shadcn/ui)
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Utilidad para crear un hash SHA-256 de forma asíncrona
export async function hashPassword(password: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Hook para autoincremento/decremento en pantallas táctiles
export function useAutoIncrement(action: () => void, delay = 700, intervalSpeed = 150) {
  const timeoutRef = useRef<any>(null);
  const intervalRef = useRef<any>(null);
  const isTouchRef = useRef(false);
  
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

  const startTouch = useCallback((e: React.SyntheticEvent) => {
    isTouchRef.current = true;
    stop();
    // For touch: fire immediately, then auto-repeat after delay
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
    // Mouse on PC: only fire once cleanly on mouseUp (no auto-repeat)
    onMouseDown: (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      isTouchRef.current = false;
    },
    onMouseUp: (e: React.MouseEvent) => {
      if (!isTouchRef.current) {
        savedAction.current();
      }
    },
    onMouseLeave: stop,
    // Touch on mobile/tablet: hold-to-repeat behavior
    onTouchStart: startTouch,
    onTouchEnd: stop,
    onTouchCancel: stop,
  };
}