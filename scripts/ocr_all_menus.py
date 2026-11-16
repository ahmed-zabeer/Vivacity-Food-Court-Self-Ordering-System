import asyncio
import os
import json
import winrt.windows.graphics.imaging as imaging
import winrt.windows.media.ocr as ocr
import winrt.windows.storage as storage

async def ocr_image(image_path):
    abs_path = os.path.abspath(image_path)
    file = await storage.StorageFile.get_file_from_path_async(abs_path)
    stream = await file.open_async(storage.FileAccessMode.READ)
    decoder = await imaging.BitmapDecoder.create_async(stream)
    bitmap = await decoder.get_software_bitmap_async()
    engine = ocr.OcrEngine.try_create_from_user_profile_languages()
    result = await engine.recognize_async(bitmap)
    
    lines_data = []
    for line in result.lines:
        words = []
        for word in line.words:
            rect = word.bounding_rect
            words.append({
                "text": word.text,
                "x": rect.x, "y": rect.y,
                "width": rect.width, "height": rect.height
            })
        lines_data.append({
            "text": line.text,
            "words": words
        })
    return {
        "full_text": result.text,
        "lines": lines_data
    }

async def main():
    menu_dir = "public/assets/Vivacity All Menu"
    files = sorted([f for f in os.listdir(menu_dir) if f.lower().endswith(('.png', '.jpg', '.jpeg'))])
    all_results = {}
    print(f"Starting OCR for {len(files)} files in {menu_dir}...")
    for f in files:
        p = os.path.join(menu_dir, f)
        print(f"Processing: {f}")
        try:
            res = await ocr_image(p)
            all_results[f] = res
        except Exception as e:
            print(f"Error on {f}: {e}")
            all_results[f] = {"error": str(e)}
            
    with open("scripts/vivacity_all_menu_ocr.json", "w", encoding="utf-8") as out:
        json.dump(all_results, out, indent=2, ensure_ascii=False)
    print("Done! Saved to scripts/vivacity_all_menu_ocr.json")

if __name__ == "__main__":
    asyncio.run(main())
