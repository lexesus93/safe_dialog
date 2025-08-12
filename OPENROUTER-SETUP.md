# 🤖 Настройка OpenRouter API

## 📋 Требования

1. **API ключ OpenRouter** - получите на https://openrouter.ai/
2. **Библиотека openai** - уже включена в `requirements.txt`
3. **Переменные окружения** - настройте в `.env` файле

## 🔧 Пошаговая настройка

### 1. Получите API ключ OpenRouter

1. Перейдите на https://openrouter.ai/
2. Зарегистрируйтесь или войдите в аккаунт
3. Перейдите в раздел "Keys" или "API Keys"
4. Создайте новый API ключ
5. Скопируйте ключ (начинается с `sk-or-`)

### 2. Настройте переменные окружения

Создайте файл `.env` в корне проекта:

```bash
# OpenRouter API Configuration
OPENROUTER_API_KEY=sk-or-your-actual-api-key-here
OPENROUTER_MODEL=meta-llama/llama-3.1-8b-instruct:free
```

**Важно:** Файл `.env` должен быть в `.gitignore` и не попадать в репозиторий!

### 3. Выберите модель

OpenRouter поддерживает множество моделей. Рекомендуемые варианты:

#### 🆓 Бесплатные модели:
```bash
OPENROUTER_MODEL=meta-llama/llama-3.1-8b-instruct:free
OPENROUTER_MODEL=google/gemma-7b-it:free
OPENROUTER_MODEL=mistralai/mistral-7b-instruct:free
```

#### 💰 Платные модели (лучшее качество):
```bash
OPENROUTER_MODEL=anthropic/claude-3-haiku:beta
OPENROUTER_MODEL=openai/gpt-3.5-turbo
OPENROUTER_MODEL=openai/gpt-4o-mini
```

### 4. Проверьте настройку

Запустите тест:

```bash
python openrouter_api.py
```

Ожидаемый вывод:
```
🤖 Тестирование OpenRouter API...
📋 Модель: meta-llama/llama-3.1-8b-instruct:free
🔑 API ключ: ✅ Настроен

📤 Отправляем тестовый запрос...
   Сообщение: Привет! Объясни кратко, что такое машинное обучение.
   Системный промпт: Ты helpful assistant. Отвечай кратко и понятно.

📥 Ответ от OpenRouter:
   Машинное обучение - это область искусственного интеллекта...

✅ Тест успешен!
```

## 🚀 Использование в коде

### Базовое использование:

```python
import asyncio
from openrouter_api import get_answer

async def main():
    # Простой запрос
    response = await get_answer("Привет! Как дела?")
    print(response)
    
    # Запрос с системным промптом
    response = await get_answer(
        "Анализируй этот текст", 
        "Ты expert data analyst. Будь точным и конкретным."
    )
    print(response)

asyncio.run(main())
```

### В FastAPI приложении:

```python
from openrouter_api import get_answer

@app.post("/api/process-openrouter")
async def process_with_openrouter(data: dict):
    try:
        response = await get_answer(
            data["text"], 
            data.get("systemPrompt")
        )
        return {"result": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

## 🔧 Конфигурация

### Доступные параметры:

| Параметр | Описание | По умолчанию |
|----------|----------|---------------|
| `OPENROUTER_API_KEY` | API ключ OpenRouter | Обязательный |
| `OPENROUTER_MODEL` | Модель для использования | `meta-llama/llama-3.1-8b-instruct:free` |

### Настройки модели в коде:

```python
# В openrouter_api.py модифицируйте параметры:
response = await self.client.chat.completions.create(
    model=self.model,
    messages=messages,
    max_tokens=4000,        # Максимум токенов в ответе
    temperature=0.7,        # Креативность (0.0-1.0)
    top_p=0.9,             # Nucleus sampling
    frequency_penalty=0.0,  # Штраф за повторения
    presence_penalty=0.0,   # Штраф за присутствие токенов
)
```

## 🛠️ Отладка

### Проблема: API ключ не найден
```
❌ Для работы нужно настроить OPENROUTER_API_KEY в переменных окружения
```

**Решение:**
1. Проверьте файл `.env`
2. Убедитесь что ключ начинается с `sk-or-`
3. Перезапустите приложение

### Проблема: Ошибка авторизации
```
[ОШИБКА] Ошибка при обращении к OpenRouter: 401 Unauthorized
```

**Решение:**
1. Проверьте правильность API ключа
2. Убедитесь что у ключа есть права на выбранную модель
3. Проверьте баланс аккаунта для платных моделей

### Проблема: Модель недоступна
```
[ОШИБКА] Ошибка при обращении к OpenRouter: 400 Bad Request
```

**Решение:**
1. Проверьте правильность названия модели
2. Используйте бесплатную модель для тестирования
3. Проверьте доступность модели на https://openrouter.ai/models

## 📊 Мониторинг

Логи OpenRouter сохраняются в системный лог:

```python
import logging
logging.basicConfig(level=logging.INFO)

# В логах увидите:
# INFO - OpenRouter клиент инициализирован с моделью: meta-llama/llama-3.1-8b-instruct:free
# INFO - Отправка запроса в OpenRouter с моделью meta-llama/llama-3.1-8b-instruct:free
# INFO - Токены: prompt=45, completion=128, total=173
# INFO - Получен ответ от OpenRouter: 567 символов
```

## 🎯 Рекомендации

1. **Используйте бесплатные модели** для разработки и тестирования
2. **Мониторьте расход токенов** для платных моделей
3. **Настройте обработку ошибок** для production среды
4. **Кэшируйте ответы** для одинаковых запросов
5. **Используйте rate limiting** для ограничения запросов

**OpenRouter готов к использованию!** 🎉

