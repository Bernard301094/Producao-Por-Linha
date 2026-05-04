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
    <div className={cn("space-y-1.5", className)}>
      {label && <label className="text-[10px] font-bold text-zinc-500 uppercase">{label}</label>}
      <div className="grid grid-cols-[1fr_1fr_auto_1fr_1fr] sm:grid-cols-[1fr_1fr_auto_1fr_1fr] gap-1 sm:gap-1.5 items-center w-full">
        <motion.div whileTap={{ scale: 0.95 }} className="w-full">
          <Button 
            type="button"
            variant="outline" 
            {...handleMinus10}
            onContextMenu={(e) => e.preventDefault()}
            className="w-full h-12 text-[10px] sm:text-xs font-bold border-2 border-zinc-200 bg-white px-0 select-none touch-none"
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
            className="w-full h-12 border-2 border-zinc-200 bg-white px-0 select-none touch-none"
          >
            <Minus className="w-4 h-4 mx-auto" />
          </Button>
        </motion.div>

        <Input 
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={value} 
          onChange={e => onChange(e.target.value.replace(/\D/g, ''))}
          placeholder="0"
          className="w-14 sm:w-16 h-12 text-center text-lg md:text-xl font-black font-mono bg-zinc-100 border-2 border-zinc-200 px-1" 
        />

        <motion.div whileTap={{ scale: 0.95 }} className="w-full">
          <Button 
            type="button"
            variant="outline" 
            {...handlePlus1}
            onContextMenu={(e) => e.preventDefault()}
            className="w-full h-12 border-2 border-zinc-200 bg-white px-0 select-none touch-none"
          >
            <Plus className="w-4 h-4 mx-auto" />
          </Button>
        </motion.div>

        <motion.div whileTap={{ scale: 0.95 }} className="w-full">
          <Button 
            type="button"
            variant="outline" 
            {...handlePlus10}
            onContextMenu={(e) => e.preventDefault()}
            className="w-full h-12 text-[10px] sm:text-xs font-bold border-2 border-zinc-200 bg-white px-0 select-none touch-none"
          >
            +10
          </Button>
        </motion.div>
      </div>
    </div>
  );
};
