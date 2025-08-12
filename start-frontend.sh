#!/bin/bash

# Скрипт для запуска полного стека Safe Dialog (API + React Frontend)

echo "🚀 Запуск Safe Dialog Frontend Stack..."

# Проверяем наличие необходимых файлов
if [ ! -f "package.json" ]; then
    echo "❌ package.json не найден. Убедитесь, что вы находитесь в корневой директории проекта."
    exit 1
fi

if [ ! -f "api_server.py" ]; then
    echo "❌ api_server.py не найден. Создайте API сервер."
    exit 1
fi

# Проверяем наличие Python зависимостей
echo "📦 Проверка Python зависимостей..."
if ! python -c "import fastapi, uvicorn" 2>/dev/null; then
    echo "⚠️  Устанавливаем Python зависимости..."
    pip install -r requirements-frontend.txt
fi

# Проверяем наличие Node.js зависимостей
echo "📦 Проверка Node.js зависимостей..."
if [ ! -d "node_modules" ]; then
    echo "⚠️  Устанавливаем Node.js зависимости..."
    npm install
fi

# Создаем .env файл если его нет
if [ ! -f ".env" ]; then
    echo "⚙️  Создание .env файла..."
    cat > .env << EOF
# API Configuration
VITE_API_BASE_URL=http://localhost:8000/api

# App Configuration
VITE_APP_TITLE="Safe Dialog"
VITE_APP_DESCRIPTION="Маскирование чувствительных данных"
EOF
fi

# Функция для завершения процессов
cleanup() {
    echo ""
    echo "🛑 Завершение процессов..."
    kill $API_PID $FRONTEND_PID 2>/dev/null
    exit 0
}

# Обработчик сигналов
trap cleanup SIGINT SIGTERM

# Запускаем API сервер
echo "🐍 Запуск API сервера на порту 8000..."
python api_server.py &
API_PID=$!

# Ждем запуска API
sleep 3

# Запускаем React приложение
echo "⚛️  Запуск React приложения на порту 3000..."
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Safe Dialog запущен!"
echo "📱 Frontend: http://localhost:3000"
echo "🔌 API: http://localhost:8000"
echo "📚 API Docs: http://localhost:8000/docs"
echo ""
echo "Нажмите Ctrl+C для остановки..."

# Ждем завершения
wait
