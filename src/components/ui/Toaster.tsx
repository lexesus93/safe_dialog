import { FC } from 'react'
import { X, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { useToast } from '@/hooks/useToast'
import { cn } from '@/lib/utils'

export function Toaster() {
  const { toasts, dismiss } = useToast()

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-0 right-0 z-50 w-full max-w-sm p-4 space-y-4 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onDismiss={() => dismiss(toast.id)}
        />
      ))}
    </div>
  )
}

interface ToastItemProps {
  toast: {
    id: string
    title: string
    description?: string
    variant?: 'default' | 'destructive' | 'success' | 'warning'
  }
  onDismiss: () => void
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const { title, description, variant = 'default' } = toast

  const baseClasses = [
    'relative w-full rounded-lg shadow-lg p-4',
    'bg-white dark:bg-gray-800',
    'border border-gray-200 dark:border-gray-700',
    'pointer-events-auto',
    'animate-in slide-in-from-top-2 fade-in-0 duration-300',
  ]

  const variantClasses = {
    default: 'border-l-4 border-l-blue-500',
    destructive: 'border-l-4 border-l-red-500',
    success: 'border-l-4 border-l-green-500',
    warning: 'border-l-4 border-l-yellow-500',
  }

  const getIcon = () => {
    switch (variant) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'destructive':
        return <XCircle className="h-5 w-5 text-red-500" />
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />
      default:
        return <AlertCircle className="h-5 w-5 text-blue-500" />
    }
  }

  return (
    <div className={cn(baseClasses, variantClasses[variant])}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          {getIcon()}
        </div>
        
        <div className="ml-3 flex-1">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {title}
          </p>
          {description && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {description}
            </p>
          )}
        </div>
        
        <button
          onClick={onDismiss}
          className="ml-3 flex-shrink-0 rounded-md p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Закрыть"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
