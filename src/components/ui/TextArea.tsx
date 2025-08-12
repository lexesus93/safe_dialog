import React from 'react'
import { cn } from '@/lib/utils'
import type { TextAreaProps } from '@/types'

const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  (
    {
      value,
      onChange,
      placeholder,
      disabled = false,
      error,
      rows = 4,
      maxLength,
      ...props
    },
    ref
  ) => {
    const baseClasses = [
      'w-full px-3 py-2 text-sm',
      'border border-gray-300 rounded-lg',
      'bg-white text-gray-900',
      'placeholder:text-gray-500',
      'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
      'transition-colors duration-200',
      'resize-vertical',
      'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',
      'dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100',
      'dark:placeholder:text-gray-400',
      'dark:disabled:bg-gray-700',
    ]

    const errorClasses = error
      ? 'border-red-500 focus:ring-red-500'
      : ''

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value)
    }

    return (
      <div className="w-full">
        <textarea
          ref={ref}
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          rows={rows}
          maxLength={maxLength}
          className={cn(baseClasses, errorClasses)}
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
        {maxLength && (
          <div className="mt-1 flex justify-between text-xs text-gray-500 dark:text-gray-400">
            <span></span>
            <span>
              {value.length}/{maxLength}
            </span>
          </div>
        )}
      </div>
    )
  }
)

TextArea.displayName = 'TextArea'

export { TextArea }
