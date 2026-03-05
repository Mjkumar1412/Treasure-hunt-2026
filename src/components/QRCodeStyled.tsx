import React, { useEffect, useRef } from 'react';
import QRCodeStyling, { 
  DrawType, 
  TypeNumber, 
  Mode, 
  ErrorCorrectionLevel, 
  DotType, 
  CornerSquareType, 
  CornerDotType,
  Options
} from 'qr-code-styling';
import { QRStyle } from '../types';

interface QRCodeStyledProps {
  value: string;
  style?: QRStyle;
  size?: number;
  className?: string;
}

const QRCodeStyled: React.FC<QRCodeStyledProps> = ({ value, style, size = 300, className }) => {
  const ref = useRef<HTMLDivElement>(null);
  const qrCode = useRef<QRCodeStyling | null>(null);

  useEffect(() => {
    const options: Options = {
      width: size,
      height: size,
      type: 'svg' as DrawType,
      data: value,
      image: style?.logoUrl,
      margin: 10,
      qrOptions: {
        typeNumber: 0 as TypeNumber,
        mode: 'Byte' as Mode,
        errorCorrectionLevel: 'Q' as ErrorCorrectionLevel
      },
      imageOptions: {
        hideBackgroundDots: true,
        imageSize: 0.4,
        margin: 5,
        crossOrigin: 'anonymous',
      },
      dotsOptions: {
        color: style?.primaryColor || '#000000',
        type: (style?.shape === 'circle' ? 'dots' : 
               style?.shape === 'rounded' ? 'rounded' : 
               style?.shape === 'diamond' ? 'extra-rounded' : 
               style?.shape === 'heart' ? 'dots' : // Library doesn't have heart, fallback to dots
               style?.shape === 'star' ? 'dots' : 
               style?.shape === 'leaf' ? 'classy' : 'square') as DotType
      },
      backgroundOptions: {
        color: 'transparent',
      },
      cornersSquareOptions: {
        color: style?.primaryColor || '#000000',
        type: (style?.shape === 'rounded' ? 'extra-rounded' : 'square') as CornerSquareType
      },
      cornersDotOptions: {
        color: style?.primaryColor || '#000000',
        type: (style?.shape === 'circle' ? 'dot' : 'square') as CornerDotType
      }
    };

    if (style?.colorType === 'gradient' && style.secondaryColor) {
      options.dotsOptions!.gradient = {
        type: 'linear',
        rotation: 45,
        colorStops: [
          { offset: 0, color: style.primaryColor },
          { offset: 1, color: style.secondaryColor }
        ]
      };
    }

    qrCode.current = new QRCodeStyling(options);
    if (ref.current) {
      ref.current.innerHTML = '';
      qrCode.current.append(ref.current);
    }
  }, [value, style, size]);

  return (
    <div className={`relative ${className}`}>
      {style?.frameType !== 'none' && (
        <div 
          className="absolute inset-[-10px] border-4 rounded-2xl pointer-events-none"
          style={{ 
            borderColor: style?.frameColor || style?.primaryColor || '#000000',
            borderWidth: style?.frameType === 'thick' ? '8px' : '4px',
            boxShadow: style?.frameType === 'glow' ? `0 0 20px ${style?.frameColor || style?.primaryColor || '#000000'}` : 'none'
          }}
        />
      )}
      <div ref={ref} />
    </div>
  );
};

export default QRCodeStyled;
