import React from 'react';

interface IconProps {
  size?: number;
  color?: string;
  className?: string;
  strokeWidth?: number;
}

const defaults = { size: 24, color: 'currentColor', strokeWidth: 2, className: '' };

function svgProps(size: number, color: string, className: string) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    strokeWidth: defaults.strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
  };
}

export const SearchIcon = (p: IconProps) => {
  const { size, color, className } = { ...defaults, ...p };
  return (
    <svg {...svgProps(size, color, className)}>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
};

export const HomeIcon = (p: IconProps) => {
  const { size, color, className, strokeWidth } = { ...defaults, ...p };
  return (
    <svg {...svgProps(size, color, className)} strokeWidth={strokeWidth}>
      <path d="M3 12L12 3l9 9" />
      <path d="M5 10v10a1 1 0 0 0 1 1h4v-7h4v7h4a1 1 0 0 0 1-1V10" />
    </svg>
  );
};

export const MapIcon = (p: IconProps) => {
  const { size, color, className } = { ...defaults, ...p };
  return (
    <svg {...svgProps(size, color, className)}>
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
      <line x1="8" y1="2" x2="8" y2="18" />
      <line x1="16" y1="6" x2="16" y2="22" />
    </svg>
  );
};

export const StarIcon = (p: IconProps & { filled?: boolean }) => {
  const { size, color, className, filled } = { ...defaults, ...p };
  return (
    <svg {...svgProps(size, color, className)} fill={filled ? color : 'none'}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
};

export const UserIcon = (p: IconProps) => {
  const { size, color, className } = { ...defaults, ...p };
  return (
    <svg {...svgProps(size, color, className)}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
};

export const BuildingIcon = (p: IconProps) => {
  const { size, color, className } = { ...defaults, ...p };
  return (
    <svg {...svgProps(size, color, className)}>
      <rect x="4" y="2" width="16" height="20" rx="1" />
      <line x1="9" y1="6" x2="9" y2="6.01" />
      <line x1="15" y1="6" x2="15" y2="6.01" />
      <line x1="9" y1="10" x2="9" y2="10.01" />
      <line x1="15" y1="10" x2="15" y2="10.01" />
      <line x1="9" y1="14" x2="9" y2="14.01" />
      <line x1="15" y1="14" x2="15" y2="14.01" />
      <path d="M10 22v-4h4v4" />
    </svg>
  );
};

export const FactoryIcon = (p: IconProps) => {
  const { size, color, className } = { ...defaults, ...p };
  return (
    <svg {...svgProps(size, color, className)}>
      <path d="M2 22V8l6 4V8l6 4V8l6 4v10a0 0 0 0 1 0 0H2z" />
      <line x1="6" y1="18" x2="6" y2="18.01" />
      <line x1="12" y1="18" x2="12" y2="18.01" />
      <line x1="18" y1="18" x2="18" y2="18.01" />
      <path d="M6 4h0M6 2v4" />
    </svg>
  );
};

export const ChatIcon = (p: IconProps) => {
  const { size, color, className } = { ...defaults, ...p };
  return (
    <svg {...svgProps(size, color, className)}>
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
};

export const CalendarIcon = (p: IconProps) => {
  const { size, color, className } = { ...defaults, ...p };
  return (
    <svg {...svgProps(size, color, className)}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="16" y1="2" x2="16" y2="6" />
    </svg>
  );
};

export const ShareIcon = (p: IconProps) => {
  const { size, color, className } = { ...defaults, ...p };
  return (
    <svg {...svgProps(size, color, className)}>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
};

export const ChevronLeftIcon = (p: IconProps) => {
  const { size, color, className } = { ...defaults, ...p };
  return (
    <svg {...svgProps(size, color, className)}>
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
};

export const ChevronRightIcon = (p: IconProps) => {
  const { size, color, className } = { ...defaults, ...p };
  return (
    <svg {...svgProps(size, color, className)}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
};

export const LockIcon = (p: IconProps) => {
  const { size, color, className } = { ...defaults, ...p };
  return (
    <svg {...svgProps(size, color, className)}>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
};

export const PhoneIcon = (p: IconProps) => {
  const { size, color, className } = { ...defaults, ...p };
  return (
    <svg {...svgProps(size, color, className)}>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
};

export const RulerIcon = (p: IconProps) => {
  const { size, color, className } = { ...defaults, ...p };
  return (
    <svg {...svgProps(size, color, className)}>
      <path d="M3 9l6-6 12 12-6 6L3 9z" />
      <line x1="7" y1="5" x2="9" y2="7" />
      <line x1="10" y1="8" x2="12" y2="10" />
      <line x1="13" y1="11" x2="15" y2="13" />
      <line x1="16" y1="14" x2="18" y2="16" />
    </svg>
  );
};

export const ZapIcon = (p: IconProps) => {
  const { size, color, className } = { ...defaults, ...p };
  return (
    <svg {...svgProps(size, color, className)}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
};

export const ShieldIcon = (p: IconProps) => {
  const { size, color, className } = { ...defaults, ...p };
  return (
    <svg {...svgProps(size, color, className)}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
};

export const LocationIcon = (p: IconProps) => {
  const { size, color, className } = { ...defaults, ...p };
  return (
    <svg {...svgProps(size, color, className)}>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
};

export const CheckCircleIcon = (p: IconProps) => {
  const { size, color, className } = { ...defaults, ...p };
  return (
    <svg {...svgProps(size, color, className)}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
};

export const XCircleIcon = (p: IconProps) => {
  const { size, color, className } = { ...defaults, ...p };
  return (
    <svg {...svgProps(size, color, className)}>
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  );
};

export const LayersIcon = (p: IconProps) => {
  const { size, color, className } = { ...defaults, ...p };
  return (
    <svg {...svgProps(size, color, className)}>
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
};

export const EyeIcon = (p: IconProps) => {
  const { size, color, className } = { ...defaults, ...p };
  return (
    <svg {...svgProps(size, color, className)}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
};

export const SparklesIcon = (p: IconProps) => {
  const { size, color, className } = { ...defaults, ...p };
  return (
    <svg {...svgProps(size, color, className)}>
      <path d="M12 3l1.9 5.8a2 2 0 0 0 1.3 1.3L21 12l-5.8 1.9a2 2 0 0 0-1.3 1.3L12 21l-1.9-5.8a2 2 0 0 0-1.3-1.3L3 12l5.8-1.9a2 2 0 0 0 1.3-1.3L12 3z" />
      <path d="M5 3v4" />
      <path d="M19 17v4" />
      <path d="M3 5h4" />
      <path d="M17 19h4" />
    </svg>
  );
};

export const MicIcon = (p: IconProps) => {
  const { size, color, className } = { ...defaults, ...p };
  return (
    <svg {...svgProps(size, color, className)}>
      <rect x="9" y="2" width="6" height="11" rx="3" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  );
};

export const SendIcon = (p: IconProps) => {
  const { size, color, className } = { ...defaults, ...p };
  return (
    <svg {...svgProps(size, color, className)}>
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
};

export const CpuIcon = (p: IconProps) => {
  const { size, color, className } = { ...defaults, ...p };
  return (
    <svg {...svgProps(size, color, className)}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <rect x="9" y="9" width="6" height="6" />
      <path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3" />
    </svg>
  );
};

export const FlaskIcon = (p: IconProps) => {
  const { size, color, className } = { ...defaults, ...p };
  return (
    <svg {...svgProps(size, color, className)}>
      <path d="M9 3h6M10 3v7.5L4 20a2 2 0 002 2h12a2 2 0 002-2l-6-9.5V3" />
      <path d="M8.5 14h7" />
    </svg>
  );
};

export const CogIcon = (p: IconProps) => {
  const { size, color, className } = { ...defaults, ...p };
  return (
    <svg {...svgProps(size, color, className)}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  );
};

export const QuestionIcon = (p: IconProps) => {
  const { size, color, className, strokeWidth } = { ...defaults, ...p };
  return (
    <svg {...svgProps(size, color, className)} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
};
