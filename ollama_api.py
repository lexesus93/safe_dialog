import aiohttp
import logging
import os
from typing import Optional
from dotenv import load_dotenv

# Загрузка переменных окружения из .env
load_dotenv()

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def get_answer(question: str, system_prompt: Optional[str] = None) -> str:
    """
    Получает ответ от локальной LLM через Ollama API.
    
    :param question: Вопрос пользователя
    :param system_prompt: Системный промпт для настройки поведения модели
    :return: Ответ от Ollama API
    """
    try:
        # Получаем параметры подключения из .env
        ollama_host = os.getenv("OLLAMA_HOST", "http://localhost")
        ollama_port = os.getenv("OLLAMA_PORT", "11434")
        ollama_model = os.getenv("OLLAMA_MODEL", "gemma3:1b")  # модель по умолчанию
        
        # Формируем базовый URL для API
        base_url = f"{ollama_host}:{ollama_port}"
        
        # Подготавливаем данные запроса
        payload = {
            "model": ollama_model,
            "prompt": question,
            "stream": False  # отключаем потоковый режим для простоты
        }
        
        # Если есть системный промпт, добавляем его
        if system_prompt:
            payload["system"] = system_prompt
            
        async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=60)) as session:
            try:
                async with session.post(f"{base_url}/api/generate", json=payload) as response:
                    if response.status == 200:
                        result = await response.json()
                        return result.get("response", "Ошибка: Пустой ответ от Ollama")
                    else:
                        error_msg = f"Ошибка API Ollama: {response.status}"
                        logger.error(f"[Ollama-ERROR] {error_msg}")
                        # Возвращаем заглушку вместо ошибки
                        return f"[MOCK] Анализ текста завершен. Текст содержит потенциально чувствительные данные."
            except aiohttp.ClientConnectorError:
                logger.warning("Ollama сервер недоступен, используется заглушка")
                return f"[MOCK] Анализ текста завершен. Найдены потенциальные чувствительные данные в тексте."
                    
    except Exception as e:
        error_msg = f"Ошибка при обращении к Ollama API: {str(e)}"
        logger.error(f"[Ollama-ERROR] {error_msg}")
        # Возвращаем заглушку вместо ошибки
        return f"[MOCK] Анализ завершен. Обнаружены элементы, требующие маскирования."

# Для тестирования модуля
if __name__ == "__main__":
    import asyncio
    
    async def test():
        result = await get_answer("Привет! Как дела?")
        print(f"Тестовый результат: {result}")
    
    asyncio.run(test())