import os
import json
from PIL import Image
import requests
import re

# Путь к директории с флагами
FLAGS_DIR = os.path.join(os.path.dirname(__file__), 'temp/assets')
# Путь для сохранения спрайта и json
ASSETS_DIR = os.path.join(os.path.dirname(__file__), '..', 'assets')
os.makedirs(ASSETS_DIR, exist_ok=True)
SPRITE_PATH = os.path.join(ASSETS_DIR, 'flags.png')
JSON_PATH = os.path.join(ASSETS_DIR, 'flags.json')

# Коды языков для перевода
LANGS = ['ru', 'en', 'es', 'cn', 'fr']

# Кэш переводов
TRANSLATIONS = {}

# Получение переводов с restcountries.com
RESTCOUNTRIES_URL = 'https://restcountries.com/v3.1/all?fields=name,translations'

def normalize_name(name):
    # Lowercase, replace spaces/underscores, remove non-alphanum
    return re.sub(r'[^a-z0-9]', '', name.lower().replace('_', '').replace(' ', ''))

def fetch_translations():
    print('Загружаю данные стран с restcountries.com...')
    headers = {'Accept': 'application/json'}
    resp = requests.get(RESTCOUNTRIES_URL, timeout=30, headers=headers)
    if resp.status_code != 200:
        print(f"Ошибка загрузки данных: {resp.status_code} {resp.text}")
        raise Exception(f"restcountries.com error: {resp.status_code}")
    data = resp.json()
    for country in data:
        names = {}
        en = country.get('name', {}).get('common')
        if not en:
            continue
        names['en'] = en
        ru = country.get('translations', {}).get('rus', {}).get('common')
        if ru:
            names['ru'] = ru
        es = country.get('translations', {}).get('spa', {}).get('common')
        if es:
            names['es'] = es
        cn = country.get('translations', {}).get('zho', {}).get('common')
        if cn:
            names['cn'] = cn
        fr = country.get('translations', {}).get('fra', {}).get('common')
        if fr:
            names['fr'] = fr
        # Индексируем по всем вариантам названия
        variants = [en]
        if 'official' in country.get('name', {}):
            variants.append(country['name']['official'])
        variants += country.get('altSpellings', [])
        for key in variants:
            if key:
                TRANSLATIONS[normalize_name(key)] = names
    print(f'Загружено переводов: {len(TRANSLATIONS)}')

def get_translations(country_name):
    key = normalize_name(country_name)
    if key in TRANSLATIONS:
        names = TRANSLATIONS[key]
        return {lang: names.get(lang, names.get('en', country_name)) for lang in LANGS}
    return {lang: country_name for lang in LANGS}

def main():
    fetch_translations()
    flag_files = [f for f in os.listdir(FLAGS_DIR) if f.lower().endswith(('.png', '.jpg', '.jpeg', '.webp'))]
    flag_files.sort()  # Для стабильного порядка
    images = []
    names = []
    for fname in flag_files:
        path = os.path.join(FLAGS_DIR, fname)
        try:
            img = Image.open(path).convert('RGBA')
            images.append(img)
            name = os.path.splitext(fname)[0]
            names.append(name)
        except Exception as e:
            print(f"Ошибка при обработке {fname}: {e}")

    if not images:
        print("Нет изображений для обработки.")
        return

    # Все флаги будут размещены вертикально друг под другом
    width = max(img.width for img in images)
    total_height = sum(img.height for img in images)
    sprite = Image.new('RGBA', (width, total_height), (255, 255, 255, 0))

    config = []
    y_offset = 0
    for img, name in zip(images, names):
        sprite.paste(img, (0, y_offset))
        entry = {
            'img': {
                'top': y_offset,
                'bottom': y_offset + img.height,
                'left': 0,
                'right': img.width
            },
            'name': get_translations(name)
        }
        config.append(entry)
        y_offset += img.height

    sprite.save(SPRITE_PATH)
    print(f"Сохранен спрайт: {SPRITE_PATH}")
    with open(JSON_PATH, 'w', encoding='utf-8') as f:
        json.dump(config, f, ensure_ascii=False, indent=2)
    print(f"Сохранен конфиг: {JSON_PATH}")

if __name__ == '__main__':
    main() 