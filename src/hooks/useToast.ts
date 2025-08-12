import { useState, useCallback } from 'react'

export interface Toast {
  id: string
  title: string
  description?: string
  variant?: 'default' | 'destructive' | 'success' | 'warning'
  duration?: number
}

interface ToastState {
  toasts: Toast[]
}

let toastCount = 0

export function useToast() {
  const [state, setState] = useState<ToastState>({ toasts: [] })

  const toast = useCallback(
    ({ 
      title, 
      description, 
      variant = 'default', 
      duration = 5000,
      ...props 
    }: Omit<Toast, 'id'>) => {
      const id = (++toastCount).toString()
      
      const newToast: Toast = {
        id,
        title,
        description,
        variant,
        duration,
        ...props,
      }

      setState((prevState) => ({
        ...prevState,
        toasts: [...prevState.toasts, newToast],
      }))

      if (duration > 0) {
        setTimeout(() => {
          setState((prevState) => ({
            ...prevState,
            toasts: prevState.toasts.filter((t) => t.id !== id),
          }))
        }, duration)
      }

      return {
        id,
        dismiss: () => {
          setState((prevState) => ({
            ...prevState,
            toasts: prevState.toasts.filter((t) => t.id !== id),
          }))
        },
      }
    },
    []
  )

  const dismiss = useCallback((toastId: string) => {
    setState((prevState) => ({
      ...prevState,
      toasts: prevState.toasts.filter((t) => t.id !== toastId),
    }))
  }, [])

  return {
    toasts: state.toasts,
    toast,
    dismiss,
  }
}
