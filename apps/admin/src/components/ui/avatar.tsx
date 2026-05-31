import * as React from 'react';
import { cn } from '@/lib/utils';

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
    .filter(Boolean)
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// Deterministic accent based on the name, so each entity keeps a stable color.
const PALETTE = [
  'bg-blue-100 text-blue-700',
  'bg-violet-100 text-violet-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-teal-100 text-teal-700',
  'bg-indigo-100 text-indigo-700',
  'bg-orange-100 text-orange-700',
];

function colorFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

type InitialsAvatarProps = {
  name: string;
  className?: string;
  /** Force a specific tailwind color combo instead of the hashed one. */
  color?: string;
};

export const InitialsAvatar: React.FC<InitialsAvatarProps> = ({ name, className, color }) => (
  <div
    className={cn(
      'flex shrink-0 items-center justify-center rounded-full text-xs font-semibold',
      color ?? colorFor(name || '?'),
      className
    )}
    aria-hidden
  >
    {getInitials(name || '?')}
  </div>
);

export { getInitials };
export default InitialsAvatar;
