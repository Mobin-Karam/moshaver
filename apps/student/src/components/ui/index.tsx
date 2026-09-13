import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';
import { AlertCircle, Inbox, RefreshCw } from 'lucide-react';

export function Card({ className = '', ...props }: HTMLAttributes<HTMLElement>) {
  return <article className={`ui-card ${className}`} {...props} />;
}

export function Badge({ tone = 'neutral', children }: { tone?: 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info'; children: ReactNode }) {
  return <span className={`ui-badge ui-badge--${tone}`}>{children}</span>;
}

export function Button({ variant = 'primary', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' }) {
  return <button className={`ui-button ui-button--${variant} ${className}`} {...props} />;
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <span className={`ui-skeleton ${className}`} aria-hidden="true" />;
}

export function LoadingState({ label = 'در حال دریافت اطلاعات…' }: { label?: string }) {
  return <div className="ui-card space-y-3 p-4" role="status"><Skeleton className="h-4 w-2/5" /><Skeleton className="h-16 w-full" /><span className="sr-only">{label}</span></div>;
}

export function EmptyState({ title, description, icon = <Inbox /> }: { title: string; description?: string; icon?: ReactNode }) {
  return <div className="empty-state"><span className="empty-state__icon" aria-hidden="true">{icon}</span><strong>{title}</strong>{description ? <p>{description}</p> : null}</div>;
}

export function ErrorState({ message = 'دریافت اطلاعات با مشکل مواجه شد.', onRetry }: { message?: string; onRetry?: () => void }) {
  return <div className="error-state" role="alert"><AlertCircle aria-hidden="true" /><div><strong>مشکلی پیش آمد</strong><p>{message}</p>{onRetry ? <Button variant="secondary" onClick={onRetry}><RefreshCw size={16} />تلاش مجدد</Button> : null}</div></div>;
}
