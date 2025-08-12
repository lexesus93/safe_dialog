import React from 'react'
import { cn } from '@/lib/utils'

interface RadioGroupProps {
  value: string
  onValueChange: (value: string) => void
  options: Array<{
    value: string
    label: string
    disabled?: boolean
  }>
  name?: string
  orientation?: 'horizontal' | 'vertical'
  className?: string
}

export function RadioGroup({
  value,
  onValueChange,
  options,
  name,
  orientation = 'vertical',
  className,
}: RadioGroupProps) {
  const containerClasses = cn(
    'space-y-2',
    orientation === 'horizontal' && 'flex space-x-4 space-y-0',
    className
  )

  return (
    <div className={containerClasses} role="radiogroup">
      {options.map((option) => (
        <RadioItem
          key={option.value}
          value={option.value}
          label={option.label}
          checked={value === option.value}
          onChange={() => onValueChange(option.value)}
          disabled={option.disabled}
          name={name}
        />
      ))}
    </div>
  )
}

interface RadioItemProps {
  value: string
  label: string
  checked: boolean
  onChange: () => void
  disabled?: boolean
  name?: string
}

function RadioItem({
  value,
  label,
  checked,
  onChange,
  disabled = false,
  name,
}: RadioItemProps) {
  return (
    <label className={cn(
      'flex items-center cursor-pointer',
      disabled && 'cursor-not-allowed opacity-50'
    )}>
      <input
        type="radio"
        value={value}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        name={name}
        className="sr-only"
      />
      <div className={cn(
        'relative w-4 h-4 rounded-full border-2 mr-3',
        'transition-colors duration-200',
        checked
          ? 'border-primary-600 bg-primary-600'
          : 'border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800',
        !disabled && 'hover:border-primary-500',
        disabled && 'cursor-not-allowed'
      )}>
        {checked && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-white" />
          </div>
        )}
      </div>
      <span className="text-sm text-gray-700 dark:text-gray-300 select-none">
        {label}
      </span>
    </label>
  )
}
