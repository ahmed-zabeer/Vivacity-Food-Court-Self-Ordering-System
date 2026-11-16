import os
import cv2
import json
import re

# Destination menu directory
menu_out = os.path.abspath('public/assets/menu')
os.makedirs(menu_out, exist_ok=True)

def crop_square(src_path, dst_filename, size=600):
    src = os.path.abspath(src_path)
    dst = os.path.join(menu_out, dst_filename)
    if not os.path.exists(src):
        raise FileNotFoundError(f"Missing source file: {src}")
    img = cv2.imread(src)
    if img is None:
        raise ValueError(f"Could not read image: {src}")
    h, w, _ = img.shape
    side = min(h, w)
    sx = (w - side) // 2
    sy = (h - side) // 2
    crop = img[sy:sy+side, sx:sx+side]
    resized = cv2.resize(crop, (size, size), interpolation=cv2.INTER_AREA)
    cv2.imwrite(dst, resized, [int(cv2.IMWRITE_JPEG_QUALITY), 85])
    print(f"Rendered: {dst_filename}")

# Sources to prepare into public/assets/menu/
assets_to_render = {
    # Waffles
    'waffle-nutella.jpg': 'tmp-candidates/wiki/chocwaffle-1.jpg',
    'waffle-banana.jpg': 'tmp-candidates/wiki/oreowaffle-1.jpg',
    'waffle-red-velvet.jpg': 'tmp-candidates/wiki/waffle-1.jpg',
    'waffle-chocolate-nuts.jpg': 'tmp-candidates/wiki/chocwaffle-2.jpg',
    'waffle-cream-chocolate.jpg': 'tmp-candidates/wiki/chocwaffle-3.jpg',
    'waffle-chocolate-loaded.jpg': 'tmp-candidates/waffle-2.jpg',
    'waffle-tutti-frutti.jpg': 'tmp-candidates/waffle-7.jpg',
    'waffle-strawberry.jpg': 'tmp-candidates/waffle-1.jpg',
    'waffle-blueberry.jpg': 'tmp-candidates/waffle-9.jpg',
    'waffle-icecream.jpg': 'tmp-candidates/waffle-14.jpg',
    'waffle-kitkat.jpg': 'tmp-candidates/wiki/belgianwaffle-2.jpg',
    'waffle-dark.jpg': 'tmp-candidates/wiki/oreowaffle-2.jpg',
    'waffle-plain.jpg': 'tmp-candidates/wiki/belgianwaffle-1.jpg',

    # Addons
    'addon-ice-cream.jpg': 'tmp-candidates/waffle-14.jpg',
    'addon-whipped-cream.jpg': 'tmp-candidates/wiki/cream-3.jpg',
    'addon-choc-chips.jpg': 'tmp-candidates/wiki/chocchips-3.jpg',
    'addon-nuts.jpg': 'tmp-candidates/wiki/nuts-3.jpg',
    'addon-cream-cheese.jpg': 'tmp-candidates/wiki/creamcheese-3.jpg',
    'addon-nutella.jpg': 'tmp-candidates/wiki/nutella-2.jpg',

    # Momo
    'momo-steamed-basket.jpg': 'tmp-candidates/momo-1.jpg',
    'momo-plate.jpg': 'tmp-candidates/momo-2.jpg',
    'momo-bowl.jpg': 'tmp-candidates/momo-3.jpg',
    'momo-assorted.jpg': 'tmp-candidates/momo-4.jpg',
    'momo-chilli-oil.jpg': 'tmp-candidates/momo-8.jpg',
    'momo-cola.jpg': 'tmp-candidates/momo-7.jpg',
    'momo-fuchka.jpg': 'tmp-candidates/wiki/panipuri-1.jpg',
    'momo-doi-fuchka.jpg': 'tmp-candidates/wiki/panipuri-2.jpg',
    'momo-fuchka-special.jpg': 'tmp-candidates/wiki/panipuri-3.jpg',
    'momo-chotpoti.jpg': 'tmp-candidates/wiki/chotpoti-2.jpg',

    # Live Station
    'live-tandoori-chicken.jpg': 'tmp-candidates/live-1.jpg',
    'live-grilled-chicken.jpg': 'tmp-candidates/live-9.jpg',
    'live-chicken-chap.jpg': 'tmp-candidates/live-2.jpg',
    'live-kebab-skewers.jpg': 'tmp-candidates/live-3.jpg',
    'live-wings.jpg': 'tmp-candidates/live-8.jpg',
    'live-ribs.jpg': 'tmp-candidates/live-2.jpg',
    'live-luchi.jpg': 'tmp-candidates/wiki/luchi-1.jpg',
    'live-mixed-grill.jpg': 'tmp-candidates/live-1.jpg',
    'live-steak-board.jpg': 'tmp-candidates/live-4.jpg',
    'live-naan.jpg': 'tmp-candidates/wiki/naan-1.jpg',

    # Pizzas
    'fusion-pizza-tandoori.jpg': 'tmp-candidates/wiki/pizza-1.jpg',
    'fusion-pizza-mexican-hot.jpg': 'tmp-candidates/wiki/pizza-2.jpg',
    'fusion-pizza-barcelona.jpg': 'tmp-candidates/wiki/pizza-3.jpg',
    'fusion-pizza-chick-bbq.jpg': 'tmp-candidates/wiki/pizza-4.jpg',
    'fusion-pizza-sausage-carnival.jpg': 'tmp-candidates/wiki/pizza-1.jpg',
    'fusion-pizza-beef-lovers.jpg': 'tmp-candidates/wiki/pizza-2.jpg',
    'fusion-pizza-margherita.jpg': 'tmp-candidates/wiki/pizza-3.jpg',
    'fusion-pizza-four-season.jpg': 'tmp-candidates/wiki/pizza-4.jpg',
    'fusion-pizza-pepperoni.jpg': 'tmp-candidates/wiki/pizza-1.jpg',
    'fusion-pizza-seafood.jpg': 'tmp-candidates/wiki/pizza-2.jpg',
    'fusion-pizza-special.jpg': 'tmp-candidates/wiki/pizza-3.jpg',

    # Drinks
    'drinks-boba-milk-tea.jpg': 'tmp-candidates/boba-1.jpg',
    'drinks-boba-chocolate.jpg': 'tmp-candidates/boba-2.jpg',
    'drinks-smoothie-fruit.jpg': 'tmp-candidates/boba-3.jpg',
    'drinks-lemonade.jpg': 'tmp-candidates/wiki/lemonade-1.jpg',
    'drinks-lemon-mint.jpg': 'tmp-candidates/wiki/lemonade-2.jpg',
    'drinks-orange-cooler.jpg': 'tmp-candidates/wiki/lemonade-3.jpg',
    'drinks-mojito.jpg': 'tmp-candidates/wiki/mojito-4.jpg',
    'drinks-blue-lagoon.jpg': 'tmp-candidates/wiki/mojito-4.jpg',
    'drinks-shake-chocolate.jpg': 'tmp-candidates/wiki/milkshake-2.jpg',
    'drinks-shake-strawberry.jpg': 'tmp-candidates/wiki/milkshake-3.jpg',
    'drinks-shake-vanilla.jpg': 'tmp-candidates/wiki/milkshake-4.jpg',
    'drinks-shake-oreo.jpg': 'tmp-candidates/wiki/milkshake-2.jpg',
    'drinks-cold-coffee.jpg': 'tmp-candidates/wiki/coffee-1.jpg',
    'drinks-hot-coffee.jpg': 'tmp-candidates/wiki/coffee-2.jpg',
    'drinks-special-coffee.jpg': 'tmp-candidates/wiki/coffee-4.jpg',
    'drinks-lassi.jpg': 'tmp-candidates/wiki/lassi-1.jpg',

    # Top Town items
    'toptown-dosa.jpg': 'tmp-candidates/wiki/dosa-1.jpg',
    'toptown-biryani.jpg': 'tmp-candidates/wiki/biryani-1.jpg',
    'toptown-chola-bhatora.jpg': 'tmp-candidates/wiki/cholebhature-1.jpg',
    'toptown-luchi.jpg': 'tmp-candidates/wiki/luchi-1.jpg',
}

for dst, src in assets_to_render.items():
    crop_square(src, dst)

print("All extra menu assets successfully rendered into public/assets/menu/")
