import urllib.request
import urllib.parse
import json
import ssl
import os
import cv2
import time

ctx = ssl._create_unverified_context()
headers = {'User-Agent': 'VivacityFoodCourtAudit/2.0 (food-audit-bot@vivacity.local)'}

out_dir = os.path.abspath('public/assets/menu/verified')
os.makedirs(out_dir, exist_ok=True)

search_targets = {
    # Pizzas
    'pizza-tandoori': 'tandoori chicken pizza',
    'pizza-mexican-hot': 'spicy jalapeño pizza',
    'pizza-barcelona': 'corn chicken pizza',
    'pizza-bbq': 'bbq chicken pizza',
    'pizza-sausage': 'sausage pizza',
    'pizza-beef-lovers': 'ground beef pizza',
    'pizza-four-seasons': 'quattro stagioni pizza',
    'pizza-seafood': 'seafood pizza',
    'pizza-supreme': 'supreme pizza loaded',

    # Drinks - Coolers & Juices
    'drink-fresh-lemonade': 'glass of fresh lemonade ice',
    'drink-ginger-lemonade': 'ginger lemonade glass',
    'drink-coconut-water': 'coconut water in glass',
    'drink-mint-lemonade': 'mint lemonade glass',
    'drink-pineapple-cooler': 'pineapple cooler glass',
    'drink-citrus-cooler': 'citrus cooler orange glass',
    'drink-lime-cooler': 'lime cooler with ice',
    'drink-mint-mojito': 'mint mojito glass ice',
    'drink-dragon-fruit': 'dragon fruit smoothie glass',
    'drink-orange-juice': 'fresh orange juice glass',
    'drink-watermelon-juice': 'fresh watermelon juice glass',
    'drink-pineapple-juice': 'fresh pineapple juice glass',
    'drink-papaya-juice': 'fresh papaya juice glass',

    # Drinks - Shakes
    'drink-chocolate-shake': 'chocolate milkshake glass',
    'drink-strawberry-shake': 'strawberry milkshake glass',
    'drink-vanilla-shake': 'vanilla milkshake glass',
    'drink-mango-shake': 'mango milkshake glass',
    'drink-banana-shake': 'banana milkshake glass',
    'drink-papaya-shake': 'papaya smoothie glass',
    'drink-coconut-shake': 'coconut smoothie glass',
    'drink-oreo-shake': 'oreo milkshake glass',

    # Drinks - Specials & Coffee
    'drink-dry-fruit-shake': 'dry fruit milkshake badam',
    'drink-blue-lagoon': 'blue lagoon mocktail glass',
    'drink-watermelon-mojito': 'watermelon mojito cocktail',
    'drink-green-mango': 'aam panna glass',
    'drink-cold-coffee': 'iced coffee glass',
    'drink-chocolate-coffee': 'iced mocha glass',
    'drink-kitkat-coffee': 'kitkat shake glass',
    'drink-frappe': 'frappe whipped cream glass',
    'drink-espresso': 'espresso cup crema',

    # Top Town - Drinks & Indian
    'drink-sweet-lassi': 'sweet lassi glass',
    'drink-salted-lassi': 'salted chaas buttermilk',
    'drink-jeera-pani': 'jaljeera glass',
    'toptown-plain-dosa': 'plain dosa chutney',
    'toptown-masala-dosa': 'masala dosa sambar',
    'toptown-butter-dosa': 'butter masala dosa',
    'toptown-cheese-dosa': 'cheese dosa',
    'toptown-chicken-biryani': 'chicken dum biryani egg',
    'toptown-mutton-biryani': 'mutton dum biryani',
    'toptown-papri-chaat': 'papri chaat plate',
    'toptown-raj-kachori': 'raj kachori chaat',
    'toptown-chola-bhatora': 'chole bhature plate',
    'toptown-naan-plain': 'plain naan bread',
    'toptown-naan-butter': 'butter naan bread',
    'toptown-naan-garlic': 'garlic naan coriander',

    # Momo Buzz
    'momo-steamed-chicken': 'steamed momo dumplings',
    'momo-mushroom': 'steamed mushroom dumplings momos',
    'momo-naga-spicy': 'spicy chili momos',
    'momo-fried-cheese': 'fried momos plate',
    'momo-chilli-oil': 'momos in chili oil',
    'momo-bbq': 'pan fried momos',
    'momo-cola-combo': 'momo dumplings coke',

    # Live Station - Kababs & BBQ
    'live-tandoori-chicken': 'tandoori chicken leg',
    'live-bbq-chicken': 'bbq grilled chicken drumstick',
    'live-chicken-chap': 'chicken chaap mughlai',
    'live-boti-kabab': 'chicken boti kabab skewer',
    'live-reshmi-kabab': 'chicken reshmi kabab',
    'live-malai-kabab': 'chicken malai kabab',
    'live-hariyali-kabab': 'chicken hariyali kabab',
    'live-afghani-kabab': 'chicken afghani kabab',
    'live-seekh-kabab': 'beef seekh kabab skewers',
    'live-beef-boti': 'beef boti kabab',
    'live-mixed-grill-board': 'mixed grill platter barbecue',
}

def crop_and_save(src_bytes, out_path, size=600):
    import numpy as np
    nparr = np.frombuffer(src_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        return False
    h, w, _ = img.shape
    side = min(h, w)
    sx = (w - side) // 2
    sy = (h - side) // 2
    crop = img[sy:sy+side, sx:sx+side]
    resized = cv2.resize(crop, (size, size), interpolation=cv2.INTER_AREA)
    cv2.imwrite(out_path, resized, [int(cv2.IMWRITE_JPEG_QUALITY), 88])
    return True

print(f"Starting fetch for {len(search_targets)} items...")

for slug, query in search_targets.items():
    dest = os.path.join(out_dir, f"{slug}.jpg")
    if os.path.exists(dest) and os.path.getsize(dest) > 5000:
        print(f"Already exists: {slug}")
        continue

    encoded_q = urllib.parse.quote(query)
    api_url = f"https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch={encoded_q}&gsrnamespace=6&gsrlimit=3&prop=imageinfo&iiprop=url&iiurlwidth=800&format=json"

    success = False
    try:
        req = urllib.request.Request(api_url, headers=headers)
        with urllib.request.urlopen(req, context=ctx, timeout=15) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            pages = data.get('query', {}).get('pages', {})
            for page_id, page_data in pages.items():
                imageinfo = page_data.get('imageinfo', [])
                if imageinfo and 'thumburl' in imageinfo[0]:
                    thumb_url = imageinfo[0]['thumburl']
                    img_req = urllib.request.Request(thumb_url, headers=headers)
                    with urllib.request.urlopen(img_req, context=ctx, timeout=20) as img_resp:
                        img_bytes = img_resp.read()
                        if crop_and_save(img_bytes, dest):
                            print(f"Fetched & cropped: {slug}")
                            success = True
                            break
    except Exception as e:
        print(f"Search error for {slug}: {e}")

    if not success:
        print(f"Could not fetch {slug} from wiki")
    time.sleep(0.3)

print("Batch fetch finished.")
