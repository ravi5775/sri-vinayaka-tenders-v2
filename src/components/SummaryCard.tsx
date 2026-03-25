import React from 'react';
import { LucideProps } from 'lucide-react';

interface SummaryCardProps {
  icon: React.ComponentType<LucideProps>;
  title: string;
  value: string | number;
  isCurrency?: boolean;
  color?: string;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ icon: Icon, title, value, isCurrency = false, color = 'text-foreground' }) => {
  const formattedValue = typeof value === 'number'
    ? isCurrency
      ? `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 0 })}`
      : value.toLocaleString('en-IN')
    : value;

  return (
    <div className="glass-card p-3 sm:p-5 flex items-start gap-3 sm:gap-4 hover:shadow-glow transition-all duration-300 group animate-fade-in-up">
      <div className="bg-gradient-to-br from-primary/15 to-accent/10 p-2 sm:p-3 rounded-lg sm:rounded-xl group-hover:scale-110 transition-transform duration-300">
        <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
      </div>
      <div className="min-w-0">
        <h3 className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider leading-tight">{title}</h3>
        <p className={`text-sm sm:text-xl font-bold mt-0.5 sm:mt-1 tracking-tight ${color}`}>{formattedValue}</p>
      </div>
    </div>
  );
};

export default SummaryCard;
