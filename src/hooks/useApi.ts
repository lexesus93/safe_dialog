import { useMutation, useQuery, useQueryClient } from 'react-query'
import { apiClient } from '@/lib/api'
import type { 
  SensitiveEntity, 
  SensitiveEntityInput, 
  MaskingResult,
  TextProcessingInput 
} from '@/types'
import { useToast } from './useToast'

// Query keys
export const queryKeys = {
  sensitiveEntities: ['sensitive-entities'] as const,
  systemPrompt: ['system-prompt'] as const,
  health: ['health'] as const,
}

// Text processing hooks
export function useMaskText() {
  const { toast } = useToast()
  
  return useMutation<MaskingResult, Error, TextProcessingInput>(
    (data) => {
      console.log('[useMaskText] Mutation called with:', data)
      return apiClient.maskText(data)
    },
    {
      onSuccess: (result) => {
        console.log('[useMaskText] Success:', result)
      },
      onError: (error) => {
        console.error('[useMaskText] Error:', error)
        const isTimeout = error.message.includes('timeout') || error.message.includes('30000ms')
        toast({
          title: 'Ошибка маскирования',
          description: isTimeout 
            ? 'Операция заняла слишком много времени. Попробуйте с меньшим объемом текста или повторите попытку.'
            : error.message,
          variant: 'destructive',
        })
      },
    }
  )
}

export function useDemaskText() {
  const { toast } = useToast()
  
  return useMutation<string, Error, string>(
    (maskedText) => apiClient.demaskText(maskedText),
    {
      onError: (error) => {
        toast({
          title: 'Ошибка де-маскирования',
          description: error.message,
          variant: 'destructive',
        })
      },
    }
  )
}

export function useProcessWithOpenRouter() {
  const { toast } = useToast()
  
  return useMutation<string, Error, { text: string; systemPrompt: string }>(
    (data) => {
      console.log('[useProcessWithOpenRouter] Mutation запущена с данными:', {
        textLength: data.text?.length || 0,
        systemPromptLength: data.systemPrompt?.length || 0,
        textPreview: data.text?.substring(0, 50) || 'пустой текст',
        promptPreview: data.systemPrompt?.substring(0, 50) || 'пустой промпт'
      })
      return apiClient.processWithOpenRouter(data)
    },
    {
      // Отключаем кэширование для диагностики
      onSuccess: (result) => {
        console.log('[useProcessWithOpenRouter] Успешный результат:', {
          resultLength: result?.length || 0,
          preview: result?.substring(0, 100) || 'пустой результат'
        })
      },
      onError: (error) => {
        const isTimeout = error.message.includes('timeout') || error.message.includes('120000ms')
        toast({
          title: 'Ошибка обработки',
          description: isTimeout 
            ? 'Обработка заняла слишком много времени. OpenRouter может быть перегружен, попробуйте позже.'
            : error.message,
          variant: 'destructive',
        })
      },
    }
  )
}

// Sensitive entities hooks
export function useSensitiveEntities() {
  return useQuery<SensitiveEntity[], Error>(
    queryKeys.sensitiveEntities,
    () => apiClient.getSensitiveEntities(),
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    }
  )
}

export function useAddSensitiveEntity() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation<SensitiveEntity, Error, SensitiveEntityInput>(
    (data) => apiClient.addSensitiveEntity(data),
    {
      onSuccess: (newEntity) => {
        queryClient.invalidateQueries(queryKeys.sensitiveEntities)
        toast({
          title: 'Успешно добавлено',
          description: `Чувствительные данные "${newEntity.name}" добавлены в справочник`,
        })
      },
      onError: (error) => {
        toast({
          title: 'Ошибка добавления',
          description: error.message,
          variant: 'destructive',
        })
      },
    }
  )
}

export function useUpdateSensitiveEntity() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation<SensitiveEntity, Error, { id: string; data: Partial<SensitiveEntityInput> }>(
    ({ id, data }) => apiClient.updateSensitiveEntity(id, data),
    {
      onSuccess: (updatedEntity) => {
        queryClient.invalidateQueries(queryKeys.sensitiveEntities)
        toast({
          title: 'Успешно обновлено',
          description: `Чувствительные данные "${updatedEntity.name}" обновлены`,
        })
      },
      onError: (error) => {
        toast({
          title: 'Ошибка обновления',
          description: error.message,
          variant: 'destructive',
        })
      },
    }
  )
}

export function useDeleteSensitiveEntity() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation<void, Error, string>(
    (id) => apiClient.deleteSensitiveEntity(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(queryKeys.sensitiveEntities)
        toast({
          title: 'Успешно удалено',
          description: 'Чувствительные данные удалены из справочника',
        })
      },
      onError: (error) => {
        toast({
          title: 'Ошибка удаления',
          description: error.message,
          variant: 'destructive',
        })
      },
    }
  )
}

// System settings hooks
export function useSystemPrompt() {
  return useQuery<string, Error>(
    queryKeys.systemPrompt,
    () => apiClient.getSystemPrompt(),
    {
      staleTime: 10 * 60 * 1000, // 10 minutes
    }
  )
}

export function useUpdateSystemPrompt() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation<string, Error, string>(
    (prompt) => apiClient.updateSystemPrompt(prompt),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(queryKeys.systemPrompt)
        toast({
          title: 'Системный промпт обновлен',
          description: 'Изменения сохранены',
        })
      },
      onError: (error) => {
        toast({
          title: 'Ошибка обновления',
          description: error.message,
          variant: 'destructive',
        })
      },
    }
  )
}

// Health check hook
export function useHealthCheck() {
  return useQuery(
    queryKeys.health,
    () => apiClient.healthCheck(),
    {
      refetchInterval: 30000, // 30 seconds
      retry: 3,
    }
  )
}
