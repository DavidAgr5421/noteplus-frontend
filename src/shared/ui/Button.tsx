import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { classNames } from '../utils/helpers';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'navy' | 'navyGreen' | 'success' | 'light' | 'lightGreen';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  loading?: boolean;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, fullWidth, disabled, children, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium rounded-full transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none active:scale-[0.99]';
    
    const variantStyles = {
      primary: 'bg-navy-900 text-white hover:bg-navy-800 focus:ring-navy-900 shadow-xs',
      secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200/90 focus:ring-slate-400 border border-slate-200/60 shadow-xs',
      danger: 'bg-[#a16074] text-white hover:bg-[#8e5063] focus:ring-[#a16074]/50 font-medium shadow-xs',
      ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:ring-slate-300',
      outline: 'border border-slate-200/80 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 focus:ring-slate-400 shadow-xs',
      navy: 'bg-navy-900 text-white hover:bg-navy-800 focus:ring-navy-900 shadow-xs',
      navyGreen: 'bg-navy-900 text-emerald-400 font-semibold hover:bg-navy-800 focus:ring-navy-900 shadow-xs',
      success: 'bg-emerald-700 text-white hover:bg-emerald-800 focus:ring-emerald-600 font-medium shadow-xs',
      light: 'bg-white text-navy-900 border border-slate-200/90 hover:bg-slate-50 hover:border-slate-300 focus:ring-navy-900/20 font-semibold shadow-xs',
      lightGreen: 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100/90 border border-emerald-200/80 focus:ring-emerald-500/30 font-semibold shadow-xs',
    };
    
    const sizeStyles = {
      sm: 'px-3 py-1.5 text-sm gap-1.5',
      md: 'px-4 py-2 text-base gap-2',
      lg: 'px-6 py-3 text-lg gap-2.5',
      icon: 'h-10 w-10 p-0 text-xl leading-none',
    };

    return (
      <button
        ref={ref}
        className={classNames(baseStyles, variantStyles[variant], sizeStyles[size], fullWidth && 'w-full', className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';