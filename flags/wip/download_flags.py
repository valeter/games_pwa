import os
import re
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin

# Directory to save flags
ASSETS_DIR = os.path.join(os.path.dirname(__file__), 'temp', 'assets')
os.makedirs(ASSETS_DIR, exist_ok=True)

# URL with all flags
BASE_URL = 'https://theflags.org/country-flags-of-the-world/'

# User-Agent for polite scraping
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (compatible; FlagsQuizBot/1.0)'
}

def sanitize_filename(name: str) -> str:
    """Sanitize country name for filename."""
    name = name.strip().replace(' ', '_')
    name = re.sub(r'[^a-zA-Z0-9_\-]', '', name)
    return name

def download_flags():
    resp = requests.get(BASE_URL, headers=HEADERS)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, 'html.parser')

    # Find all flag entries
    # The site structure may change; adjust selectors if needed
    flag_entries = soup.find_all('img', alt=re.compile(r'Flag$'))
    print(f"Found {len(flag_entries)} flag images.")

    for img in flag_entries:
        country = img.get('alt', '').replace(' Flag', '').strip()
        img_url = img.get('src')
        if not country or not img_url:
            continue
        img_url = urljoin(BASE_URL, img_url)
        filename = sanitize_filename(country) + os.path.splitext(img_url)[-1]
        filepath = os.path.join(ASSETS_DIR, filename)
        try:
            img_data = requests.get(img_url, headers=HEADERS, timeout=10)
            img_data.raise_for_status()
            with open(filepath, 'wb') as f:
                f.write(img_data.content)
            print(f"Saved: {filename}")
        except Exception as e:
            print(f"Failed to download {country}: {e}")

if __name__ == '__main__':
    download_flags() 