'use client';

import { useRef, useState, useCallback } from 'react';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';
import { Download, Printer, Palette, Maximize2 } from 'lucide-react';

interface QRCodeCardProps {
  storeSlug: string;
  storeName: string;
  storeUrl?: string;
}

const SIZES = {
  small: { label: 'Small', px: 128 },
  medium: { label: 'Medium', px: 256 },
  large: { label: 'Large', px: 512 },
} as const;

type SizeKey = keyof typeof SIZES;

export default function QRCodeCard({ storeSlug, storeName, storeUrl }: QRCodeCardProps) {
  const [size, setSize] = useState<SizeKey>('medium');
  const [fgColor, setFgColor] = useState('#000000');
  const [showOptions, setShowOptions] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const baseUrl = storeUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  const qrUrl = `${baseUrl}/?store=${storeSlug}&src=qr`;
  const qrSize = SIZES[size].px;

  const downloadPNG = useCallback(() => {
    const canvas = canvasRef.current?.querySelector('canvas');
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `qr-${storeSlug}.png`;
    link.href = dataUrl;
    link.click();
  }, [storeSlug]);

  const downloadSVG = useCallback(() => {
    const svgEl = document.getElementById(`qr-svg-${storeSlug}`);
    if (!svgEl) return;
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `qr-${storeSlug}.svg`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  }, [storeSlug]);

  const handlePrint = useCallback(() => {
    const printContent = printRef.current;
    if (!printContent) return;
    const printWindow = window.open('', '_blank', 'width=600,height=800');
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>QR Code - ${storeName}</title>
        <style>
          body {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          }
          .print-card {
            text-align: center;
            padding: 40px;
          }
          h2 { margin: 0 0 8px; font-size: 24px; color: #111; }
          .subtitle { color: #666; font-size: 14px; margin-bottom: 24px; }
          .qr-container { margin: 24px 0; }
          .url { font-size: 11px; color: #888; word-break: break-all; max-width: 400px; margin: 16px auto 0; }
          .cta { font-size: 16px; color: #333; margin-top: 16px; font-weight: 500; }
        </style>
      </head>
      <body>
        <div class="print-card">
          <h2>${storeName}</h2>
          <p class="subtitle">Scan to leave us a review</p>
          <div class="qr-container">${printContent.innerHTML}</div>
          <p class="cta">We appreciate your feedback!</p>
          <p class="url">${qrUrl}</p>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
    };
  }, [storeName, qrUrl]);

  return (
    <div className="rounded-xl bg-white shadow-sm ring-1 ring-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900">{storeName}</h3>
        <p className="text-xs text-gray-500 mt-0.5 break-all">{qrUrl}</p>
      </div>

      {/* QR Code display */}
      <div className="flex flex-col items-center py-6 px-5">
        {/* Visible SVG for display */}
        <div ref={printRef}>
          <QRCodeSVG
            id={`qr-svg-${storeSlug}`}
            value={qrUrl}
            size={Math.min(qrSize, 256)}
            fgColor={fgColor}
            bgColor="#ffffff"
            level="H"
            includeMargin
          />
        </div>

        {/* Hidden canvas for PNG download at full resolution */}
        <div ref={canvasRef} className="hidden">
          <QRCodeCanvas
            value={qrUrl}
            size={qrSize}
            fgColor={fgColor}
            bgColor="#ffffff"
            level="H"
            includeMargin
          />
        </div>
      </div>

      {/* Customization options */}
      <div className="px-5 pb-4">
        <button
          onClick={() => setShowOptions(!showOptions)}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors mb-3"
        >
          <Palette className="w-3.5 h-3.5" />
          Customize
        </button>

        {showOptions && (
          <div className="flex flex-wrap items-center gap-4 mb-4 p-3 bg-gray-50 rounded-lg">
            {/* Size selector */}
            <div className="flex items-center gap-2">
              <Maximize2 className="w-3.5 h-3.5 text-gray-400" />
              <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                {(Object.keys(SIZES) as SizeKey[]).map((key) => (
                  <button
                    key={key}
                    onClick={() => setSize(key)}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                      size === key
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {SIZES[key].label}
                  </button>
                ))}
              </div>
            </div>

            {/* Color picker */}
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500">Color:</label>
              <input
                type="color"
                value={fgColor}
                onChange={(e) => setFgColor(e.target.value)}
                className="w-8 h-8 rounded cursor-pointer border border-gray-200"
              />
            </div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="px-5 pb-5 flex flex-wrap gap-2">
        <button
          onClick={downloadPNG}
          className="flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Download className="w-4 h-4" />
          Download PNG
        </button>
        <button
          onClick={downloadSVG}
          className="flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Download className="w-4 h-4" />
          Download SVG
        </button>
        <button
          onClick={handlePrint}
          className="flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Printer className="w-4 h-4" />
          Print
        </button>
      </div>
    </div>
  );
}
