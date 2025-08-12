import React, { useState } from 'react'
import { Plus, Trash2, Edit2, Save, X } from 'lucide-react'
import { Button } from './ui/Button'
import { TextArea } from './ui/TextArea'
import { LoadingSpinner } from './ui/LoadingSpinner'
import { useForm } from 'react-hook-form'
import { useSensitiveEntities, useAddSensitiveEntity, useDeleteSensitiveEntity, useUpdateSensitiveEntity } from '@/hooks/useApi'
import { SensitiveEntitySchema, type SensitiveEntityInput } from '@/types'
import { useToast } from '@/hooks/useToast'
import { cn } from '@/lib/utils'

export function SensitiveEntityManager() {
  const { data: entities, isLoading, error } = useSensitiveEntities()
  const addEntity = useAddSensitiveEntity()
  const updateEntity = useUpdateSensitiveEntity()
  const deleteEntity = useDeleteSensitiveEntity()
  const { toast } = useToast()
  
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm<SensitiveEntityInput>()

  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    setValue: setEditValue,
    formState: { errors: editErrors },
  } = useForm<SensitiveEntityInput>()

  const onAddSubmit = async (data: SensitiveEntityInput) => {
    try {
      await addEntity.mutateAsync(data)
      reset()
      setShowAddForm(false)
    } catch (error) {
      // Error is handled by the hook
    }
  }

  const onEditSubmit = async (data: SensitiveEntityInput) => {
    if (!editingId) return
    
    try {
      await updateEntity.mutateAsync({ id: editingId, data })
      setEditingId(null)
    } catch (error) {
      // Error is handled by the hook
    }
  }

  const handleEdit = (entity: any) => {
    setEditingId(entity.id)
    setEditValue('name', entity.name)
    setEditValue('placeholder', entity.placeholder)
  }

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Удалить "${name}" из справочника?`)) {
      try {
        await deleteEntity.mutateAsync(id)
      } catch (error) {
        // Error is handled by the hook
      }
    }
  }

  const getCategoryColor = (name: string): string => {
    // Simple heuristic to categorize entities
    if (name.includes('@')) return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
    if (/[\+\d\(\)\-\s]{9,}/.test(name)) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    if (name.includes('http')) return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
    if (/^[А-ЯЁ]/.test(name)) return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
    return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <LoadingSpinner text="Загрузка справочника..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-600 dark:text-red-400">
          Ошибка загрузки справочника: {error.message}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Справочник чувствительных данных
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Управление заменами для чувствительной информации
          </p>
        </div>
        <Button
          onClick={() => setShowAddForm(!showAddForm)}
          variant={showAddForm ? 'ghost' : 'primary'}
        >
          {showAddForm ? <X className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
          {showAddForm ? 'Отменить' : 'Добавить'}
        </Button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <form onSubmit={handleSubmit(onAddSubmit)} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Исходный фрагмент
              </label>
              <input
                {...register('name', SensitiveEntitySchema.shape.name)}
                type="text"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                placeholder="Введите чувствительные данные"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errors.name.message}
                </p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Текст замещения
              </label>
              <input
                {...register('placeholder', SensitiveEntitySchema.shape.placeholder)}
                type="text"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                placeholder="Введите заменитель"
              />
              {errors.placeholder && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errors.placeholder.message}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setShowAddForm(false)
                reset()
              }}
            >
              Отмена
            </Button>
            <Button
              type="submit"
              disabled={!isValid || addEntity.isLoading}
              loading={addEntity.isLoading}
            >
              Добавить в справочник
            </Button>
          </div>
        </form>
      )}

      {/* Entity List */}
      <div className="space-y-2">
        {!entities || entities.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p>Справочник пуст</p>
            <p className="text-sm">Добавьте чувствительные данные для их автоматического маскирования</p>
          </div>
        ) : (
          entities.map((entity) => (
            <div
              key={entity.id}
              className="p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
            >
              {editingId === entity.id ? (
                <form onSubmit={handleSubmitEdit(onEditSubmit)} className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      {...registerEdit('name', SensitiveEntitySchema.shape.name)}
                      className="px-2 py-1 text-sm border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                    />
                    <input
                      {...registerEdit('placeholder', SensitiveEntitySchema.shape.placeholder)}
                      className="px-2 py-1 text-sm border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingId(null)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      loading={updateEntity.isLoading}
                    >
                      <Save className="h-3 w-3" />
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3">
                      <span className={cn(
                        'inline-flex px-2 py-1 text-xs font-medium rounded-full',
                        getCategoryColor(entity.name)
                      )}>
                        {entity.name}
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        → {entity.placeholder}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(entity)}
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(entity.id, entity.name)}
                      disabled={deleteEntity.isLoading}
                    >
                      <Trash2 className="h-3 w-3 text-red-500" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
