import { clsx, type ClassValue } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

export function truncateText(text: string, maxLength: number) {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout)
    }
    
    timeout = setTimeout(() => {
      func(...args)
    }, wait)
  }
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

export function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text)
  } else {
    // Fallback for older browsers
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'absolute'
    textArea.style.left = '-999999px'
    document.body.prepend(textArea)
    textArea.select()
    
    try {
      document.execCommand('copy')
    } catch (error) {
      console.error('Failed to copy text: ', error)
      throw new Error('Failed to copy text to clipboard')
    } finally {
      textArea.remove()
    }
    
    return Promise.resolve()
  }
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/
  const digitsOnly = phone.replace(/\D/g, '')
  return digitsOnly.length >= 9 && digitsOnly.length <= 15
}

export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('ru-RU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  }).format(dateObj)
}

export function renderMaskedHtml(text: string, mode: 'placeholders' | 'blocks'): string {
  // Regex for finding blocks like {ID=..., TXT='...'} (детальные)
  const detailedPattern = /\{ID=([^,}]+),\s*TXT=(['"])(.*?)\2\s*\}/g
  
  // Regex for finding simple blocks like {PERSON_NAME_1}, {EMAIL_1}, etc.
  const simplePattern = /\{[A-Z_][A-Z0-9_]*\}/g
  
  // Сначала обрабатываем детальные блоки
  let result = text.replace(detailedPattern, (fullMatch, id, quote, placeholder) => {
    if (mode === 'placeholders') {
      return `<span class="mask-chip">${placeholder}</span>`
    }
    return `<span class="mask-chip">${fullMatch}</span>`
  })
  
  // Затем обрабатываем простые блоки (которые не были обработаны выше)
  result = result.replace(simplePattern, (match) => {
    // Проверяем, не находится ли блок уже внутри span с mask-chip
    const beforeMatch = result.substring(0, result.indexOf(match))
    const lastSpanStart = beforeMatch.lastIndexOf('<span class="mask-chip">')
    const lastSpanEnd = beforeMatch.lastIndexOf('</span>')
    
    // Если блок уже внутри span, не обрабатываем
    if (lastSpanStart > lastSpanEnd) {
      return match
    }
    
    return `<span class="mask-chip">${match}</span>`
  })
  
  return result
}

export function extractPlaceholdersFromMasked(text: string): string {
  const pattern = /\{ID=([^,}]+),\s*TXT=(['"])(.*?)\2\s*\}/g
  return text.replace(pattern, (_, id, quote, placeholder) => placeholder)
}

export function validateTextLength(text: string, maxLength: number = 50000): boolean {
  return text.length > 0 && text.length <= maxLength
}

export function sanitizeHtml(html: string): string {
  const temp = document.createElement('div')
  temp.textContent = html
  return temp.innerHTML
}
