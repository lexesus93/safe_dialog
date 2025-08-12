import React, { useState, useCallback, useEffect } from 'react'
import { ArrowLeft, ArrowRight, Copy, RotateCcw, AlertTriangle } from 'lucide-react'
import { Button } from './ui/Button'
import { TextArea } from './ui/TextArea'
import { LoadingSpinner } from './ui/LoadingSpinner'
import { ConfirmDialog } from './ui/ConfirmDialog'
import { renderMaskedHtml, copyToClipboard } from '@/lib/utils'
import { useToast } from '@/hooks/useToast'

type WorkflowStep = 'input' | 'masking' | 'ai-processing'

interface StepwiseTextProcessorProps {
  queryText: string
  contextText: string
  onQueryTextChange: (text: string) => void
  onContextTextChange: (text: string) => void
  maskedQueryText: string
  maskedContextText: string
  resultText: string
  demaskedResultText: string
  onMaskText: () => void
  onSkipMasking: () => void
  onProcessText: () => void
  onDemaskResult: () => void
  isProcessing: boolean
  isMasking: boolean
  isDemaskingResult: boolean
  viewMode: {
    query: 'original' | 'masked'
    context: 'original' | 'masked'
    detail: boolean
    result: 'masked' | 'demasked'
  }
  onViewModeChange: (mode: Partial<StepwiseTextProcessorProps['viewMode']>) => void
}

export function StepwiseTextProcessor({
  queryText,
  contextText,
  onQueryTextChange,
  onContextTextChange,
  maskedQueryText,
  maskedContextText,
  resultText,
  demaskedResultText,
  onMaskText,
  onSkipMasking,
  onProcessText,
  onDemaskResult,
  isProcessing,
  isMasking,
  isDemaskingResult,
  viewMode,
  onViewModeChange,
}: StepwiseTextProcessorProps) {
  const { toast } = useToast()
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('input')
  const [showSkipMaskingDialog, setShowSkipMaskingDialog] = useState(false)
  const [globalViewMode, setGlobalViewMode] = useState<'original' | 'masked'>('original')

  // Синхронизируем глобальный режим просмотра с индивидуальными
  useEffect(() => {
    onViewModeChange({ 
      query: globalViewMode, 
      context: globalViewMode 
    })
  }, [globalViewMode, onViewModeChange])

  const handleCopyText = useCallback(async (text: string, label: string) => {
    try {
      await copyToClipboard(text)
      toast({
        title: 'Скопировано',
        description: `${label} скопирован в буфер обмена`,
        variant: 'success',
      })
    } catch (error) {
      toast({
        title: 'Ошибка копирования',
        description: 'Не удалось скопировать текст',
        variant: 'destructive',
      })
    }
  }, [toast])

  const handleClearAll = useCallback(() => {
    onQueryTextChange('')
    onContextTextChange('')
    setCurrentStep('input')
    setGlobalViewMode('original')
  }, [onQueryTextChange, onContextTextChange])

  const getDisplayText = useCallback((text: string, maskedText: string, mode: 'original' | 'masked'): string => {
    if (mode === 'original') return text
    return maskedText || text
  }, [])

  const getRenderedHtml = useCallback((text: string, maskedText: string, mode: 'original' | 'masked'): string => {
    const textToShow = getDisplayText(text, maskedText, mode)
    
    if (!textToShow) return '<span class="text-gray-400">Нет текста</span>'
    if (mode === 'original') return textToShow.replace(/\n/g, '<br>')
    
    return renderMaskedHtml(textToShow, viewMode.detail ? 'blocks' : 'placeholders')
  }, [getDisplayText, viewMode.detail])

  // Проверяем можно ли перейти к следующему шагу
  const canProceedFromInput = queryText.trim() || contextText.trim()
  const hasMaskedData = maskedQueryText || maskedContextText

  // Обработчики навигации
  const handleNext = useCallback(() => {
    if (currentStep === 'input' && canProceedFromInput) {
      setCurrentStep('masking')
    } else if (currentStep === 'masking') {
      if (hasMaskedData) {
        setCurrentStep('ai-processing')
      } else {
        // Показываем диалог подтверждения пропуска маскирования
        setShowSkipMaskingDialog(true)
      }
    }
  }, [currentStep, canProceedFromInput, hasMaskedData])

  const handleBack = useCallback(() => {
    if (currentStep === 'ai-processing') {
      setCurrentStep('masking')
    } else if (currentStep === 'masking') {
      setCurrentStep('input')
    }
  }, [currentStep])

  const handleSkipMasking = useCallback(() => {
    // Вызываем функцию пропуска маскирования из родительского компонента
    onSkipMasking()
    setCurrentStep('ai-processing')
  }, [onSkipMasking])

  // Получаем заголовок и описание текущего шага
  const getStepInfo = () => {
    switch (currentStep) {
      case 'input':
        return {
          title: 'Шаг 1: Ввод текста',
          description: 'Введите ваш запрос и контекст (опционально)',
        }
      case 'masking':
        return {
          title: 'Шаг 2: Маскирование данных',
          description: 'Найдите и замаскируйте чувствительные данные в тексте',
        }
      case 'ai-processing':
        return {
          title: 'Шаг 3: Обработка ИИ',
          description: 'Отправьте обработанный текст во внешний ИИ и получите результат',
        }
    }
  }

  const stepInfo = getStepInfo()

  return (
    <div className="space-y-6">
      {/* Заголовок и навигация */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {stepInfo.title}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {stepInfo.description}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            disabled={!queryText && !contextText}

          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>

        {/* Индикатор прогресса */}
        <div className="flex items-center space-x-2 mb-4">
          {['input', 'masking', 'ai-processing'].map((step, index) => (
            <React.Fragment key={step}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep === step
                  ? 'bg-blue-600 text-white'
                  : index < ['input', 'masking', 'ai-processing'].indexOf(currentStep)
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
              }`}>
                {index + 1}
              </div>
              {index < 2 && (
                <div className={`h-0.5 w-8 ${
                  index < ['input', 'masking', 'ai-processing'].indexOf(currentStep)
                    ? 'bg-green-500'
                    : 'bg-gray-200 dark:bg-gray-700'
                }`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Кнопки навигации */}
        <div className="flex justify-between">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={currentStep === 'input'}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Назад
          </Button>
          
          <Button
            onClick={handleNext}
            disabled={
              (currentStep === 'input' && !canProceedFromInput) ||
              (currentStep === 'masking' && isMasking) ||
              currentStep === 'ai-processing'
            }
          >
            Далее
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>

      {/* Содержимое шага */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-6">
        {currentStep === 'input' && (
          <div className="space-y-6">
            {/* Ваш запрос */}
            <div className="space-y-3">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                Ваш запрос
              </h3>
              <TextArea
                value={queryText}
                onChange={onQueryTextChange}
                placeholder="Введите ваш запрос..."
                rows={6}
                maxLength={25000}
              />
            </div>

            {/* Контекст */}
            <div className="space-y-3">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                Контекст (опционально)
              </h3>
              <TextArea
                value={contextText}
                onChange={onContextTextChange}
                placeholder="Введите контекст (например, исходный запрос)..."
                rows={6}
                maxLength={25000}
              />
            </div>
          </div>
        )}

        {currentStep === 'masking' && (
          <div className="space-y-6">
            {/* Единый переключатель для обоих полей */}
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                Предпросмотр текста
              </h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setGlobalViewMode('original')}
                  className={`px-3 py-1 text-sm rounded ${
                    globalViewMode === 'original'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                  }`}
                >
                  Исходный
                </button>
                <button
                  onClick={() => setGlobalViewMode('masked')}
                  className={`px-3 py-1 text-sm rounded ${
                    globalViewMode === 'masked'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                  }`}
                  disabled={!maskedQueryText && !maskedContextText}
                >
                  Маскированный
                </button>
              </div>
            </div>

            {/* Запрос (если есть) */}
            {queryText && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Ваш запрос:
                </h4>
                <div className="p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg">
                  <div 
                    className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{ 
                      __html: getRenderedHtml(queryText, maskedQueryText, globalViewMode)
                    }}
                  />
                </div>
              </div>
            )}

            {/* Контекст (если есть) */}
            {contextText && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Контекст:
                </h4>
                <div className="p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg">
                  <div 
                    className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{ 
                      __html: getRenderedHtml(contextText, maskedContextText, globalViewMode)
                    }}
                  />
                </div>
              </div>
            )}

            {/* Детальный режим */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="detail-mode"
                checked={viewMode.detail}
                onChange={(e) => onViewModeChange({ detail: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="detail-mode" className="text-sm text-gray-700 dark:text-gray-300">
                Детально (показывать полные блоки {`{ID, TXT}`})
              </label>
            </div>

            {/* Кнопка маскирования */}
            <Button
              onClick={onMaskText}
              disabled={(!queryText.trim() && !contextText.trim()) || isMasking}
              loading={isMasking}
              fullWidth
            >
              {isMasking ? 'Анализ данных...' : 'Маскировать данные'}
            </Button>

            {/* Предупреждение если нет маскированных данных */}
            {!hasMaskedData && !isMasking && queryText.trim() && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                      Маскирование не выполнено
                    </h4>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                      Вы можете продолжить без маскирования, но это может быть небезопасно если текст содержит личные данные.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {currentStep === 'ai-processing' && (
          <div className="space-y-6">
            {/* Переключатель результата */}
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                Результат обработки ИИ
              </h3>
              {resultText && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => onViewModeChange({ result: 'masked' })}
                    className={`px-3 py-1 text-sm rounded ${
                      viewMode.result === 'masked'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                    }`}
                  >
                    Маскированный
                  </button>
                  <button
                    onClick={() => {
                      if (!demaskedResultText && resultText) {
                        // Если демаскированного текста нет, но есть результат - запускаем демаскирование
                        onDemaskResult()
                      } else {
                        // Иначе просто переключаем режим просмотра
                        onViewModeChange({ result: 'demasked' })
                      }
                    }}
                    className={`px-3 py-1 text-sm rounded ${
                      viewMode.result === 'demasked'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                    }`}
                    disabled={!resultText || isDemaskingResult}
                  >
                    {isDemaskingResult ? 'Демаскирование...' : 'Демаскированный'}
                  </button>
                </div>
              )}
            </div>

            {/* Результат */}
            {isProcessing ? (
              <div className="h-96 flex items-center justify-center bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-600">
                <LoadingSpinner text="Отправка в OpenRouter... Это может занять до 2 минут." />
              </div>
            ) : (
              <div className="min-h-96 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900">
                <div className="p-4">
                  {resultText ? (
                    <div 
                      className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap"
                      dangerouslySetInnerHTML={{
                        __html: renderMaskedHtml(
                          viewMode.result === 'demasked' && demaskedResultText ? demaskedResultText : resultText,
                          'blocks'
                        ).replace(/\n/g, '<br>')
                      }}
                    />
                  ) : (
                    <div className="text-center py-16">
                      <p className="text-gray-400 mb-2">Результат обработки появится здесь</p>
                      <p className="text-xs text-gray-500">
                        Нажмите "Обработать через ИИ" для получения результата
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Кнопки управления */}
            <div className="space-y-3">
              <Button
                onClick={onProcessText}
                disabled={(!maskedQueryText && !maskedContextText && !queryText && !contextText) || isProcessing}
                loading={isProcessing}
                variant="primary"
                fullWidth
              >
                {isProcessing ? 'Обработка ИИ...' : 'Обработать через ИИ'}
              </Button>


              {resultText && (
                <Button
                  variant="ghost"
                  onClick={() => handleCopyText(
                    viewMode.result === 'demasked' && demaskedResultText ? demaskedResultText : resultText, 
                    viewMode.result === 'demasked' ? 'Демаскированный результат' : 'Результат'
                  )}
                  fullWidth
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Копировать результат
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Диалог подтверждения пропуска маскирования */}
      <ConfirmDialog
        isOpen={showSkipMaskingDialog}
        onClose={() => setShowSkipMaskingDialog(false)}
        onConfirm={handleSkipMasking}
        title="Пропустить маскирование?"
        message="Вы уверены, что не хотите использовать маскирование? Это может быть небезопасно, если ваш текст содержит личные данные (имена, email, телефоны, адреса)."
        confirmText="Да, продолжить без маскирования"
        cancelText="Отмена"
        variant="warning"
      />
    </div>
  )
}
