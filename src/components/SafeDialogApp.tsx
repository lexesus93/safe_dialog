import React, { useState, useCallback } from 'react'
import { Shield, Settings, BookOpen, Activity } from 'lucide-react'
import { StepwiseTextProcessor } from './StepwiseTextProcessor'
import { SensitiveEntityManager } from './SensitiveEntityManager'

import { Button } from './ui/Button'
import { RadioGroup } from './ui/RadioGroup'
import { LoadingSpinner } from './ui/LoadingSpinner'
import { 
  useMaskText, 
  useProcessWithOpenRouter, 
  useDemaskText,
  useSystemPrompt,
  useUpdateSystemPrompt,
  useHealthCheck 
} from '@/hooks/useApi'
import { useToast } from '@/hooks/useToast'
import type { AppState } from '@/types'

type Tab = 'processor' | 'entities' | 'settings'

export function SafeDialogApp() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<Tab>('processor')
  
  // App state
  const [appState, setAppState] = useState<AppState>({
    queryText: '',
    contextText: '',
    maskedQueryText: '',
    maskedContextText: '',
    resultText: '',
    demaskedResultText: '',
    maskingPrompt: '',
    systemPrompt: '',
    viewMode: {
      query: 'original',
      context: 'original',
      detail: false,
      result: 'masked',
    },
    isProcessing: false,
    isDemaskingResult: false,
    error: null,
  })

  // API hooks
  const maskTextMutation = useMaskText()
  const processTextMutation = useProcessWithOpenRouter()
  const demaskTextMutation = useDemaskText()
  const { data: systemPrompt, isLoading: isLoadingPrompt } = useSystemPrompt()
  const updateSystemPromptMutation = useUpdateSystemPrompt()
  const { data: healthData } = useHealthCheck()

  // Update system prompt when loaded from server
  React.useEffect(() => {
    if (systemPrompt) {
      setAppState(prev => ({ ...prev, systemPrompt }))
    }
  }, [systemPrompt])

  // Ensure prompts are always strings - only set fallback if server loading failed
  React.useEffect(() => {
    if (!appState.maskingPrompt) {
      setAppState(prev => ({ 
        ...prev, 
        maskingPrompt: 'Найди и замаскируй чувствительные данные: имена, email, телефоны, адреса'
      }))
    }
    // Only set fallback systemPrompt if server data is not loading and not available
    if (!appState.systemPrompt && !isLoadingPrompt && !systemPrompt) {
      setAppState(prev => ({ 
        ...prev, 
        systemPrompt: 'Ты помощник для анализа и обработки текста. Отвечай четко и по существу.'
      }))
    }
  }, [isLoadingPrompt, systemPrompt])

  // Handlers
  const handleQueryTextChange = useCallback((text: string) => {
    setAppState(prev => ({ ...prev, queryText: text }))
  }, [])

  const handleContextTextChange = useCallback((text: string) => {
    setAppState(prev => ({ ...prev, contextText: text }))
  }, [])

  const handleViewModeChange = useCallback((newMode: Partial<AppState['viewMode']>) => {
    setAppState(prev => ({
      ...prev,
      viewMode: { ...prev.viewMode, ...newMode }
    }))
  }, [])

  const handleMaskText = useCallback(async () => {
    const hasQueryText = appState.queryText.trim()
    const hasContextText = appState.contextText.trim()
    
    console.log('[SafeDialogApp] handleMaskText called:', {
      queryTextLength: appState.queryText.length,
      contextTextLength: appState.contextText.length,
      maskingPrompt: appState.maskingPrompt ? appState.maskingPrompt.substring(0, 50) + '...' : 'нет'
    })

    if (!hasQueryText && !hasContextText) {
      console.warn('[SafeDialogApp] Маскирование отменено - нет текста')
      toast({
        title: 'Нет данных для маскирования',
        description: 'Введите текст в поле "Ваш запрос" или "Контекст"',
        variant: 'destructive',
      })
      return
    }

    try {
      const promises = []
      
      // Маскируем запрос если есть
      if (hasQueryText) {
        promises.push(
          maskTextMutation.mutateAsync({
            text: appState.queryText,
            systemPrompt: appState.maskingPrompt || '',
          }).then(result => ({ type: 'query', result }))
        )
      }
      
      // Маскируем контекст если есть
      if (hasContextText) {
        promises.push(
          maskTextMutation.mutateAsync({
            text: appState.contextText,
            systemPrompt: appState.maskingPrompt || '',
          }).then(result => ({ type: 'context', result }))
        )
      }
      
      const results = await Promise.all(promises)
      
      // Обновляем состояние с результатами
      setAppState(prev => {
        const newState = { ...prev, error: null }
        
        results.forEach(({ type, result }) => {
          if (type === 'query') {
            newState.maskedQueryText = result.maskedText
          } else if (type === 'context') {
            newState.maskedContextText = result.maskedText
          }
        })
        
        return newState
      })

      const totalEntities = results.reduce((sum, { result }) => sum + (result.entitiesFound?.length || 0), 0)
      
      toast({
        title: 'Данные замаскированы',
        description: `Найдено ${totalEntities} чувствительных данных`,
        variant: 'success',
      })
    } catch (error) {
      console.error('[SafeDialogApp] Ошибка маскирования:', error)
      setAppState(prev => ({ ...prev, error: error instanceof Error ? error.message : String(error) }))
    }
  }, [appState.queryText, appState.contextText, appState.maskingPrompt, maskTextMutation, toast])

  const handleSkipMasking = useCallback(() => {
    // Копируем исходные тексты как "маскированные" для продолжения workflow
    setAppState(prev => ({
      ...prev,
      maskedQueryText: prev.queryText,
      maskedContextText: prev.contextText,
      error: null,
    }))

    toast({
      title: 'Маскирование пропущено',
      description: 'Исходные тексты будут отправлены в ИИ без изменений',
      variant: 'warning',
    })
  }, [toast])

  const handleProcessText = useCallback(async () => {
    console.log('[SafeDialogApp] handleProcessText вызван! Состояние:', {
      maskedQueryText: appState.maskedQueryText?.length || 0,
      maskedContextText: appState.maskedContextText?.length || 0,
      systemPrompt: (typeof appState.systemPrompt === 'string') ? appState.systemPrompt.length : `не строка: ${typeof appState.systemPrompt}`,
      isProcessing: processTextMutation.isLoading
    })
    
    const hasMaskedQuery = appState.maskedQueryText.trim()
    const hasMaskedContext = appState.maskedContextText.trim()
    
    if (!hasMaskedQuery && !hasMaskedContext) {
      console.warn('[SafeDialogApp] Попытка обработки без маскированного текста')
      toast({
        title: 'Нет данных для обработки',
        description: 'Сначала выполните маскирование данных',
        variant: 'destructive',
      })
      return
    }

    // Комбинируем маскированные тексты
    const combinedText = [
      hasMaskedQuery ? `Запрос: ${appState.maskedQueryText}` : '',
      hasMaskedContext ? `Контекст: ${appState.maskedContextText}` : ''
    ].filter(Boolean).join('\n\n')

    console.log('[SafeDialogApp] Начало обработки через OpenRouter:', {
      combinedTextLength: combinedText.length,
      systemPrompt: (typeof appState.systemPrompt === 'string' && appState.systemPrompt) 
        ? appState.systemPrompt.substring(0, 50) + '...' 
        : 'нет или не строка: ' + typeof appState.systemPrompt
    })

    // Очищаем предыдущий результат перед новым запросом
    setAppState(prev => ({
      ...prev,
      resultText: '',
      demaskedResultText: '',
      error: null,
    }))

    try {
      const result = await processTextMutation.mutateAsync({
        text: combinedText,
        systemPrompt: appState.systemPrompt || '',
      })
      
      console.log('[SafeDialogApp] Результат обработки OpenRouter:', {
        resultLength: result?.length || 0,
        preview: result?.substring(0, 100) || 'пустой результат'
      })
      
      setAppState(prev => ({
        ...prev,
        resultText: result,
        error: null,
      }))

      toast({
        title: 'Текст обработан',
        description: `Получен ответ от OpenRouter (${result?.length || 0} символов)`,
        variant: 'success',
      })
    } catch (error) {
      console.error('[SafeDialogApp] Ошибка обработки OpenRouter:', error)
      setAppState(prev => ({ ...prev, error: error instanceof Error ? error.message : String(error) }))
    }
  }, [appState.maskedQueryText, appState.maskedContextText, appState.systemPrompt, processTextMutation, toast])

  const handleMaskingPromptChange = useCallback((prompt: string) => {
    setAppState(prev => ({ ...prev, maskingPrompt: prompt }))
  }, [])

  const handleSystemPromptChange = useCallback((prompt: string) => {
    setAppState(prev => ({ ...prev, systemPrompt: prompt }))
  }, [])

  const handleDemaskResult = useCallback(async () => {
    if (!appState.resultText) {
      console.warn('[SafeDialogApp] Попытка демаскирования без результата')
      toast({
        title: 'Нет данных для демаскирования',
        description: 'Сначала получите результат от ИИ',
        variant: 'destructive',
      })
      return
    }

    console.log('[SafeDialogApp] Начало демаскирования результата:', {
      resultTextLength: appState.resultText.length
    })

    try {
      setAppState(prev => ({ ...prev, isDemaskingResult: true }))
      
      const demaskedResult = await demaskTextMutation.mutateAsync(appState.resultText)
      
      console.log('[SafeDialogApp] Результат демаскирования:', {
        demaskedLength: demaskedResult?.length || 0
      })
      
      setAppState(prev => ({
        ...prev,
        demaskedResultText: demaskedResult,
        viewMode: { ...prev.viewMode, result: 'demasked' },
        isDemaskingResult: false,
        error: null,
      }))

      toast({
        title: 'Результат демаскирован',
        description: `Восстановлены исходные данные (${demaskedResult?.length || 0} символов)`,
        variant: 'success',
      })
    } catch (error) {
      console.error('[SafeDialogApp] Ошибка демаскирования:', error)
      setAppState(prev => ({ 
        ...prev, 
        isDemaskingResult: false,
        error: error instanceof Error ? error.message : String(error) 
      }))
    }
  }, [appState.resultText, demaskTextMutation, toast])

  const handleSaveSystemPrompt = useCallback(async () => {
    try {
      await updateSystemPromptMutation.mutateAsync(appState.systemPrompt)
    } catch (error) {
      // Error handled by hook
    }
  }, [appState.systemPrompt, updateSystemPromptMutation])

  const tabs = [
    { id: 'processor' as const, label: 'Обработка текста', icon: Shield },
    { id: 'entities' as const, label: 'Справочник', icon: BookOpen },
    { id: 'settings' as const, label: 'Настройки', icon: Settings },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <Shield className="h-8 w-8 text-primary-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  Safe Dialog
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Маскирование чувствительных данных
                </p>
              </div>
            </div>
            
            {/* Health Status */}
            <div className="flex items-center space-x-2">
              <Activity className={`h-4 w-4 ${
                healthData ? 'text-green-500' : 'text-red-500'
              }`} />
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {healthData ? 'Система работает' : 'Проблемы с подключением'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'processor' && (
          <StepwiseTextProcessor
            queryText={appState.queryText}
            contextText={appState.contextText}
            onQueryTextChange={handleQueryTextChange}
            onContextTextChange={handleContextTextChange}
            maskedQueryText={appState.maskedQueryText}
            maskedContextText={appState.maskedContextText}
            resultText={appState.resultText}
            demaskedResultText={appState.demaskedResultText}
            onMaskText={handleMaskText}
            onSkipMasking={handleSkipMasking}
            onProcessText={handleProcessText}
            onDemaskResult={handleDemaskResult}
            isProcessing={processTextMutation.isLoading}
            isMasking={maskTextMutation.isLoading}
            isDemaskingResult={appState.isDemaskingResult}
            viewMode={appState.viewMode}
            onViewModeChange={handleViewModeChange}
          />
        )}

        {activeTab === 'entities' && (
          <SensitiveEntityManager />
        )}

        {activeTab === 'settings' && (
          <div className="max-w-2xl space-y-8">
            {/* Промпт для маскирования */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Промпт для маскирования
              </h2>
              <div className="space-y-4">
                <textarea
                  value={appState.maskingPrompt}
                  onChange={(e) => handleMaskingPromptChange(e.target.value)}
                  className="w-full h-32 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                  placeholder="Введите промпт для маскирования чувствительных данных..."
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Этот промпт используется для обнаружения и маскирования чувствительных данных в тексте.
                </p>
              </div>
            </div>

            {/* Системный промпт для внешней ИИ */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Системный промпт для внешней ИИ
              </h2>
              <div className="space-y-4">
                {isLoadingPrompt ? (
                  <LoadingSpinner text="Загрузка настроек..." />
                ) : (
                  <>
                    <textarea
                      value={appState.systemPrompt}
                      onChange={(e) => handleSystemPromptChange(e.target.value)}
                      className="w-full h-32 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                      placeholder="Введите системный промпт для обработки через OpenRouter..."
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Этот промпт отправляется в OpenRouter вместе с маскированным текстом для обработки внешней ИИ.
                    </p>
                    <Button
                      onClick={handleSaveSystemPrompt}
                      loading={updateSystemPromptMutation.isLoading}
                      disabled={!appState.systemPrompt.trim()}
                    >
                      Сохранить системный промпт
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Режимы отображения по умолчанию */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Режимы отображения по умолчанию
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Режим для запроса
                  </h3>
                  <RadioGroup
                    value={appState.viewMode.query}
                    onValueChange={(value) => handleViewModeChange({ query: value as 'original' | 'masked' })}
                    options={[
                      { value: 'original', label: 'Исходный' },
                      { value: 'masked', label: 'Маскированный' },
                    ]}
                  />
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Режим для контекста
                  </h3>
                  <RadioGroup
                    value={appState.viewMode.context}
                    onValueChange={(value) => handleViewModeChange({ context: value as 'original' | 'masked' })}
                    options={[
                      { value: 'original', label: 'Исходный' },
                      { value: 'masked', label: 'Маскированный' },
                    ]}
                  />
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Режим для результата
                  </h3>
                  <RadioGroup
                    value={appState.viewMode.result}
                    onValueChange={(value) => handleViewModeChange({ result: value as 'masked' | 'demasked' })}
                    options={[
                      { value: 'masked', label: 'Маскированный' },
                      { value: 'demasked', label: 'Демаскированный' },
                    ]}
                  />
                </div>
              </div>
              
              <div className="mt-4 flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="detail-mode-settings"
                  checked={appState.viewMode.detail}
                  onChange={(e) => handleViewModeChange({ detail: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="detail-mode-settings" className="text-sm text-gray-700 dark:text-gray-300">
                  Детальный режим по умолчанию (показывать полные блоки {`{ID, TXT}`})
                </label>
              </div>
            </div>
          </div>
        )}
      </main>



      {/* Error Display */}
      {appState.error && (
        <div className="fixed bottom-4 right-4 max-w-sm">
          <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800 dark:text-red-200">
                  {appState.error}
                </p>
              </div>
              <div className="ml-auto pl-3">
                <button
                  onClick={() => setAppState(prev => ({ ...prev, error: null }))}
                  className="text-red-400 hover:text-red-600"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
