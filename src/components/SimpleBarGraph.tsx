import React from 'react';

interface BarData {
  label: string;
  value: number;
  color: string;
}

interface SimpleBarGraphProps {
  data: BarData[];
}

const SimpleBarGraph: React.FC<SimpleBarGraphProps> = ({ data }) => {
  const maxValue = Math.max(...data.map(item => item.value), 0);

  return (
    <div className="space-y-3 p-4 bg-card rounded-lg border">
      {data.map((item, index) => {
        const percentage = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
        const formattedValue = `₹${item.value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

        return (
          <div key={index} className="flex items-center gap-3">
            <div className="w-28 text-sm text-muted-foreground truncate text-right">{item.label}</div>
            <div className="flex-1 bg-secondary rounded-full h-6 overflow-hidden">
              <div
                className={`h-full ${item.color} flex items-center justify-end pr-2 transition-all duration-1000 ease-out`}
                style={{ width: `${percentage}%` }}
              >
                <span className="text-white text-xs font-bold shadow-sm">
                  {percentage > 25 ? formattedValue : ''}
                </span>
              </div>
            </div>
            {percentage <= 25 && <span className="text-xs font-semibold text-foreground w-24">{formattedValue}</span>}
          </div>
        );
      })}
    </div>
  );
};

export default SimpleBarGraph;
