import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Fusionne des classes Tailwind conditionnelles.
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
