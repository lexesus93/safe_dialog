import json
import os
import re
import uuid
from typing import Dict, Tuple, List, Optional, Set

from dotenv import load_dotenv

from ollama_api import get_answer as ollama_answer


load_dotenv()

CATALOG_FILE = os.environ.get("SE_CATALOG_FILE", "sensitive_entities.json")

# Регулярное выражение для блоков вида {ID=<id>, TXT='<заменитель>'} или {ID=<id>, TXT="<заменитель>"}
BLOCK_PATTERN = re.compile(r'\{ID=(?P<id>[^,}]+),\s*TXT=["\'](?P<txt>[^"\']*)["\']?\}')

# Дополнительный паттерн для простых блоков вида {ENTITY_NAME_1}
SIMPLE_BLOCK_PATTERN = re.compile(r"\{(?P<entity>[A-Z_][A-Z0-9_]*)\}")

# Паттерн для определения уже замещённых блоков. Поддерживает ID без кавычек или в кавычках,
# а также TXT в одинарных или двойных кавычках: {ID=..., TXT='...'} или {ID="...", TXT="..."}
BLOCK_SPAN_PATTERN = re.compile(
    r"\{\s*ID\s*=\s*(?:'[^']*'|\"[^\"]*\"|[^,}]+)\s*,\s*TXT\s*=\s*(?:'[^']*'|\"[^\"]*\")\s*\}"
)


def _load_catalog() -> Dict[str, Dict[str, str]]:
    if not os.path.exists(CATALOG_FILE):
        return {}
    try:
        with open(CATALOG_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def _save_catalog(catalog: Dict[str, Dict[str, str]]) -> None:
    with open(CATALOG_FILE, "w", encoding="utf-8") as f:
        json.dump(catalog, f, ensure_ascii=False, indent=2)


def _detect_category(value: str) -> str:
    """
    Определяет категорию чувствительных данных для значения value.
    Возможные значения: 'email', 'phone', 'social', 'company', 'product', 'person', 'generic'.
    """
    v = (value or "").strip()
    lower = v.lower()
    # Email
    if re.fullmatch(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", v):
        return "email"
    # Phone (простейшая эвристика: 9-15 цифр, допускаем +, пробелы, скобки, дефисы, точки)
    digits_only = re.sub(r"\D", "", v)
    if 9 <= len(digits_only) <= 15 and re.fullmatch(r"[+\d().\-\s]+", v):
        return "phone"
    # Social links (известные домены соцсетей)
    if re.search(r"\b(?:facebook\.com|fb\.com|instagram\.com|ig\.me|t\.me|telegram\.me|vk\.com|x\.com|twitter\.com|linkedin\.com|ok\.ru|youtube\.com|github\.com)/", lower):
        return "social"
    # Прочие эвристики
    if any(k in lower for k in ["llc", "inc", "ooo", "ооо", "company", "компания"]):
        return "company"
    if any(k in lower for k in ["product", "продукт", "model", "модель"]):
        return "product"
    if any(k in lower for k in ["mr ", "ms ", "mrs ", "д-р", "г-н", "г-жа"]):
        return "person"
    return "generic"


def _generate_placeholder(name: str) -> str:
    category = _detect_category(name)
    if category == "email":
        return "Email"
    if category == "phone":
        return "Телефон"
    if category == "social":
        return "Аккаунт"
    if category == "company":
        return "Компания 1"
    if category == "product":
        return "Продукт А"
    if category == "person":
        return "ПерсонаX"
    return "ПерсонаX"


def _extract_sensitive_patterns(text: str) -> Set[str]:
    """
    Находит email, телефон и ссылки на популярные соцсети в тексте и возвращает множество найденных фрагментов.
    """
    results: Set[str] = set()
    # Email
    for m in re.finditer(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b", text):
        results.add(m.group(0))
    # Phone (9-15 цифр суммарно)
    for m in re.finditer(r"[+\d().\-\s]{9,}", text):
        val = m.group(0)
        digits = re.sub(r"\D", "", val)
        if 9 <= len(digits) <= 15:
            results.add(val)
    # Social links
    for m in re.finditer(r"https?://[^\s]+", text):
        url = m.group(0)
        if re.search(r"\b(?:facebook\.com|fb\.com|instagram\.com|ig\.me|t\.me|telegram\.me|vk\.com|x\.com|twitter\.com|linkedin\.com|ok\.ru|youtube\.com|github\.com)/", url.lower()):
            results.add(url)
    return results


async def is_sensitive_data(text: str) -> Tuple[bool, str]:
    """
    Определяет, относится ли входной текст к чувствительным данным (например, названия компаний,
    продуктов, имена людей, географические названия). При положительном ответе добавляет или
    извлекает запись из каталога и возвращает блок вида "{ID=<id>, TXT='<заменитель>'}".

    :return: (is_proper: bool, block_or_empty: str)
    """
    candidate = text.strip()
    if not candidate:
        return False, ""

    catalog = _load_catalog()
    for ne_id, item in catalog.items():
        if item.get("name") == candidate:
            return True, f"{{ID={ne_id}, TXT='{item.get('placeholder', '')}'}}"

    # Жёсткие категории: телефон/email/соцсети считаем чувствительными без обращения к LLM
    pre_category = _detect_category(candidate)
    if pre_category in {"phone", "email", "social"}:
        new_id = str(uuid.uuid4())
        placeholder = _generate_placeholder(candidate)
        catalog[new_id] = {"name": candidate, "placeholder": placeholder}
        _save_catalog(catalog)
        return True, f"{{ID={new_id}, TXT='{placeholder}'}}"

    system_prompt = (
        "Ты определяешь, являются ли данные чувствительными (компания, продукт, человек, гео, телефон, email, аккаунты/ссылки соцсетей). "
        "Отвечай строго JSON: {\"is_proper\": true|false}."
    )
    answer = await ollama_answer(
        question=f"Фраза: '{candidate}'. Это чувствительные данные? Верни только JSON.",
        system_prompt=system_prompt,
    )

    is_proper = False
    try:
        data = json.loads(answer)
        is_proper = bool(data.get("is_proper", False))
    except Exception:
        is_proper = bool(re.search(r"^[A-ZА-ЯЁ][\w\- .]+$", candidate)) and len(candidate.split()) <= 5

    if not is_proper:
        return False, ""

    new_id = str(uuid.uuid4())
    placeholder = _generate_placeholder(candidate)
    catalog[new_id] = {"name": candidate, "placeholder": placeholder}
    _save_catalog(catalog)
    return True, f"{{ID={new_id}, TXT='{placeholder}'}}"


def add_sensitive_entity(name: str, placeholder: Optional[str] = None) -> str:
    """
    Добавляет чувствительные данные в справочник. Если запись с таким значением уже есть,
    возвращает её ID и при наличии нового placeholder обновляет его.
    """
    clean_name = (name or "").strip()
    if not clean_name:
        raise ValueError("Пустое значение невозможно добавить в справочник")

    catalog = _load_catalog()
    for ne_id, item in catalog.items():
        if item.get("name") == clean_name:
            if placeholder:
                item["placeholder"] = placeholder.strip()
                _save_catalog(catalog)
            return ne_id

    ne_id = str(uuid.uuid4())
    final_placeholder = (placeholder or _generate_placeholder(clean_name)).strip()
    catalog[ne_id] = {"name": clean_name, "placeholder": final_placeholder}
    _save_catalog(catalog)
    return ne_id


def mask_by_catalog(text: str) -> str:
    """
    Заменяет все вхождения известных из каталога чувствительных данных на блоки вида
    {ID=<id>, TXT='<заменитель>'}. Точная замена по исходной форме.
    """
    if not text:
        return text
    catalog = _load_catalog()
    entries = sorted(((item["name"], ne_id, item["placeholder"]) for ne_id, item in catalog.items()), key=lambda x: len(x[0]), reverse=True)
    masked = text
    for name_value, ne_id, placeholder in entries:
        if not name_value:
            continue
        masked = re.sub(re.escape(name_value), f"{{ID={ne_id}, TXT='{placeholder}'}}", masked)
    return masked


async def mask_with_catalog_then_llm(text: str) -> str:
    pre_masked = mask_by_catalog(text)
    return await mask_sensitive_data_in_text(pre_masked)


async def mask_sensitive_data_in_text(text: str) -> str:
    if not text.strip():
        return text

    # 1) Разбиваем вход на сегменты: уже замещённые блоки и обычный текст
    segments: List[Tuple[str, str]] = []  # (type, content) где type in {"block", "plain"}
    last_index = 0
    for m in BLOCK_SPAN_PATTERN.finditer(text):
        start, end = m.start(), m.end()
        if start > last_index:
            segments.append(("plain", text[last_index:start]))
        segments.append(("block", m.group(0)))
        last_index = end
    if last_index < len(text):
        segments.append(("plain", text[last_index:]))

    # 2) Собираем только незамещённые части для поиска кандидатов
    plain_text = "".join(content for typ, content in segments if typ == "plain")
    if not plain_text.strip():
        return text

    # Кандидаты по паттернам (email/phone/social)
    pattern_candidates = _extract_sensitive_patterns(plain_text)

    system_prompt = (
        "Ты выделяешь возможные чувствительные данные (компании, продукты, люди, организации, телефоны, email, аккаунты/ссылки соцсетей) в тексте. "
        "Верни строго JSON массив уникальных точных фрагментов из текста (без изменений регистра), например: [\"Иван Иванов\", \"ООО Ромашка\"]."
    )
    raw = await ollama_answer(
        question=f"Текст:\n{plain_text}\nВыдели чувствительные данные и верни только JSON массив строк.",
        system_prompt=system_prompt,
    )

    candidates: List[str] = []
    try:
        data = json.loads(raw)
        if isinstance(data, list):
            candidates = [str(x) for x in data if isinstance(x, str)]
    except Exception:
        candidates = list({m.group(0) for m in re.finditer(r"[A-ZА-ЯЁ][\w\-]+(?:\s+[A-ZА-ЯЁ][\w\-]+)+", plain_text)})

    # Объединяем кандидатов с шаблонными и сортируем по длине (длинные сначала)
    all_candidates = sorted(set(candidates).union(pattern_candidates), key=len, reverse=True)

    # 3) Выполняем замену только в plain-сегментах, блоки не трогаем
    for cand in all_candidates:
        ok, block = await is_sensitive_data(cand)
        if not (ok and block):
            continue
        pattern = re.escape(cand)
        updated_segments: List[Tuple[str, str]] = []
        for typ, content in segments:
            if typ == "plain" and content:
                content = re.sub(pattern, block, content)
            updated_segments.append((typ, content))
        segments = updated_segments

    # 4) Склеиваем сегменты обратно
    return "".join(content for _, content in segments)


async def call_openrouter_with_masked_text(masked_text: str, system_prompt: str) -> str:
    from openrouter_api import get_answer as openrouter_answer
    return await openrouter_answer(masked_text, system_prompt)


def demask_text(text_with_blocks: str) -> str:
    if not text_with_blocks:
        return text_with_blocks

    catalog = _load_catalog()

    def _replace_detailed(match: re.Match) -> str:
        ne_id = match.group("id")
        item = catalog.get(ne_id)
        if not item:
            return match.group(0)
        return item.get("name", match.group(0))

    def _replace_simple(match: re.Match) -> str:
        entity_name = match.group("entity")
        # Ищем в каталоге по placeholder'у или имени
        for entity_id, item in catalog.items():
            if (item.get("placeholder", "").upper().replace(" ", "_") == entity_name or
                item.get("name", "").upper().replace(" ", "_") == entity_name):
                return item.get("name", match.group(0))
        return match.group(0)

    # Сначала обрабатываем детальные блоки {ID=..., TXT="..."}
    result = BLOCK_PATTERN.sub(_replace_detailed, text_with_blocks)
    
    # Затем обрабатываем простые блоки {ENTITY_NAME_1}
    result = SIMPLE_BLOCK_PATTERN.sub(_replace_simple, result)
    
    return result


def replace_blocks_with_placeholder(text: str) -> str:
    """
    Возвращает строку, где каждый блок {ID=..., TXT='...'} заменён только на значение TXT (placeholder).
    Используется для пользовательского отображения маскированного текста без служебной части блока.
    """
    return BLOCK_PATTERN.sub(lambda m: m.group('txt'), text)


