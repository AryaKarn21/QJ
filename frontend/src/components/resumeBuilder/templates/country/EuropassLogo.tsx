import React from 'react';

interface EuropassLogoProps {
  className?: string;
  width?: number | string;
  height?: number | string;
}

export const EuropassLogo: React.FC<EuropassLogoProps> = ({
  className = '',
  width = 148,
  height = 36,
}) => {
  return (
    <div
      className={`inline-flex items-center select-none shrink-0 ${className}`}
      style={{ width, height }}
      aria-label="Europass format"
    >
      <svg
        viewBox="0 0 160 38"
        width="100%"
        height="100%"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* European Emblem Blue Box with 12 Yellow Stars */}
        <g transform="translate(2, 2)">
          <rect width="48" height="34" rx="3.5" fill="#003399" />
          {/* 12 Stars in circle (radius ~10, center at 24, 17) */}
          {[...Array(12)].map((_, i) => {
            const angle = (i * 30 * Math.PI) / 180;
            const cx = 24 + 10.5 * Math.sin(angle);
            const cy = 17 - 10.5 * Math.cos(angle);
            return (
              <polygon
                key={i}
                points={`${cx},${cy - 2.2} ${cx + 0.65},${cy - 0.7} ${cx + 2.2},${cy - 0.7} ${cx + 0.95},${cy + 0.25} ${cx + 1.45},${cy + 1.75} ${cx},${cy + 0.8} ${cx - 1.45},${cy + 1.75} ${cx - 0.95},${cy + 0.25} ${cx - 2.2},${cy - 0.7} ${cx - 0.65},${cy - 0.7}`}
                fill="#FFCC00"
              />
            );
          })}
        </g>

        {/* 'europass' Wordmark in lowercase */}
        <text
          x="58"
          y="26"
          fill="#003399"
          fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          fontSize="22"
          fontWeight="700"
          letterSpacing="-0.5px"
        >
          europass
        </text>
      </svg>
    </div>
  );
};
