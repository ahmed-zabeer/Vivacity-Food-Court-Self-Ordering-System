import asyncio
import os
import sys
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
    return result.text

async def main():
    path = sys.argv[1] if len(sys.argv) > 1 else "public/assets/Vivacity All Menu/Bargaer bar 1@4x.png"
    text = await ocr_image(path)
    print("=== OCR RESULT ===")
    print(text)

if __name__ == "__main__":
    asyncio.run(main())
