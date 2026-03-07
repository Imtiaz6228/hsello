import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPriceRub(price: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

export function formatPriceUsd(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(price);
}

export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

export function formatReputation(reputation: number): string {
  return reputation.toFixed(1) + '%';
}

export function getStockClass(count: number): string {
  if (count >= 100) return 'text-emerald-400';
  if (count >= 20) return 'text-amber-400';
  return 'text-red-400';
}

export function getTagColor(tag: string): string {
  const tagLower = tag.toLowerCase();
  if (tagLower.includes('verified') || tagLower.includes('real') || tagLower.includes('pva')) {
    return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
  }
  if (tagLower.includes('retriv') || tagLower.includes('aged')) {
    return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
  }
  if (tagLower.includes('no warranty') || tagLower.includes('shared')) {
    return 'bg-red-500/20 text-red-400 border-red-500/30';
  }
  if (tagLower.includes('sms')) {
    return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
  }
  return 'bg-secondary text-secondary-foreground';
}

export function generateSupplierId(): string {
  return '#' + Math.floor(1000 + Math.random() * 9000);
}

export function generateApiKey(): string {
  return 'hsk_' + Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

export function parseAccountsData(data: string, delimiter: string = ':'): string[] {
  return data
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0 && line.includes(delimiter));
}

export function validateEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

export function timeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + ' years ago';
  
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + ' months ago';
  
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + ' days ago';
  
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + ' hours ago';
  
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + ' minutes ago';
  
  return 'just now';
}
