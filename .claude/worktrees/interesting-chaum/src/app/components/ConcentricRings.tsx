import React from 'react';

interface ConcentricRingsProps {
  rings: {
    progress: number; // 0 to 100
    color: string;
    label: string;
  }[];
  size?: number;
  strokeWidth?: number;
}

export function ConcentricRings({ rings, size = 200, strokeWidth = 16 }: ConcentricRingsProps) {
  const center = size / 2;
  const gap = 4;
  
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
      {rings.map((ring, index) => {
        const radius = center - strokeWidth / 2 - index * (strokeWidth + gap);
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (ring.progress / 100) * circumference;
        
        return (
          <g key={index}>
            {/* Background Ring */}
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="transparent"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              className={`opacity-20 ${ring.color}`}
            />
            {/* Foreground Ring */}
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="transparent"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              className={`${ring.color} transition-all duration-1000 ease-out`}
            />
          </g>
        );
      })}
    </svg>
  );
}
