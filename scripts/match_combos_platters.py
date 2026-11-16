import os
from PIL import Image
import numpy as np

def match_folder(menu_prefix, asset_dir):
    menu_dir = "public/assets/menu"
    menu_files = [f for f in os.listdir(menu_dir) if f.startswith(menu_prefix)]
    asset_files = [f for f in os.listdir(asset_dir) if f.endswith(".png")]
    
    asset_imgs = {}
    for af in asset_files:
        img = Image.open(os.path.join(asset_dir, af))
        bg = Image.new("RGB", img.size, (255, 255, 255))
        if img.mode == 'RGBA':
            bg.paste(img, mask=img.split()[3])
        else:
            bg.paste(img)
        bg = bg.resize((100, 100))
        asset_imgs[af] = np.array(bg, dtype=np.float32)
        
    print(f"\n--- Matching {menu_prefix} to {asset_dir} ---")
    for mf in menu_files:
        mimg = Image.open(os.path.join(menu_dir, mf)).convert("RGB").resize((100, 100))
        m_arr = np.array(mimg, dtype=np.float32)
        
        diffs = []
        for af, a_arr in asset_imgs.items():
            d = np.mean(np.abs(m_arr - a_arr))
            diffs.append((d, af))
        diffs.sort()
        print(f"{mf}:")
        for d, af in diffs[:2]:
            print(f"   {af} (diff: {d:.2f})")

match_folder("fusion-combo", "public/assets/fusion Cafe/Combo")
match_folder("fusion-platter", "public/assets/fusion Cafe/Premium Mix Platter")
match_folder("fusion-seafood", "public/assets/fusion Cafe/Seafood Platter and Premium")
