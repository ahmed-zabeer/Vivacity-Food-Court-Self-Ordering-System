import os
from PIL import Image
import numpy as np

def match_images(source_folder, target_folder):
    source_files = [f for f in os.listdir(source_folder) if f.endswith(('.jpg', '.png'))]
    target_files = [f for f in os.listdir(target_folder) if f.endswith(('.jpg', '.png'))]
    
    # Resize and compare histograms / normalized diff
    target_imgs = {}
    for tf in target_files:
        timg = Image.open(os.path.join(target_folder, tf)).convert('RGB').resize((100, 100))
        target_imgs[tf] = np.array(timg, dtype=np.float32)
        
    for sf in source_files:
        simg = Image.open(os.path.join(source_folder, sf)).convert('RGB').resize((100, 100))
        s_arr = np.array(simg, dtype=np.float32)
        
        best_match = None
        best_diff = float('inf')
        for tf, t_arr in target_imgs.items():
            diff = np.mean(np.abs(s_arr - t_arr))
            if diff < best_diff:
                best_diff = diff
                best_match = tf
        print(f"{sf}  ->  {best_match} (diff: {best_diff:.2f})")

match_images("public/assets/menu", "public/assets/fusion Cafe/Steaks")
