import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { FinishedOperation, Operation } from '../../api';

interface DashboardProps {
  finishedOps: FinishedOperation[];
  operations: Operation[];
}

const COLORS = ['#059669', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0'];

export function Dashboard({ finishedOps, operations }: DashboardProps) {
  // Aggregate production by Linha
  const productionByLinha = useMemo(() => {
    const map: Record<string, number> = {};
    finishedOps.forEach(op => {
      const qtd = parseInt(op.quantidade, 10) || 0;
      if (!map[op.linha]) map[op.linha] = 0;
      map[op.linha] += qtd;
    });
    
    return Object.keys(map)
      .map(linha => ({ linha: linha.replace('Linha ', ''), quantidade: map[linha] }))
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 10); // Top 10 linhas
  }, [finishedOps]);

  // Aggregate Paradas
  const paradasCount = useMemo(() => {
    const map: Record<string, number> = {};
    finishedOps.forEach(op => {
      op.paradas?.forEach(p => {
        if (!map[p.tipologia]) map[p.tipologia] = 0;
        map[p.tipologia] += 1;
      });
    });

    return Object.keys(map)
      .map(name => ({ name, value: map[name] }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5); // Top 5 paradas
  }, [finishedOps]);

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Produção por Linha Chart */}
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800">
          <h3 className="text-lg font-black text-zinc-800 dark:text-zinc-100 mb-4">Top Produção por Linha (UN)</h3>
          {productionByLinha.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={productionByLinha} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="linha" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                  <RechartsTooltip 
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="quantidade" fill="#059669" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-zinc-400 font-bold">Sem dados suficientes</div>
          )}
        </div>

        {/* Top Paradas Chart */}
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800">
          <h3 className="text-lg font-black text-zinc-800 dark:text-zinc-100 mb-4">Top Motivos de Parada</h3>
          {paradasCount.length > 0 ? (
            <div className="h-64 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paradasCount}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {paradasCount.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-zinc-400 font-bold">Sem paradas registradas</div>
          )}
        </div>

      </div>
    </div>
  );
}
