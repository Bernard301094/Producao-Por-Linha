import React from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { cn, useAutoIncrement } from '../src/lib/utils';
import { motion } from 'motion/react';
import { Minus, Plus } from 'lucide-react';

export const QuickCounter = ({ value, onChange, label, className }: any) => {
  const handleMinus10 = useAutoIncrement(() => {
    const current = parseInt(value || '0', 10);
    onChange(Math.max(0, current - 10).toString());
  });

  const handleMinus1 = useAutoIncrement(() => {
    const current = parseInt(value || '0', 10);
    onChange(Math.max(0, current - 1).toString());
  });

  const handlePlus1 = useAutoIncrement(() => {
    const current = parseInt(value || '0', 10);
    onChange((current + 1).toString());
  });

  const handlePlus10 = useAutoIncrement(() => {
    const current = parseInt(value || '0', 10);
    onChange((current + 10).toString());
  });

  return (
    <div className={cn("space-y-2", className)}>
      {label && <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest pl-1">{label}</label>}
      <div className="grid grid-cols-[1fr_1fr_auto_1fr_1fr] gap-1 items-center w-full">
        <motion.div whileTap={{ scale: 0.95 }} className="w-full">
          <Button 
            type="button"
            variant="outline" 
            {...handleMinus10}
            onContextMenu={(e) => e.preventDefault()}
            className="w-full h-14 text-xs font-bold border-2 border-zinc-200/80 bg-white hover:bg-zinc-50 hover:text-zinc-900 px-0 select-none touch-none rounded-xl rounded-r-none focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-zinc-900/20 shadow-sm"
          >
            -10
          </Button>
        </motion.div>
        
        <motion.div whileTap={{ scale: 0.95 }} className="w-full">
          <Button 
            type="button"
            variant="outline" 
            {...handleMinus1}
            onContextMenu={(e) => e.preventDefault()}
            className="w-full h-14 border-2 border-l-0 border-zinc-200/80 bg-white hover:bg-zinc-50 hover:text-zinc-900 px-0 select-none touch-none rounded-none focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-zinc-900/20 shadow-sm"
          >
            <Minus className="w-5 h-5 mx-auto" />
          </Button>
        </motion.div>

        <Input 
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={value} 
          onChange={e => onChange(e.target.value.replace(/\D/g, ''))}
          placeholder="0"
          className="w-16 sm:w-20 h-14 text-center text-xl sm:text-2xl font-black font-mono bg-[#F9FAFB] border-2 border-l-0 border-zinc-200/80 px-1 rounded-none focus-visible:z-10 focus-visible:border-zinc-950 focus-visible:ring-0 shadow-sm focus:bg-white transition-colors" 
        />

        <motion.div whileTap={{ scale: 0.95 }} className="w-full">
          <Button 
            type="button"
            variant="outline" 
            {...handlePlus1}
            onContextMenu={(e) => e.preventDefault()}
            className="w-full h-14 border-2 border-l-0 border-zinc-200/80 bg-white hover:bg-zinc-50 hover:text-zinc-900 px-0 select-none touch-none rounded-none focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-zinc-900/20 shadow-sm"
          >
            <Plus className="w-5 h-5 mx-auto" />
          </Button>
        </motion.div>

        <motion.div whileTap={{ scale: 0.95 }} className="w-full">
          <Button 
            type="button"
            variant="outline" 
            {...handlePlus10}
            onContextMenu={(e) => e.preventDefault()}
            className="w-full h-14 text-xs font-bold border-2 border-l-0 border-zinc-200/80 bg-white hover:bg-zinc-50 hover:text-zinc-900 px-0 select-none touch-none rounded-xl rounded-l-none focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-zinc-900/20 shadow-sm"
          >
            +10
          </Button>
        </motion.div>
      </div>
    </div>
  );
};
