import React, { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area, ComposedChart, Line
} from 'recharts';
import { Activity, Clock, AlertTriangle, ArrowUpRight } from 'lucide-react';
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

// Colors (Tailwind compatible)
const LINE_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'];
const PROD_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'];
const UPTIME_COLORS = ['var(--chart-1)', 'var(--destructive)'];

// Custom Tooltip Component
const CustomTooltip = ({ active, payload, label, unit = '' }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card backdrop-blur-xl border border-border p-4 rounded-[1.25rem] shadow-2xl">
        {label && <p className="font-black text-sm text-zinc-800 dark:text-zinc-100 mb-3 border-b border-zinc-100 dark:border-zinc-800/60 pb-2">{label}</p>}
        {!label && payload[0]?.payload?.name && <p className="font-black text-sm text-zinc-800 dark:text-zinc-100 mb-3 border-b border-zinc-100 dark:border-zinc-800/60 pb-2">{payload[0].payload.name}</p>}
        
        <div className="flex flex-col gap-2.5">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-3 text-sm font-semibold">
              <div className="w-2.5 h-2.5 rounded-full ring-2 ring-offset-1 dark:ring-offset-zinc-950" style={{ backgroundColor: entry.color || entry.fill, ringColor: entry.color || entry.fill }} />
              <span className="text-muted-foreground flex-1">{entry.name}:</span>
              <span className="text-zinc-900 dark:text-zinc-50 font-black text-base">{entry.value} {unit}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

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
      { name: 'Tempo Produzindo', value: upMin },
      { name: 'Tempo Parado', value: downMin }
    ];
  }, [finishedOps]);

  const totalTime = uptimeDowntime[0].value + uptimeDowntime[1].value;
  const uptimePercent = totalTime > 0 ? ((uptimeDowntime[0].value / totalTime) * 100).toFixed(1) : '0.0';

  // 2. Production by Hour (Timeline)
  const productionByHour = useMemo(() => {
    const map: Record<string, number> = {};
    finishedOps.forEach(op => {
      if (!op.horaFinal) return;
      const hour = op.horaFinal.split(':')[0] + ':00';
      const qtd = parseInt(op.quantidade, 10) || 0;
      if (!map[hour]) map[hour] = 0;
      map[hour] += qtd;
    });
    
    return Object.keys(map)
      .sort((a, b) => a.localeCompare(b))
      .map(hour => ({ hour, quantidade: map[hour] }));
  }, [finishedOps]);

  // 3. Analysis of Paradas (Impact vs Frequency)
  const paradasAnalysis = useMemo(() => {
    const map: Record<string, { minutos: number; ocorrencias: number }> = {};
    finishedOps.forEach(op => {
      op.paradas?.forEach(p => {
        const dur = getDurationMinutes(p.horaInicio, p.horaFim);
        if (!map[p.tipologia]) map[p.tipologia] = { minutos: 0, ocorrencias: 0 };
        map[p.tipologia].minutos += dur;
        map[p.tipologia].ocorrencias += 1;
      });
    });

    return Object.keys(map)
      .map(name => ({ name, Minutos: map[name].minutos, Ocorrencias: map[name].ocorrencias }))
      .sort((a, b) => b.Minutos - a.Minutos)
      .slice(0, 5); // Top 5 by lost time
  }, [finishedOps]);

  // 4. Top Production by Line
  const productionByLinha = useMemo(() => {
    const map: Record<string, { quantidade: number; ops: number }> = {};
    finishedOps.forEach(op => {
      const qtd = parseInt(op.quantidade, 10) || 0;
      if (!map[op.linha]) map[op.linha] = { quantidade: 0, ops: 0 };
      map[op.linha].quantidade += qtd;
      map[op.linha].ops += 1;
    });
    
    return Object.keys(map)
      .map(linha => ({ 
        linha: linha.replace('Linha ', ''), 
        quantidade: map[linha].quantidade,
        eficiencia: Math.round(map[linha].quantidade / map[linha].ops) // Avg per OP
      }))
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 10);
  }, [finishedOps]);

  // 5. Top Products
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

  return (
    <div className="flex flex-col gap-6 p-4 pb-24 lg:pb-6 max-w-7xl mx-auto">
      
      {/* Overview Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Disponibilidade (OEE) */}
        <div className="bg-card p-6 rounded-[2rem] shadow-sm border border-border flex items-center lg:col-span-1 relative overflow-hidden group">
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl transition-opacity opacity-0 group-hover:opacity-100" />
          <div className="flex-1 z-10">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-5 h-5 text-emerald-500" />
              <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest">Disponibilidade (OEE)</h3>
            </div>
            <p className="text-5xl font-black text-zinc-900 dark:text-zinc-50 mb-1 tracking-tighter">{uptimePercent}%</p>
            <p className="text-xs font-bold text-zinc-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Tempo Produzindo vs Parado
            </p>
          </div>
          <div className="w-32 h-32 shrink-0 relative z-10">
            {totalTime > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={uptimeDowntime}
                    cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value" stroke="none" cornerRadius={8}
                  >
                    {uptimeDowntime.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={UPTIME_COLORS[index % UPTIME_COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip content={<CustomTooltip unit="min" />} cursor={false} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-zinc-400">Sem dados</div>
            )}
          </div>
        </div>

        {/* Produção por Hora (Area Chart) */}
        <div className="bg-card p-6 rounded-[2rem] shadow-sm border border-border lg:col-span-2">
          <div className="flex items-center gap-2 mb-6">
            <ArrowUpRight className="w-5 h-5 text-blue-500" />
            <h3 className="text-sm font-black text-zinc-800 dark:text-zinc-100 uppercase tracking-widest">Curva de Produção (Por Hora)</h3>
          </div>
          {productionByHour.length > 0 ? (
            <div className="h-40 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={productionByHour} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                  <linearGradient id="colorProd" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="hour" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} dx={-10} />
                <RechartsTooltip content={<CustomTooltip unit=" un" />} cursor={{ stroke: 'var(--border)', strokeWidth: 1, strokeDasharray: '5 5' }} />
                <Area type="monotone" dataKey="quantidade" name="Fabricado" stroke="var(--chart-1)" strokeWidth={4} fillOpacity={1} fill="url(#colorProd)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-40 flex items-center justify-center text-zinc-400 font-bold">Nenhuma produção registrada</div>
          )}
        </div>

      </div>

      {/* Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Paradas Impact vs Frequency */}
        <div className="bg-card p-6 rounded-[2rem] shadow-sm border border-border">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <h3 className="text-sm font-black text-zinc-800 dark:text-zinc-100 uppercase tracking-widest">Análise de Paradas</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-6 font-bold">Minutos Perdidos vs Frecuencia de Ocurrencia</p>
          
          {paradasAnalysis.length > 0 ? (
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={paradasAnalysis} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} dy={10} tickFormatter={(val) => val.length > 10 ? val.substring(0, 10) + '...' : val} />
                  <YAxis yAxisId="left" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} dx={-10} />
                  <YAxis yAxisId="right" orientation="right" hide />
                  <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'var(--muted)', opacity: 0.4 }} />
                  <Bar yAxisId="left" dataKey="Minutos" fill="var(--destructive)" radius={[6, 6, 0, 0]} maxBarSize={40} />
                  <Line yAxisId="right" type="monotone" dataKey="Ocorrencias" stroke="var(--chart-3)" strokeWidth={4} dot={{ r: 5, fill: 'var(--chart-3)', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 7 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-zinc-400 font-bold">Nenhuma parada registrada</div>
          )}
        </div>

        {/* Produção por Linha Chart */}
        <div className="bg-card p-6 rounded-[2rem] shadow-sm border border-border flex flex-col">
          <h3 className="text-sm font-black text-zinc-800 dark:text-zinc-100 uppercase tracking-widest mb-2">Produção por Linha (UN)</h3>
          <p className="text-xs text-muted-foreground mb-6 font-bold">Volumen total por máquina</p>
          {productionByLinha.length > 0 ? (
            <div className="h-[280px] w-full flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={productionByLinha} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="linha" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} dx={-10} />
                  <RechartsTooltip content={<CustomTooltip unit="UN" />} cursor={{ fill: 'var(--muted)', opacity: 0.4 }} />
                  <Bar dataKey="quantidade" name="Fabricado" radius={[6, 6, 0, 0]} maxBarSize={50}>
                    {productionByLinha.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={LINE_COLORS[index % LINE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-zinc-400 font-bold">Nenhuma produção registrada</div>
          )}
        </div>

        {/* Top Products */}
        <div className="bg-card p-6 rounded-[2rem] shadow-sm border border-border lg:col-span-2">
          <h3 className="text-sm font-black text-zinc-800 dark:text-zinc-100 uppercase tracking-widest mb-6">Top Produtos Fabricados</h3>
          {topProducts.length > 0 ? (
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProducts} layout="vertical" margin={{ top: 0, right: 30, left: 60, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                  <XAxis type="number" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} dy={5} />
                  <YAxis type="category" dataKey="name" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} dx={-10} width={100} />
                  <RechartsTooltip content={<CustomTooltip unit=" un" />} cursor={{fill: 'var(--muted)', opacity: 0.4}} />
                  <Bar dataKey="quantidade" name="Fabricado" fill="var(--chart-1)" radius={[0, 6, 6, 0]} maxBarSize={30}>
                    {topProducts.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PROD_COLORS[index % PROD_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-zinc-400 font-bold">Nenhuma producción registrada</div>
          )}
        </div>

      </div>

    </div>
  );
}
