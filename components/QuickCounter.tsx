import React from 'react';
import { Input } from './ui/input';
import { cn } from '../src/lib/utils';

export const QuickCounter = ({ value, onChange, label, className }: any) => {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && <label className="block text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest pl-1">{label}</label>}
      <Input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        value={value}
        onChange={e => onChange(e.target.value.replace(/\D/g, ''))}
        placeholder="0"
        className="w-full h-[46px] text-center text-lg font-black font-mono bg-white dark:bg-zinc-950 border-2 border-zinc-200 dark:border-zinc-800/80 rounded-xl focus-visible:border-zinc-950 focus-visible:ring-0 shadow-sm transition-colors"
      />
    </div>
  );
};
