import { z } from 'zod'

// API Response types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Sensitive Entity types
export interface SensitiveEntity {
  id: string
  name: string
  placeholder: string
  category?: 'email' | 'phone' | 'social' | 'company' | 'product' | 'person' | 'generic'
}

// Masking types (API response format)
export interface MaskingApiResponse {
  masked_text: string
  entities_found: SensitiveEntity[]
  processing_time?: number
}

// Masking types (frontend format)
export interface MaskingResult {
  maskedText: string
  entitiesFound: SensitiveEntity[]
  processingTime?: number
}

export interface ProcessingOptions {
  mode: 'mask' | 'demask'
  viewMode: 'placeholders' | 'blocks' | 'original'
}

// Form validation schemas
export const SensitiveEntitySchema = z.object({
  name: z.string().min(1, 'Название не может быть пустым').max(200, 'Название слишком длинное'),
  placeholder: z.string().min(1, 'Заменитель не может быть пустым').max(50, 'Заменитель слишком длинный'),
})

export const TextProcessingSchema = z.object({
  text: z.string().min(1, 'Текст не может быть пустым').max(50000, 'Текст слишком длинный'),
  systemPrompt: z.string().optional(),
})

export type SensitiveEntityInput = z.infer<typeof SensitiveEntitySchema>
export type TextProcessingInput = z.infer<typeof TextProcessingSchema>

// UI State types
export interface AppState {
  queryText: string           // Ваш запрос
  contextText: string         // Контекст
  maskedQueryText: string     // Маскированный запрос
  maskedContextText: string   // Маскированный контекст
  resultText: string
  demaskedResultText: string  // Демаскированный результат
  maskingPrompt: string       // Промпт для маскирования
  systemPrompt: string        // Системный промпт для внешней ИИ
  viewMode: {
    query: 'original' | 'masked'      // Режим отображения запроса
    context: 'original' | 'masked'    // Режим отображения контекста
    detail: boolean                   // Детальный режим (полные блоки vs заместители)
    result: 'masked' | 'demasked'     // Режим отображения результата
  }
  isProcessing: boolean
  isDemaskingResult: boolean
  error: string | null
}

// Component Props types
export interface TextAreaProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  error?: string
  rows?: number
  maxLength?: number
}

export interface ButtonProps {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  loading?: boolean
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
  type?: 'button' | 'submit' | 'reset'
}

// Error types
export class AppError extends Error {
  constructor(
    message: string,
    public code?: string,
    public status?: number
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export interface ErrorInfo {
  message: string
  code?: string
  status?: number
  timestamp: Date
}
