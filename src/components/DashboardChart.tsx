import React, { useMemo } from 'react';
import { ComposedChart, Bar, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Transaction } from '../storage';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Props {
  transactions: Transaction[];
  currency: string;
  fieldLabels?: Record<string, string>;
}

export default function DashboardChart({ transactions, currency, fieldLabels }: Props) {
  const data = useMemo(() => {
    // Group transactions by date
    const grouped = transactions.reduce((acc, t) => {
      const dateStr = format(parseISO(t.date), 'dd MMM', { locale: fr });
      if (!acc[dateStr]) {
        acc[dateStr] = { date: dateStr, income: 0, expense: 0, timestamp: parseISO(t.date).getTime() };
      }
      if (t.type === 'income') {
        acc[dateStr].income += t.amount;
      } else {
        acc[dateStr].expense += t.amount;
      }
      return acc;
    }, {} as Record<string, { date: string; income: number; expense: number; timestamp: number }>);

    // Sort by date
    const sortedDays = Object.values(grouped).sort((a, b) => a.timestamp - b.timestamp);
    
    let runningBalance = 0;
    return sortedDays.map(day => {
      runningBalance += (day.income - day.expense);
      return {
        ...day,
        balance: runningBalance
      };
    });
  }, [transactions]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', { notation: 'compact', compactDisplay: 'short' }).format(value) + (currency === 'FCFA' ? '' : ` ${currency}`);
  };

  if (data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-neutral-400 text-sm italic">
        Pas assez de données pour le graphique
      </div>
    );
  }

  return (
    <div className="h-64 md:h-72 lg:h-80 xl:h-96 w-full mt-8">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f5" />
          <XAxis 
            dataKey="date" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 10, fill: '#a3a3a3' }} 
            dy={10}
          />
          <YAxis 
            yAxisId="left"
            orientation="right"
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 10, fill: '#a3a3a3' }}
            tickFormatter={formatCurrency}
          />
          <Tooltip 
            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
            formatter={(value: number, name: string) => {
              const formatted = new Intl.NumberFormat('fr-FR').format(value) + ` ${currency}`;
              return [formatted, name];
            }}
            labelStyle={{ color: '#737373', marginBottom: '4px', fontSize: '12px', fontWeight: 600 }}
          />
          <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} iconType="circle" />
          
          <Bar yAxisId="left" dataKey="income" name={`${fieldLabels?.income || 'Entrées'} du jour`} fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={20} />
          <Bar yAxisId="left" dataKey="expense" name={`${fieldLabels?.expense || 'Dépenses'} du jour`} fill="#EF4444" radius={[4, 4, 0, 0]} maxBarSize={20} />
          <Area yAxisId="left" type="monotone" dataKey="balance" name="Solde cumulé" stroke="#6366f1" strokeWidth={3} fill="url(#colorBalance)" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
