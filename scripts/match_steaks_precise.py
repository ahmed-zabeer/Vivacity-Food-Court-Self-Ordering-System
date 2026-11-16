import os
from PIL import Image
import numpy as np

def match_steaks():
    steaks_dir = "public/assets/fusion Cafe/Steaks"
    menu_dir = "public/assets/menu"
    
    steak_menu_files = [f for f in os.listdir(menu_dir) if "steak" in f]
    asset_files = [f for f in os.listdir(steaks_dir) if f.endswith(".png")]
    
    asset_imgs = {}
    for af in asset_files:
        img = Image.open(os.path.join(steaks_dir, af))
        # composite over white
        bg = Image.new("RGB", img.size, (255, 255, 255))
        if img.mode == 'RGBA':
            bg.paste(img, mask=img.split()[3])
        else:
            bg.paste(img)
        bg = bg.resize((100, 100))
        asset_imgs[af] = np.array(bg, dtype=np.float32)
        
    for sf in steak_menu_files:
        simg = Image.open(os.path.join(menu_dir, sf)).convert("RGB").resize((100, 100))
        s_arr = np.array(simg, dtype=np.float32)
        
        diffs = []
        for af, a_arr in asset_imgs.items():
            d = np.mean(np.abs(s_arr - a_arr))
            diffs.append((d, af))
        diffs.sort()
        print(f"{sf}:")
        for d, af in diffs[:3]:
            print(f"   {af} (diff: {d:.2f})")

match_steaks()
