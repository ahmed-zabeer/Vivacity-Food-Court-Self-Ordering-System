import cv2
import numpy as np
from PIL import Image

# Load original tight logo
im = cv2.imread('scripts/tight_logo.png', cv2.IMREAD_UNCHANGED)
h, w = im.shape[:2]
b, g, r, a = cv2.split(im)

lum = (0.299 * r.astype(np.float32) + 0.587 * g.astype(np.float32) + 0.114 * b.astype(np.float32)).astype(np.uint8)

# The letters are located between y=595 and y=705, from x=80 to x=1125
# Let's verify what pixels are in this area
box_mask = np.zeros((h, w), dtype=bool)
box_mask[595:705, 80:1125] = True

# We want to replace black letters with pure white letters (#ffffff)
# The letters are pure black (#000000 or near 0) with anti-aliased gray borders
# Note: Any red or green pixels (from chili tip or frame) will have high R or G
# Black text has r < 80, g < 80, b < 80 and a > 30.
dark_text = (r < 80) & (g < 80) & (b < 80) & (a > 30) & box_mask

# For antialiasing:
# If a pixel is black, set RGB to 255, 255, 255 and keep alpha.
# If a pixel is dark gray (antialiased edge), its darkness corresponds to the letter coverage:
# In the original, the letter is black on transparent:
# Pixel color was (0, 0, 0, alpha).
# So ALL we need to change is setting R=255, G=255, B=255 for the letter pixels!
# The alpha channel already contains the exact antialiasing!

out = im.copy()
# Wherever dark_text is True, set RGB to 255
out_b, out_g, out_r, out_a = cv2.split(out)
out_b[dark_text] = 255
out_g[dark_text] = 255
out_r[dark_text] = 255

result = cv2.merge([out_b, out_g, out_r, out_a])
cv2.imwrite('scripts/logo_white_clean.png', result)
print(f"Processed logo saved to scripts/logo_white_clean.png. Total letter pixels modified: {np.sum(dark_text)}")

# Now create a preview on #08090b dark background to inspect visually
logo_pil = Image.open('scripts/logo_white_clean.png')
bg_pil = Image.new('RGBA', logo_pil.size, (8, 9, 11, 255))
comp = Image.alpha_composite(bg_pil, logo_pil)
comp.save('scripts/logo_white_on_dark_preview.png')
print("Preview on dark background saved to scripts/logo_white_on_dark_preview.png")
