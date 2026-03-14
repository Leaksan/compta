import React from 'react';

export default function Logo({ className = "w-8 h-8", textClassName = "text-2xl font-bold" }: { className?: string, textClassName?: string }) {
  return (
    <div className="flex items-center gap-2">
      <svg viewBox="0 0 100 100" className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        {/* Curved arrow */}
        <path d="M20 45 Q 40 35 55 20 L 50 18 L 60 15 L 58 25 L 53 22 Q 38 38 20 48 Z" />
        {/* Bars */}
        <rect x="18" y="50" width="8" height="15" />
        <rect x="30" y="40" width="8" height="25" />
        <rect x="42" y="30" width="8" height="35" />
        {/* Document with folded corner */}
        <path d="M55 25 L 70 25 L 80 35 L 80 65 L 55 65 Z" />
        <path d="M70 25 L 70 35 L 80 35" fill="none" stroke="white" strokeWidth="2" />
        {/* Grid on document */}
        <path d="M55 40 L 80 40 M 55 48 L 80 48 M 55 56 L 80 56 M 63 35 L 63 65 M 72 35 L 72 65" stroke="white" strokeWidth="2" />
        {/* Curved baseline */}
        <path d="M15 68 Q 50 62 85 68 L 85 72 Q 50 66 15 72 Z" />
      </svg>
      <span className={textClassName}>Kaizō</span>
    </div>
  );
}
