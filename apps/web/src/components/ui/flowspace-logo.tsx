import React from 'react';

interface LogoMarkProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
}

export function FlowSpaceLogoMark({ size = 32, className = '', ...props }: LogoMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      {...props}
    >
      <defs>
        <linearGradient id="fs-grad-a" x1="2" y1="2" x2="34" y2="34" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4F46E5" />
          <stop offset="0.5" stopColor="#3B82F6" />
          <stop offset="1" stopColor="#06B6D4" />
        </linearGradient>
        <linearGradient id="fs-grad-b" x1="10" y1="10" x2="26" y2="26" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#E0E7FF" />
        </linearGradient>
      </defs>
      <rect width="36" height="36" rx="9" fill="url(#fs-grad-a)" />
      <path
        d="M10 11.5A1.5 1.5 0 0 1 11.5 10h13a1.5 1.5 0 0 1 1.5 1.5v0a1.5 1.5 0 0 1-1.5 1.5H13v3.5h9.5a1.5 1.5 0 0 1 1.5 1.5v0a1.5 1.5 0 0 1-1.5 1.5H13V24.5a1.5 1.5 0 0 1-1.5 1.5h0a1.5 1.5 0 0 1-1.5-1.5V11.5Z"
        fill="url(#fs-grad-b)"
      />
      <circle cx="23.5" cy="24.5" r="2.5" fill="#38BDF8" />
    </svg>
  );
}

interface FlowSpaceLogoProps {
  size?: number;
  showText?: boolean;
  className?: string;
  textClassName?: string;
}

export function FlowSpaceLogo({
  size = 28,
  showText = true,
  className = '',
  textClassName = '',
}: FlowSpaceLogoProps) {
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <FlowSpaceLogoMark size={size} />
      {showText && (
        <span className={`font-bold tracking-tight text-foreground ${textClassName || 'text-base'}`}>
          FlowSpace
        </span>
      )}
    </div>
  );
}
