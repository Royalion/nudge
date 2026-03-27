import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default' | 'outline' | 'ghost' | 'secondary' | 'danger', size?: 'sm' | 'default' | 'lg' | 'icon' }
>(({ className, variant = 'default', size = 'default', ...props }, ref) => {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stride-600 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        {
          "bg-stride-800 text-white hover:bg-stride-900 hover:shadow-md active:scale-[0.97]": variant === 'default',
          "border border-stride-200 bg-white hover:bg-stride-50 text-stride-800 hover:border-stride-300 active:scale-[0.97]": variant === 'outline',
          "bg-stride-100 text-stride-800 hover:bg-stride-200 active:scale-[0.97]": variant === 'secondary',
          "hover:bg-stride-50 hover:text-stride-900": variant === 'ghost',
          "bg-red-500 text-white hover:bg-red-600 active:scale-[0.97] shadow-sm hover:shadow": variant === 'danger',
          "h-11 px-5 py-2": size === 'default',
          "h-9 px-4 text-xs": size === 'sm',
          "h-14 px-8 text-base": size === 'lg',
          "h-11 w-11": size === 'icon',
        },
        className
      )}
      {...props}
    />
  );
});

Button.displayName = 'Button';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-xl border border-stride-200/60 bg-white px-4 py-2 text-sm shadow-sm transition-all file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-stride-400 focus:outline-none focus:ring-2 focus:ring-stride-500/40 focus:border-stride-400 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[100px] w-full rounded-xl border border-stride-200/60 bg-white px-4 py-3 text-sm shadow-sm transition-all placeholder:text-stride-400 focus:outline-none focus:ring-2 focus:ring-stride-500/40 focus:border-stride-400 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Textarea.displayName = 'Textarea';

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => {
    return (
      <select
        className={cn(
          "flex h-11 w-full rounded-xl border border-stride-200/60 bg-white px-4 py-2 text-sm shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-stride-500/40 focus:border-stride-400 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Select.displayName = 'Select';

export const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn("text-sm font-semibold text-stride-800 leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mb-1.5 block", className)}
      {...props}
    />
  )
);

Label.displayName = 'Label';

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("rounded-2xl border border-stride-100 bg-white text-stride-900 shadow-[0_2px_12px_-3px_rgba(59,136,149,0.06)]", className)} {...props} />
  );
}

export function ProgressRing({ progress, size = 120, strokeWidth = 8, color = "text-stride-600", trackColor = "text-stride-100", className }: { progress: number; size?: number; strokeWidth?: number; color?: string; trackColor?: string; className?: string }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          className={cn("fill-none", trackColor)}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          cx={size / 2}
          cy={size / 2}
          r={radius}
        />
        <circle
          className={cn("fill-none transition-all duration-1000 ease-in-out", color)}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
    </div>
  );
}