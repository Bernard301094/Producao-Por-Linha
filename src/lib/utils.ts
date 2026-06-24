import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import React, { useRef, useCallback, useEffect } from "react";

// Utilidad para fusionar clases de Tailwind (shadcn/ui)
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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
      if (e.button !== 0 || isTouchRef.current) return;
      savedAction.current();
    },
    onMouseLeave: stop,
    // Touch on mobile/tablet: hold-to-repeat behavior
    onTouchStart: startTouch,
    onTouchEnd: stop,
    onTouchCancel: stop,
  };
}

export function formatLinhaName(linha: string): string {
  if (!linha) return '';
  const match = linha.match(/\d+/);
  if (!match) return linha;
  const num = parseInt(match[0], 10);
  return `Linha ${num < 10 ? '0' + num : num}`;
}

export function getLinhaColors(linhaStr: string) {
  let hash = 0;
  const str = formatLinhaName(linhaStr).toLowerCase();
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  // Base hue based on string hash
  const h = Math.abs(hash) % 360;
  // Dynamic but readable colors:
  // Background: pastel and distinct
  // Text: darker shade of the same hue for contrast
  return {
    bg: `hsl(${h}, 85%, 90%)`,
    text: `hsl(${h}, 90%, 25%)`,
    border: `hsl(${h}, 80%, 75%)`
  };
}