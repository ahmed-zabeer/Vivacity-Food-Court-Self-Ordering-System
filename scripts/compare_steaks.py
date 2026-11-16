import os
from PIL import Image
import numpy as np

steaks_dir = "public/assets/fusion Cafe/Steaks"
menu_dir = "public/assets/menu"

print("--- Fusion Cafe Steaks ---")
for f in sorted(os.listdir(steaks_dir)):
    p = os.path.join(steaks_dir, f)
    img = Image.open(p)
    print(f"{f}: size={img.size}, mode={img.mode}")

print("\n--- Menu Steaks ---")
for f in sorted(os.listdir(menu_dir)):
    if "steak" in f:
        p = os.path.join(menu_dir, f)
        img = Image.open(p)
        print(f"{f}: size={img.size}, mode={img.mode}")
