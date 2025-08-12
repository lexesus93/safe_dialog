# Этап 1: Сборка зависимостей
# Используем официальный образ Python 3.11 на основе slim-варианта Debian
FROM python:3.11-slim as builder

# Устанавливаем необходимые системные зависимости для сборки Python-пакетов
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Создаем и активируем виртуальное окружение
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Устанавливаем зависимости Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Этап 2: Создание финального образа
FROM python:3.11-slim

# Копируем виртуальное окружение из builder
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Создаем непривилегированного пользователя
RUN useradd -m -u 1000 botuser

# Создаем и настраиваем рабочую директорию
WORKDIR /app

# Копируем только необходимые файлы
COPY bot.py /app/
COPY provider_router.py /app/
COPY gigachat_api.py /app/
COPY yandexgpt_api.py /app/
COPY proxy_api.py /app/
COPY ollama_api.py /app/
COPY DefaultSystemPrompt.txt /app/
COPY db_workflow/ /app/db_workflow/

# Устанавливаем правильные разрешения
RUN chown -R botuser:botuser /app

# Создаем том для хранения базы данных
VOLUME ["/app/db_workflow"]

# Переключаемся на непривилегированного пользователя
USER botuser

# Определяем необходимые переменные окружения
ENV TELEGRAM_BOT_TOKEN=""
ENV CODE_SYSTEM_PROMPT="Ты — эксперт по программированию, объясняй подробно, приводи примеры кода."
ENV COOK_SYSTEM_PROMPT="Ты — профессиональный кулинар, даёшь советы по готовке и рецептам."
ENV APP_VERSION="2.0"
ENV APP_ENV="production"

# Добавляем метаданные к образу
LABEL maintainer="Your Name <your.email@example.com>"
LABEL version="2.0"
LABEL description="Telegram bot with multiple AI providers support"

# Проверяем работоспособность приложения
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import requests; requests.get('https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe')" || exit 1

# Запускаем бота
CMD ["python", "bot.py"] 