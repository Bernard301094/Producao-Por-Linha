import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { FinishedOperation, Operation } from '../../api';

interface DashboardProps {
  finishedOps: FinishedOperation[];
  operations: Operation[];
}

// Utils
const timeToMinutes = (timeStr: string) => {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

const getDurationMinutes = (start: string, end: string) => {
  if (!start || !end) return 0;
  const s = timeToMinutes(start);
  const e = timeToMinutes(end);
  return e >= s ? e - s : (e + 24 * 60) - s;
};

// Colors
const LINE_COLORS = ['#059669', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0'];
const PROD_COLORS = ['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe'];
const UPTIME_COLORS = ['#10b981', '#ef4444']; // Good, Bad
const REWORK_COLORS = ['#3b82f6', '#f59e0b']; // Good, Rework

export function Dashboard({ finishedOps, operations }: DashboardProps) {
  // 1. Availability (Producing vs Downtime)
  const uptimeDowntime = useMemo(() => {
    let totalMin = 0;
    let downMin = 0;

    finishedOps.forEach(op => {
      totalMin += getDurationMinutes(op.horaInicial, op.horaFinal);
      op.paradas?.forEach(p => {
        downMin += getDurationMinutes(p.horaInicio, p.horaFim);
      });
    });

    const upMin = Math.max(0, totalMin - downMin);
    return [
      { name: 'Produzindo', value: upMin },
      { name: 'Parado', value: downMin }
    ];
  }, [finishedOps]);

  const totalTime = uptimeDowntime[0].value + uptimeDowntime[1].value;
  const uptimePercent = totalTime > 0 ? ((uptimeDowntime[0].value / totalTime) * 100).toFixed(1) : '0.0';


  // 3. Top Paradas por Tempo (Minutos)
  const paradasTime = useMemo(() => {
    const map: Record<string, number> = {};
    finishedOps.forEach(op => {
      op.paradas?.forEach(p => {
        const dur = getDurationMinutes(p.horaInicio, p.horaFim);
        if (!map[p.tipologia]) map[p.tipologia] = 0;
        map[p.tipologia] += dur;
      });
    });

    return Object.keys(map)
      .map(name => ({ name, value: map[name] }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5); // Top 5
  }, [finishedOps]);

  // 4. Top Produção por Linha
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
      .slice(0, 10);
  }, [finishedOps]);

  // 5. Top Produtos
  const topProducts = useMemo(() => {
    const map: Record<string, number> = {};
    finishedOps.forEach(op => {
      const qtd = parseInt(op.quantidade, 10) || 0;
      const prodName = `${op.produto} ${op.litragem ? `(${op.litragem})` : ''}`.trim();
      if (!map[prodName]) map[prodName] = 0;
      map[prodName] += qtd;
    });

    return Object.keys(map)
      .map(name => ({ name, quantidade: map[name] }))
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 5);
  }, [finishedOps]);

  // Shared Tooltip styles
  const tooltipStyle = {
    borderRadius: '12px',
    border: '1px solid #3f3f46',
    backgroundColor: '#18181b',
    color: '#f4f4f5',
    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.5)'
  };

  return (
    <div className="flex flex-col gap-6 p-4 pb-24 lg:pb-4 max-w-7xl mx-auto">
      
      {/* Row 1: KPI Donuts (Availability) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Disponibilidade */}
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-3xl shadow-sm border border-zinc-200 dark:border-zinc-800 flex items-center col-span-2">
          <div className="flex-1">
            <h3 className="text-sm font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Disponibilidade (OEE)</h3>
            <p className="text-3xl font-black text-zinc-900 dark:text-zinc-50 mb-2">{uptimePercent}%</p>
            <p className="text-xs font-semibold text-zinc-400">Tempo Produzindo vs Parado</p>
          </div>
          <div className="w-32 h-32 shrink-0 relative">
            {totalTime > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={uptimeDowntime}
                    cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={2} dataKey="value" stroke="none"
                  >
                    {uptimeDowntime.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={UPTIME_COLORS[index % UPTIME_COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={tooltipStyle} formatter={(value) => `${value} min`} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-zinc-400">Sem dados</div>
            )}
          </div>
        </div>



      </div>

      {/* Row 2: Top Products & Lines */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Top Products */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl shadow-sm border border-zinc-200 dark:border-zinc-800">
          <h3 className="text-lg font-black text-zinc-800 dark:text-zinc-100 mb-6">Top Produtos Fabricados (UN)</h3>
          {topProducts.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProducts} layout="vertical" margin={{ top: 0, right: 20, left: 40, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#3f3f46" opacity={0.2} />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a' }} />
                  <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#a1a1aa' }} width={120} />
                  <RechartsTooltip cursor={{ fill: '#3f3f46', opacity: 0.1 }} contentStyle={tooltipStyle} />
                  <Bar dataKey="quantidade" fill="#3b82f6" radius={[0, 6, 6, 0]}>
                    {topProducts.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PROD_COLORS[index % PROD_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-zinc-400 font-bold">Nenhuma produção registrada</div>
          )}
        </div>

        {/* Produção por Linha Chart */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl shadow-sm border border-zinc-200 dark:border-zinc-800">
          <h3 className="text-lg font-black text-zinc-800 dark:text-zinc-100 mb-6">Produção por Linha (UN)</h3>
          {productionByLinha.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={productionByLinha} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3f3f46" opacity={0.2} />
                  <XAxis dataKey="linha" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a' }} />
                  <RechartsTooltip cursor={{ fill: '#3f3f46', opacity: 0.1 }} contentStyle={tooltipStyle} />
                  <Bar dataKey="quantidade" fill="#10b981" radius={[6, 6, 0, 0]}>
                    {productionByLinha.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={LINE_COLORS[index % LINE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-zinc-400 font-bold">Nenhuma produção registrada</div>
          )}
        </div>

      </div>

      {/* Row 3: Paradas Impact */}
      <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl shadow-sm border border-zinc-200 dark:border-zinc-800">
        <h3 className="text-lg font-black text-zinc-800 dark:text-zinc-100 mb-2">Impacto Real das Paradas</h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6 font-medium">Minutos perdidos por cada motivo de parada</p>
        
        {paradasTime.length > 0 ? (
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={paradasTime} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#3f3f46" opacity={0.2} />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a' }} />
                <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#a1a1aa', width: 140 }} width={140} />
                <RechartsTooltip cursor={{ fill: '#3f3f46', opacity: 0.1 }} contentStyle={tooltipStyle} formatter={(value) => `${value} min`} />
                <Bar dataKey="value" name="Minutos Perdidos" fill="#ef4444" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-zinc-400 font-bold">Nenhuma parada registrada</div>
        )}
      </div>

    </div>
  );
}
