import axios, { AxiosError } from 'axios'
import type { 
  ApiResponse, 
  SensitiveEntity, 
  SensitiveEntityInput, 
  MaskingResult,
  MaskingApiResponse,
  TextProcessingInput 
} from '@/types'
import { AppError } from '@/types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000, // Увеличиваем таймаут до 2 минут для длительных операций
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`)
    return config
  },
  (error) => {
    console.error('[API] Request error:', error)
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response
  },
  (error: AxiosError) => {
    const message = error.response?.data?.message || error.message || 'Неизвестная ошибка'
    const status = error.response?.status
    const code = error.code
    
    console.error('[API] Response error:', { message, status, code })
    
    throw new AppError(message, code, status)
  }
)

// Utility function to handle API responses
const handleApiResponse = <T>(response: any): T => {
  console.log('[API] handleApiResponse received:', response.data)
  
  if (response.data?.success === false) {
    throw new AppError(response.data.error || 'API error')
  }
  
  // Для FastAPI ответы приходят напрямую в data, без обертки
  return response.data
}

// API functions
export const apiClient = {
  // Text processing
  async maskText(data: TextProcessingInput): Promise<MaskingResult> {
    const response = await api.post('/mask-text', data)
    const apiResult = handleApiResponse<MaskingApiResponse>(response)
    
    // Конвертируем snake_case в camelCase
    return {
      maskedText: apiResult.masked_text,
      entitiesFound: apiResult.entities_found || [],
      processingTime: apiResult.processing_time
    }
  },

  async demaskText(maskedText: string): Promise<string> {
    const response = await api.post('/demask-text', { maskedText })
    return handleApiResponse<string>(response)
  },

  async processWithOpenRouter(data: { text: string; systemPrompt: string }): Promise<string> {
    const response = await api.post('/process-openrouter', data)
    // Ожидаем строку напрямую от API
    const result = handleApiResponse<string>(response)
    return typeof result === 'string' ? result : result.data || ''
  },

  // Sensitive entities management
  async getSensitiveEntities(): Promise<SensitiveEntity[]> {
    const response = await api.get('/sensitive-entities')
    return handleApiResponse<SensitiveEntity[]>(response)
  },

  async addSensitiveEntity(data: SensitiveEntityInput): Promise<SensitiveEntity> {
    const response = await api.post('/sensitive-entities', data)
    return handleApiResponse<SensitiveEntity>(response)
  },

  async updateSensitiveEntity(id: string, data: Partial<SensitiveEntityInput>): Promise<SensitiveEntity> {
    const response = await api.put(`/sensitive-entities/${id}`, data)
    return handleApiResponse<SensitiveEntity>(response)
  },

  async deleteSensitiveEntity(id: string): Promise<void> {
    const response = await api.delete(`/sensitive-entities/${id}`)
    return handleApiResponse<void>(response)
  },

  // System settings
  async getSystemPrompt(): Promise<string> {
    const response = await api.get('/system-prompt')
    const result = handleApiResponse<{data: string}>(response)
    return result.data || ''
  },

  async updateSystemPrompt(prompt: string): Promise<string> {
    const response = await api.put('/system-prompt', { prompt })
    const result = handleApiResponse<{data: string}>(response)
    return result.data || ''
  },

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    const response = await api.get('/health')
    return handleApiResponse(response)
  },
}

// Custom hooks for data fetching would use these API functions
export default apiClient
