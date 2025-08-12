#!/usr/bin/env python3
"""
FastAPI сервер для интеграции с React frontend
Предоставляет REST API для Safe Dialog приложения
"""

import asyncio
import json
import os
from datetime import datetime
from typing import Dict, List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, validator
import uvicorn

# Импорты из существующего кода
from sensitive_entities import (
    mask_with_catalog_then_llm,
    demask_text,
    add_sensitive_entity,
    _load_catalog,
)
from openrouter_api import get_answer as openrouter_get_answer

app = FastAPI(
    title="Safe Dialog API",
    description="API для маскирования чувствительных данных",
    version="1.0.0"
)

# CORS настройки для React приложения
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic модели для API
class TextMaskingRequest(BaseModel):
    text: str
    system_prompt: Optional[str] = None

    @validator('text')
    def text_must_not_be_empty(cls, v):
        if not v.strip():
            raise ValueError('Текст не может быть пустым')
        return v

class TextMaskingResponse(BaseModel):
    masked_text: str
    entities_found: List[Dict]
    processing_time: Optional[float] = None

class TextProcessingRequest(BaseModel):
    text: str
    system_prompt: Optional[str] = None
    
    # Поддержка camelCase для совместимости с frontend
    @validator('system_prompt', pre=True, always=True)
    def convert_system_prompt(cls, v, values):
        # Если system_prompt не указан, но есть в values под другим именем
        if v is None and hasattr(cls, '_camel_case_data'):
            return cls._camel_case_data.get('systemPrompt')
        return v
    
    class Config:
        # Разрешаем дополнительные поля для совместимости
        extra = "allow"
        
    def __init__(self, **data):
        # Сохраняем оригинальные данные для конвертации
        if 'systemPrompt' in data and 'system_prompt' not in data:
            data['system_prompt'] = data['systemPrompt']
        super().__init__(**data)

class SensitiveEntityCreate(BaseModel):
    name: str
    placeholder: str

    @validator('name')
    def name_must_not_be_empty(cls, v):
        if not v.strip():
            raise ValueError('Название не может быть пустым')
        return v.strip()

    @validator('placeholder')
    def placeholder_must_not_be_empty(cls, v):
        if not v.strip():
            raise ValueError('Заменитель не может быть пустым')
        return v.strip()

class SensitiveEntityResponse(BaseModel):
    id: str
    name: str
    placeholder: str

class SystemPromptRequest(BaseModel):
    prompt: str

class HealthResponse(BaseModel):
    status: str
    timestamp: str
    version: str

# Утилиты
def load_system_prompt() -> str:
    """Загружает системный промпт из файла"""
    try:
        with open('DefaultSystemPrompt.txt', 'r', encoding='utf-8') as f:
            content = f.read().strip()
            if content:
                return content
    except (FileNotFoundError, IOError):
        pass
    return 'Ты — вежливый и дружелюбный ассистент. Приводи чётко структурированный ответ.'

def save_system_prompt(prompt: str) -> None:
    """Сохраняет системный промпт в файл"""
    with open('DefaultSystemPrompt.txt', 'w', encoding='utf-8') as f:
        f.write(prompt)

# API endpoints
@app.get("/api/health", response_model=HealthResponse)
async def health_check():
    """Проверка состояния API"""
    return HealthResponse(
        status="healthy",
        timestamp=datetime.now().isoformat(),
        version="1.0.0"
    )

@app.post("/api/mask-text", response_model=TextMaskingResponse)
async def mask_text(request: TextMaskingRequest):
    """Маскирование чувствительных данных в тексте"""
    try:
        import time
        import logging
        
        start_time = time.time()
        text_length = len(request.text)
        
        logging.info(f"Начало маскирования текста длиной {text_length} символов")
        
        masked_text = await mask_with_catalog_then_llm(request.text)
        
        processing_time = time.time() - start_time
        logging.info(f"Маскирование завершено за {processing_time:.2f} секунд")
        
        # Получаем информацию о найденных сущностях
        catalog = _load_catalog()
        entities_found = [
            {"id": entity_id, "name": entity["name"], "placeholder": entity["placeholder"]}
            for entity_id, entity in catalog.items()
        ]
        
        return TextMaskingResponse(
            masked_text=masked_text,
            entities_found=entities_found,
            processing_time=processing_time
        )
    except Exception as e:
        import traceback
        logging.error(f"Ошибка маскирования: {str(e)}")
        logging.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Ошибка маскирования: {str(e)}")

@app.post("/api/demask-text")
async def demask_text_endpoint(request: dict):
    """Де-маскирование текста"""
    try:
        masked_text = request.get('maskedText', '')
        if not masked_text:
            raise HTTPException(status_code=400, detail="Пустой текст для де-маскирования")
        
        demasked = demask_text(masked_text)
        return demasked  # Возвращаем строку напрямую
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка де-маскирования: {str(e)}")

@app.post("/api/process-openrouter")
async def process_with_openrouter(request: TextProcessingRequest):
    """Обработка текста через OpenRouter"""
    try:
        import time
        import logging
        
        start_time = time.time()
        text_length = len(request.text)
        
        logging.info(f"Начало обработки через OpenRouter, текст длиной {text_length} символов")
        
        result = await openrouter_get_answer(request.text, request.system_prompt)
        
        processing_time = time.time() - start_time
        logging.info(f"Обработка OpenRouter завершена за {processing_time:.2f} секунд")
        
        return result  # Возвращаем строку напрямую
    except Exception as e:
        import traceback
        logging.error(f"Ошибка обработки через OpenRouter: {str(e)}")
        logging.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Ошибка обработки через OpenRouter: {str(e)}")

@app.get("/api/sensitive-entities", response_model=List[SensitiveEntityResponse])
async def get_sensitive_entities():
    """Получение списка чувствительных данных"""
    try:
        catalog = _load_catalog()
        entities = [
            SensitiveEntityResponse(
                id=entity_id,
                name=entity["name"],
                placeholder=entity["placeholder"]
            )
            for entity_id, entity in catalog.items()
        ]
        return entities
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка загрузки справочника: {str(e)}")

@app.post("/api/sensitive-entities", response_model=SensitiveEntityResponse)
async def create_sensitive_entity(entity: SensitiveEntityCreate):
    """Создание новой записи в справочнике"""
    try:
        entity_id = add_sensitive_entity(entity.name, entity.placeholder)
        return SensitiveEntityResponse(
            id=entity_id,
            name=entity.name,
            placeholder=entity.placeholder
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка добавления в справочник: {str(e)}")

@app.put("/api/sensitive-entities/{entity_id}", response_model=SensitiveEntityResponse)
async def update_sensitive_entity(entity_id: str, entity: SensitiveEntityCreate):
    """Обновление записи в справочнике"""
    try:
        catalog = _load_catalog()
        if entity_id not in catalog:
            raise HTTPException(status_code=404, detail="Запись не найдена")
        
        # Обновляем запись
        catalog[entity_id] = {
            "name": entity.name,
            "placeholder": entity.placeholder
        }
        
        # Сохраняем каталог
        from sensitive_entities import _save_catalog
        _save_catalog(catalog)
        
        return SensitiveEntityResponse(
            id=entity_id,
            name=entity.name,
            placeholder=entity.placeholder
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка обновления записи: {str(e)}")

@app.delete("/api/sensitive-entities/{entity_id}")
async def delete_sensitive_entity(entity_id: str):
    """Удаление записи из справочника"""
    try:
        catalog = _load_catalog()
        if entity_id not in catalog:
            raise HTTPException(status_code=404, detail="Запись не найдена")
        
        del catalog[entity_id]
        
        # Сохраняем каталог
        from sensitive_entities import _save_catalog
        _save_catalog(catalog)
        
        return {"message": "Запись удалена"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка удаления записи: {str(e)}")

@app.get("/api/system-prompt")
async def get_system_prompt():
    """Получение системного промпта"""
    try:
        prompt = load_system_prompt()
        return {"data": prompt}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка загрузки системного промпта: {str(e)}")

@app.put("/api/system-prompt")
async def update_system_prompt(request: SystemPromptRequest):
    """Обновление системного промпта"""
    try:
        save_system_prompt(request.prompt)
        return {"data": request.prompt}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка сохранения системного промпта: {str(e)}")

# Error handlers
@app.exception_handler(404)
async def not_found_handler(request, exc):
    return JSONResponse(
        status_code=404,
        content={"success": False, "error": "Endpoint not found"}
    )

@app.exception_handler(500)
async def internal_error_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"success": False, "error": "Internal server error"}
    )

if __name__ == "__main__":
    uvicorn.run(
        "api_server:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
