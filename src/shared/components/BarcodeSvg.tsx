import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

interface BarcodeSvgProps {
  value: string;
  format?: 'CODE128' | 'CODE39' | 'EAN13' | 'UPC';
  width?: number;
  height?: number;
  displayValue?: boolean;
  fontSize?: number;
  margin?: number;
  className?: string;
}

export default function BarcodeSvg({
  value,
  format = 'CODE128',
  width = 2,
  height = 40,
  displayValue = false,
  fontSize = 11,
  margin = 4,
  className = '',
}: BarcodeSvgProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        const cleanVal = value.trim() || 'EL-1';
        JsBarcode(svgRef.current, cleanVal, {
          format: format,
          width: width,
          height: height,
          displayValue: displayValue,
          fontSize: fontSize,
          font: 'monospace',
          fontOptions: 'bold',
          margin: margin,
          background: '#ffffff',
          lineColor: '#0f172a',
        });
      } catch (err) {
        console.warn('JsBarcode render error for code:', value, err);
      }
    }
  }, [value, format, width, height, displayValue, fontSize, margin]);

  return <svg ref={svgRef} className={className} />;
}
