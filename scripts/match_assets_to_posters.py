import os
import json
import cv2
import numpy as np
from PIL import Image

def find_asset_on_poster(poster_path, asset_path):
    # Load poster and asset in grayscale
    poster_pil = Image.open(poster_path).convert('RGB')
    asset_pil = Image.open(asset_path)
    
    # Extract alpha mask if available to only match non-transparent regions
    has_alpha = (asset_pil.mode == 'RGBA')
    
    poster_cv = cv2.cvtColor(np.array(poster_pil), cv2.COLOR_RGB2GRAY)
    asset_np = np.array(asset_pil)
    
    if has_alpha:
        alpha = asset_np[:, :, 3]
        asset_gray = cv2.cvtColor(asset_np[:, :, :3], cv2.COLOR_RGB2GRAY)
        # Apply mask
        mask = (alpha > 50).astype(np.uint8) * 255
    else:
        asset_gray = cv2.cvtColor(asset_np, cv2.COLOR_RGB2GRAY)
        mask = None

    # Check if scales match or need pyramid
    # Since both are @4x exports from the same Illustrator project, they are often identical scale!
    h_a, w_a = asset_gray.shape[:2]
    h_p, w_p = poster_cv.shape[:2]
    
    if w_a > w_p or h_a > h_p:
        return None

    # Try 1.0 scale
    try:
        if mask is not None:
            res = cv2.matchTemplate(poster_cv, asset_gray, cv2.TM_CCORR_NORMED, mask=mask)
        else:
            res = cv2.matchTemplate(poster_cv, asset_gray, cv2.TM_CCOEFF_NORMED)
        min_val, max_val, min_loc, max_loc = cv2.minMaxLoc(res)
        
        # If good correlation
        if max_val > 0.8:
            return {
                "x": max_loc[0],
                "y": max_loc[1],
                "width": w_a,
                "height": h_a,
                "score": float(max_val),
                "scale": 1.0
            }
    except Exception as e:
        pass
        
    # If not found at 1.0, try downscaled/upscaled slightly (0.5 to 1.5)
    for scale in [0.25, 0.5, 0.75, 1.25, 1.5, 2.0]:
        nw, nh = int(w_a * scale), int(h_a * scale)
        if nw > w_p or nh > h_p or nw < 20 or nh < 20:
            continue
        asset_res = cv2.resize(asset_gray, (nw, nh))
        mask_res = cv2.resize(mask, (nw, nh)) if mask is not None else None
        try:
            if mask_res is not None:
                res = cv2.matchTemplate(poster_cv, asset_res, cv2.TM_CCORR_NORMED, mask=mask_res)
            else:
                res = cv2.matchTemplate(poster_cv, asset_res, cv2.TM_CCOEFF_NORMED)
            _, max_val, _, max_loc = cv2.minMaxLoc(res)
            if max_val > 0.85:
                return {
                    "x": max_loc[0],
                    "y": max_loc[1],
                    "width": nw,
                    "height": nh,
                    "score": float(max_val),
                    "scale": scale
                }
        except Exception:
            pass

    return None

def test_burger_bar():
    b1 = "public/assets/Vivacity All Menu/Bargaer bar 1@4x.png"
    b2 = "public/assets/Vivacity All Menu/Barger Bar 2@4x.png"
    asset_dir = "public/assets/Barger Bar"
    
    for f in sorted(os.listdir(asset_dir)):
        ap = os.path.join(asset_dir, f)
        res1 = find_asset_on_poster(b1, ap)
        if res1 and res1["score"] > 0.75:
            print(f"{f} -> Bargaer bar 1 at ({res1['x']}, {res1['y']}) score={res1['score']:.3f} scale={res1['scale']}")
        else:
            res2 = find_asset_on_poster(b2, ap)
            if res2 and res2["score"] > 0.75:
                print(f"{f} -> Barger Bar 2 at ({res2['x']}, {res2['y']}) score={res2['score']:.3f} scale={res2['scale']}")
            else:
                print(f"{f} -> NOT FOUND (res1: {res1['score'] if res1 else 0}, res2: {res2['score'] if res2 else 0})")

if __name__ == "__main__":
    test_burger_bar()
