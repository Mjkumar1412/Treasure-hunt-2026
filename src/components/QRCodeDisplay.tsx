import React from 'react';
import QRCodeStyled from './QRCodeStyled';
import { QRStyle } from '../types';

interface QRCodeDisplayProps {
  value: string;
  size?: number;
  label?: string;
  style?: QRStyle;
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({ value, size = 200, label, style }) => {
  return (
    <div className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-slate-200">
      <QRCodeStyled value={value} size={size} style={style} />
      {label && <p className="text-xs font-mono font-bold uppercase text-slate-500">{label}</p>}
      <p className="text-[10px] font-mono text-slate-300 break-all max-w-[150px] text-center">{value}</p>
    </div>
  );
};
