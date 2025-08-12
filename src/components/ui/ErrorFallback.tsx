import React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from './Button'

interface ErrorFallbackProps {
  error: Error
  resetErrorBoundary: () => void
}

export function ErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 text-center">
          <div className="flex justify-center mb-4">
            <AlertTriangle className="h-12 w-12 text-red-500" />
          </div>
          
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Что-то пошло не так
          </h1>
          
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Произошла неожиданная ошибка. Попробуйте перезагрузить страницу.
          </p>
          
          <details className="mb-4 text-left">
            <summary className="cursor-pointer text-sm text-gray-500 dark:text-gray-400 mb-2">
              Подробности ошибки
            </summary>
            <pre className="text-xs bg-gray-100 dark:bg-gray-700 p-2 rounded overflow-auto max-h-32">
              {error.message}
            </pre>
          </details>
          
          <div className="space-y-3">
            <Button
              onClick={resetErrorBoundary}
              variant="primary"
              fullWidth
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Попробовать снова
            </Button>
            
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              fullWidth
            >
              Перезагрузить страницу
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
