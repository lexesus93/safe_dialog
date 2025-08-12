# Safe Dialog - Веб-приложение для маскирования чувствительных данных

Современное веб-приложение для безопасной обработки текста с использованием AI.

## Особенности

- 🔒 **Маскирование данных** - автоматическое выявление и замаскирование чувствительной информации
- 🤖 **AI интеграция** - поддержка OpenRouter и Ollama для обработки текста
- 🎨 **Современный UI** - React + TypeScript + Tailwind CSS
- 📱 **Адаптивный дизайн** - работает на всех устройствах
- 🚀 **Пошаговый workflow** - интуитивный процесс обработки

## Технологии

### Frontend
- React 18 + TypeScript
- Vite + Tailwind CSS
- React Query для управления состоянием
- React Hook Form для форм

### Backend
- FastAPI (Python)
- OpenRouter API интеграция
- Ollama для локальной обработки

## Быстрый старт

### 1. Клонирование и установка

```bash
git clone <repository-url>
cd safe_dialog
```

### 2. Backend

```bash
# Создать виртуальное окружение
python -m venv .venv
source .venv/bin/activate  # Linux/macOS
# или
.venv\Scripts\activate     # Windows

# Установить зависимости
pip install -r requirements.txt

# Настроить переменные окружения
cp .env.example .env
# Отредактировать .env файл

# Запустить API сервер
python api_server.py
```

### 3. Frontend

```bash
# Установить зависимости
npm install

# Запустить в режиме разработки
npm run dev
```

### 4. Открыть приложение

- Frontend: http://localhost:3000
- API: http://localhost:8000
- Документация API: http://localhost:8000/docs

## Структура проекта

```
safe_dialog/
├── src/                    # React приложение
│   ├── components/         # React компоненты
│   ├── hooks/             # React хуки
│   ├── lib/               # Утилиты и API
│   └── types/             # TypeScript типы
├── api_server.py          # FastAPI сервер
├── sensitive_entities.py  # Логика маскирования
├── openrouter_api.py      # OpenRouter интеграция
├── ollama_api.py          # Ollama интеграция
├── requirements.txt       # Python зависимости
├── package.json           # Node.js зависимости
└── README.md             # Документация
```

## API Endpoints

- `GET /api/health` - проверка состояния сервера
- `POST /api/mask-text` - маскирование текста
- `POST /api/process-openrouter` - обработка через OpenRouter
- `POST /api/demask-text` - демаскирование текста
- `GET /api/system-prompt` - получение системного промпта
- `PUT /api/system-prompt` - обновление системного промпта

## Переменные окружения

Создайте файл `.env` на основе `.env.example`:

```env
OPENROUTER_API_KEY=your_key_here
OPENROUTER_MODEL=meta-llama/llama-3.1-8b-instruct:free
```

## Разработка

### Команды

```bash
# Frontend
npm run dev          # Запуск в режиме разработки
npm run build        # Сборка для продакшена
npm run lint         # Проверка кода
npm run test         # Запуск тестов

# Backend
python api_server.py # Запуск API сервера
```

## Docker

```bash
# Сборка и запуск
docker-compose up -d

# Остановка
docker-compose down
```

## Лицензия

MIT License
