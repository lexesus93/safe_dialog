import React from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ButtonProps } from '@/types'

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      onClick,
      disabled = false,
      loading = false,
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const baseClasses = [
      'inline-flex items-center justify-center',
      'font-medium rounded-lg transition-all duration-200',
      'focus:outline-none focus:ring-2 focus:ring-offset-2',
      'disabled:cursor-not-allowed disabled:opacity-50',
    ]

    const variantClasses = {
      primary: [
        'bg-primary-600 text-white',
        'hover:bg-primary-700 focus:ring-primary-500',
        'disabled:hover:bg-primary-600',
      ],
      secondary: [
        'bg-gray-600 text-white',
        'hover:bg-gray-700 focus:ring-gray-500',
        'disabled:hover:bg-gray-600',
      ],
      outline: [
        'border border-gray-300 bg-white text-gray-700',
        'hover:bg-gray-50 focus:ring-gray-500',
        'dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300',
        'dark:hover:bg-gray-700',
      ],
      ghost: [
        'text-gray-700 bg-transparent',
        'hover:bg-gray-100 focus:ring-gray-500',
        'dark:text-gray-300 dark:hover:bg-gray-800',
      ],
      danger: [
        'bg-red-600 text-white',
        'hover:bg-red-700 focus:ring-red-500',
        'disabled:hover:bg-red-600',
      ],
    }

    const sizeClasses = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base',
    }

    const widthClasses = fullWidth ? 'w-full' : ''

    const isDisabled = disabled || loading

    return (
      <button
        ref={ref}
        type={type}
        onClick={onClick}
        disabled={isDisabled}
        className={cn(
          baseClasses,
          variantClasses[variant],
          sizeClasses[size],
          widthClasses
        )}
        {...props}
      >
        {loading && (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        )}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'

export { Button }
