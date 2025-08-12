"""
OpenRouter API integration module
Реальная интеграция с OpenRouter через OpenAI совместимый API
"""

import os
import logging
from typing import Optional
from openai import AsyncOpenAI
from dotenv import load_dotenv

# Загружаем переменные окружения
load_dotenv()

# Настройка логирования
logger = logging.getLogger(__name__)

# Конфигурация OpenRouter
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "meta-llama/llama-3.1-8b-instruct:free")
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"

# Проверяем наличие API ключа
if not OPENROUTER_API_KEY:
    logger.warning("OPENROUTER_API_KEY не найден в переменных окружения")

class OpenRouterClient:
    """Клиент для работы с OpenRouter API"""
    
    def __init__(self):
        self.client = None
        self.model = OPENROUTER_MODEL
        self._initialize_client()
    
    def _initialize_client(self):
        """Инициализация клиента OpenRouter"""
        if not OPENROUTER_API_KEY:
            logger.error("OpenRouter API key не настроен")
            return
        
        try:
            self.client = AsyncOpenAI(
                api_key=OPENROUTER_API_KEY,
                base_url=OPENROUTER_BASE_URL,
                default_headers={
                    "HTTP-Referer": "http://localhost:8000",  # Указываем referer для OpenRouter
                    "X-Title": "Safe Dialog App",  # Название приложения
                }
            )
            logger.info(f"OpenRouter клиент инициализирован с моделью: {self.model}")
        except Exception as e:
            logger.error(f"Ошибка инициализации OpenRouter клиента: {e}")
            self.client = None
    
    async def get_completion(self, message: str, system_prompt: Optional[str] = None) -> str:
        """
        Получить ответ от OpenRouter
        
        Args:
            message: Сообщение пользователя
            system_prompt: Системный промпт (опционально)
            
        Returns:
            Ответ от модели
        """
        if not self.client:
            logger.error("OpenRouter клиент не инициализирован")
            return "[ОШИБКА] OpenRouter клиент недоступен. Проверьте OPENROUTER_API_KEY."
        
        try:
            # Подготавливаем сообщения
            messages = []
            
            if system_prompt:
                messages.append({
                    "role": "system",
                    "content": system_prompt
                })
            
            messages.append({
                "role": "user", 
                "content": message
            })
            
            logger.info(f"Отправка запроса в OpenRouter с моделью {self.model}")
            logger.debug(f"Сообщения: {len(messages)} шт.")
            
            # Отправляем запрос
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                max_tokens=4000,
                temperature=0.7,
                top_p=0.9,
                frequency_penalty=0.0,
                presence_penalty=0.0,
            )
            
            # Извлекаем ответ
            if response.choices and len(response.choices) > 0:
                answer = response.choices[0].message.content.strip()
                
                # Логируем статистику
                if hasattr(response, 'usage') and response.usage:
                    logger.info(f"Токены: prompt={response.usage.prompt_tokens}, "
                              f"completion={response.usage.completion_tokens}, "
                              f"total={response.usage.total_tokens}")
                
                logger.info(f"Получен ответ от OpenRouter: {len(answer)} символов")
                return answer
            else:
                logger.error("Пустой ответ от OpenRouter")
                return "[ОШИБКА] Получен пустой ответ от OpenRouter"
                
        except Exception as e:
            logger.error(f"Ошибка при запросе к OpenRouter: {str(e)}")
            return f"[ОШИБКА] Ошибка при обращении к OpenRouter: {str(e)}"

# Глобальный экземпляр клиента
_openrouter_client = OpenRouterClient()

async def get_answer(question: str, system_prompt: Optional[str] = None) -> str:
    """
    Основная функция для получения ответа от OpenRouter
    
    Args:
        question: Вопрос/сообщение для обработки
        system_prompt: Системный промпт (опционально)
        
    Returns:
        Ответ от OpenRouter
        
    Example:
        >>> import asyncio
        >>> async def main():
        ...     response = await get_answer(
        ...         "Привет! Как дела?", 
        ...         "Ты helpful assistant. Отвечай кратко и по делу."
        ...     )
        ...     print(response)
        >>> asyncio.run(main())
    """
    return await _openrouter_client.get_completion(question, system_prompt)

async def test_openrouter():
    """
    Тестовая функция для проверки работы OpenRouter API
    """
    print("🤖 Тестирование OpenRouter API...")
    print(f"📋 Модель: {OPENROUTER_MODEL}")
    print(f"🔑 API ключ: {'✅ Настроен' if OPENROUTER_API_KEY else '❌ Отсутствует'}")
    print()
    
    if not OPENROUTER_API_KEY:
        print("❌ Для работы нужно настроить OPENROUTER_API_KEY в переменных окружения")
        return
    
    # Тестовый запрос
    test_message = "Привет! Объясни кратко, что такое машинное обучение."
    test_system_prompt = "Ты helpful assistant. Отвечай кратко и понятно."
    
    print(f"📤 Отправляем тестовый запрос...")
    print(f"   Сообщение: {test_message}")
    print(f"   Системный промпт: {test_system_prompt}")
    print()
    
    try:
        response = await get_answer(test_message, test_system_prompt)
        print(f"📥 Ответ от OpenRouter:")
        print(f"   {response}")
        print()
        print("✅ Тест успешен!")
        
    except Exception as e:
        print(f"❌ Ошибка теста: {e}")

if __name__ == "__main__":
    import asyncio
    asyncio.run(test_openrouter())