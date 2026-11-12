#!/usr/bin/env python3
"""Real Chromium smoke for 2D short-video editor: data, voice, WebM export, mobile UI."""
import math
import shutil
import struct
import subprocess
import tempfile
import time
import urllib.error
import urllib.request
import wave
import zlib
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

URL = "http://127.0.0.1:4177"

def wait_for_server(server):
    for _ in range(90):
        if server.poll() is not None:
            raise RuntimeError("Vite server exited before startup")
        try:
            with urllib.request.urlopen(URL, timeout=1) as response:
                if response.status == 200:
                    return
        except (urllib.error.URLError, TimeoutError):
            pass
        time.sleep(1)
    raise RuntimeError("Vite server startup timeout")

def make_fixture(path):
    rate = 16000
    seconds = 2.0
    with wave.open(str(path), "wb") as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(rate)
        pcm = bytearray()
        for i in range(int(rate * seconds)):
            amplitude = int(4500 * math.sin(2 * math.pi * 230 * i / rate))
            pcm.extend(struct.pack("<h", amplitude))
        output.writeframes(bytes(pcm))

def make_rgba_png(path, width=64, height=96, transparent=False):
    """A real PNG fixture with no dependency beyond Python stdlib."""
    def chunk(kind, body):
        return struct.pack(">I", len(body)) + kind + body + struct.pack(">I", zlib.crc32(kind + body))
    rows = bytearray()
    for y in range(height):
        rows.append(0)
        for x in range(width):
            active = not transparent or (28 <= x <= 38 and 25 <= y <= 38)
            rows.extend((244, 176, 111, 255 if active else 0))
    data = (b"\x89PNG\r\n\x1a\n" +
            chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)) +
            chunk(b"IDAT", zlib.compress(bytes(rows), level=9)) +
            chunk(b"IEND", b""))
    path.write_bytes(data)

def main():
    out = Path("artifacts/social-review")
    out.mkdir(parents=True, exist_ok=True)
    server = subprocess.Popen(["bun", "run", "dev", "--host", "127.0.0.1", "--port", "4177"],
                              stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT)
    try:
        wait_for_server(server)
        with tempfile.TemporaryDirectory() as temp, sync_playwright() as playwright:
            fixture = Path(temp) / "narration.wav"
            make_fixture(fixture)
            portrait = Path(temp) / "layered-portrait.png"
            mouth = Path(temp) / "layered-mouth.png"
            make_rgba_png(portrait)
            make_rgba_png(mouth, transparent=True)
            browser = playwright.chromium.launch(headless=True, args=["--no-sandbox"])
            page = browser.new_page(viewport={"width": 1400, "height": 900}, accept_downloads=True)
            errors = []
            page.on("pageerror", lambda error: errors.append(str(error)))
            page.goto(URL, wait_until="networkidle", timeout=60000)
            expect(page.get_by_role("heading", name="من الفكرة إلى فيديو بشخصية كرتونية")).to_be_visible(timeout=30000)
            page.get_by_label("عنوان المشروع").fill("فيديو تجربة 2D")
            page.get_by_role("button", name="مشهد جديد").click()
            expect(page.get_by_text("4 مشاهد", exact=False)).to_be_visible()
            # Keep one 2-second scene so CI validates an actual, quick WebM.
            for _ in range(3):
                page.get_by_role("button", name="حذف المشهد").last.click()
            expect(page.get_by_text("1 مشاهد", exact=False)).to_be_visible()
            page.get_by_label("مدة المشهد").select_option("2")
            page.get_by_label("النص الظاهر على الفيديو").fill("محتوى كرتوني صوتي واضح")
            page.get_by_role("button", name="الشخصيات", exact=True).click()
            page.get_by_role("button", name="عمر مدرس بنظارة").click()
            page.get_by_role("button", name="الصوت", exact=True).click()
            page.locator('input[type="file"][accept^="audio/"]').set_input_files(str(fixture))
            expect(page.get_by_text("narration.wav")).to_be_visible(timeout=12000)
            page.get_by_role("button", name="التصدير", exact=True).click()
            with page.expect_download() as json_download:
                page.get_by_role("button", name="نسخة JSON").click()
            assert json_download.value.suggested_filename == "cartoon-project.json"
            page.screenshot(path=str(out / "desktop-editor.png"), full_page=False)
            page.get_by_role("button", name="تصدير فيديو WebM بالصوت").click()
            expect(page.get_by_text("الفيديو جاهز للمعاينة والتحميل")).to_be_visible(timeout=30000)
            with page.expect_download() as webm_download:
                page.get_by_role("button", name="تنزيل الفيديو").click()
            webm = webm_download.value.path()
            assert webm is not None and webm.stat().st_size > 4096, "Expected nonempty WebM movie"
            if shutil.which("ffprobe"):
                probe = subprocess.run(["ffprobe", "-v", "error", "-show_entries",
                                        "stream=codec_type", "-of", "csv=p=0", str(webm)],
                                       check=True, capture_output=True, text=True)
                streams = probe.stdout.splitlines()
                assert "video" in streams, f"No video stream: {streams}"
                assert "audio" in streams, f"No muxed narration: {streams}"
            # Reload verifies local project AND audio persistence.
            page.reload(wait_until="networkidle")
            expect(page.get_by_label("عنوان المشروع")).to_have_value("فيديو تجربة 2D")
            page.get_by_role("button", name="الصوت", exact=True).click()
            expect(page.get_by_text("تعليق صوتي محفوظ")).to_be_visible(timeout=15000)
            # Real per-scene audio export: no external service, no fallback to global narration.
            page.get_by_role("radio", name="صوت مستقل لكل مشهد").click()
            page.locator('input[type="file"][accept^="audio/"]').set_input_files(str(fixture))
            expect(page.get_by_text("التعليق الصوتي للمشهد 1", exact=False)).to_be_visible(timeout=12000)
            page.get_by_label("تأخير بداية الصوت").select_option("250")
            page.get_by_role("button", name="الشخصيات", exact=True).click()
            expect(page.locator('canvas[aria-label^="رسم شخصية"]')).to_have_count(4)
            page.screenshot(path=str(out / "character-rigs.png"), full_page=False)
            # Review all four full-size figures, not just tiny selection thumbnails.
            for label, slug in [
                ("سامي مقدم شاب", "sami"),
                ("ليلى شخصية محجبة", "layla"),
                ("عمر مدرس بنظارة", "omar"),
                ("نور روبوت لطيف", "nour"),
            ]:
                page.get_by_role("button", name=label).click()
                page.wait_for_timeout(170)
                page.screenshot(path=str(out / ("portrait-" + slug + ".png")), full_page=False)
            page.get_by_role("button", name="سامي مقدم شاب").click()
            expect(page.get_by_text("الشخصية لها رسم مصور", exact=False)).to_be_visible(timeout=15000)
            expect(page.get_by_text("المفاصل جاهزة للتحريك", exact=False)).to_be_visible(timeout=20000)
            expect(page.get_by_text("الشفاه قابلة للتحريك",exact=False)).to_be_visible()
            page.screenshot(path=str(out / "sami-master-illustrated-art.png"), full_page=False)
            # A single-owner master should have genuine independent joint layers.
            page.get_by_role("button",name="المفاصل",exact=True).click()
            expect(page.get_by_text("طبقات الحركة مكتملة")).to_be_visible()
            page.get_by_role("button",name="ترحيب باليد").click()
            page.screenshot(path=str(out / "sami-master-joint-pose.png"), full_page=False)
            page.get_by_role("button",name="الشخصيات",exact=True).click()
            page.get_by_role("button", name="ليلى شخصية محجبة").click()
            page.get_by_label("رفع الرسم الأساسي المتكامل").set_input_files(str(portrait))
            expect(page.get_by_text("الشخصية لها رسم مصور", exact=False)).to_be_visible(timeout=12000)
            page.get_by_label("رفع طبقة الفم المغلق").set_input_files(str(mouth))
            page.get_by_label("رفع طبقة الفم المفتوح").set_input_files(str(mouth))
            expect(page.get_by_text("الشفاه قابلة للتحريك", exact=False)).to_be_visible(timeout=12000)
            page.screenshot(path=str(out / "custom-layered-illustration.png"), full_page=False)
            # Load a genuine 8-layer transparent art fixture. This activates the
            # skeletal compositor and ensures all joints can be transformed.
            page.get_by_text("طبقات المفاصل — الرأس والجذع والذراعان").click()
            for arabic in [
                "الجذع والملابس (شفاف)", "الرأس والشعر (شفاف)",
                "العضد الأيسر", "الساعد الأيسر", "اليد اليسرى",
                "العضد الأيمن", "الساعد الأيمن", "اليد اليمنى",
            ]:
                page.get_by_label("رفع " + arabic).set_input_files(str(mouth))
                expect(page.get_by_text("تم حفظ طبقة التعبير",exact=False)).to_be_visible(timeout=12000)
            expect(page.get_by_text("المفاصل جاهزة للتحريك",exact=False)).to_be_visible()
            page.get_by_role("button",name="فتح محرر المفاصل").click()
            expect(page.get_by_text("محرر العظام والمفاصل 2D")).to_be_visible()
            expect(page.get_by_role("slider",name="الكتف الأيمن")).to_be_visible()
            page.get_by_role("button",name="أول المشهد").click()
            page.get_by_role("button",name="وضع طبيعي").click()
            page.get_by_role("button",name="آخر المشهد").click()
            page.get_by_role("button",name="ترحيب باليد").click()
            expect(page.get_by_text("عدد إطارات الحركة المحفوظة: 2",exact=False)).to_be_visible()
            page.screenshot(path=str(out / "articulated-joint-editor.png"), full_page=False)
            # The per-scene animation survives JSON export, reload, and re-import.
            page.get_by_role("button",name="التصدير",exact=True).click()
            with page.expect_download() as rig_json:
                page.get_by_role("button",name="نسخة JSON").click()
            import json
            rig_path=rig_json.value.path()
            assert rig_path is not None
            saved=json.loads(rig_path.read_text())
            assert len(saved["scenes"][0]["rig"]["keyframes"])==2, "Expected 2 animation keyframes"
            assert saved["scenes"][0]["rig"]["keyframes"][1]["pose"]["head"]==6
            page.reload(wait_until="networkidle")
            page.get_by_role("button", name="الشخصيات", exact=True).click()
            expect(page.get_by_text("الشفاه قابلة للتحريك", exact=False)).to_be_visible(timeout=16000)
            expect(page.get_by_text("المفاصل جاهزة للتحريك",exact=False)).to_be_visible()
            page.get_by_role("button",name="المفاصل",exact=True).click()
            expect(page.get_by_text("عدد إطارات الحركة المحفوظة: 2",exact=False)).to_be_visible()
            page.get_by_role("button",name="الشخصيات",exact=True).click()
            page.get_by_role("button", name="عمر مدرس بنظارة").click()
            page.get_by_label("تعبير الوجه").select_option("curious")
            page.get_by_role("button", name="التصدير", exact=True).click()
            page.get_by_label("أسلوب ظهور الكلمات").select_option("reveal")
            page.get_by_label("دقة التصدير").select_option("high")
            page.get_by_role("button", name="تصدير فيديو WebM بالصوت").click()
            expect(page.get_by_text("الفيديو جاهز للمعاينة والتحميل")).to_be_visible(timeout=35000)
            with page.expect_download() as hd_download:
                page.get_by_role("button", name="تنزيل الفيديو").click()
            hd = hd_download.value.path()
            assert hd is not None and hd.stat().st_size > 4096, "HD scene-voice output is empty"
            if shutil.which("ffprobe"):
                probe = subprocess.run(["ffprobe","-v","error","-show_entries",
                                       "stream=codec_type,width,height","-of","json",str(hd)],
                                       check=True,capture_output=True,text=True)
                import json
                streams = json.loads(probe.stdout)["streams"]
                assert any(s.get("codec_type")=="audio" for s in streams), "No scene voice track"
                assert any(s.get("width")==1080 and s.get("height")==1920 for s in streams), "Not full HD"
            page.reload(wait_until="networkidle")
            page.get_by_role("button", name="الصوت", exact=True).click()
            expect(page.get_by_role("radio", name="صوت مستقل لكل مشهد")).to_have_attribute("aria-checked","true")
            expect(page.get_by_text("التعليق الصوتي للمشهد 1", exact=False)).to_be_visible(timeout=15000)
            mobile = browser.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=2)
            mobile.goto(URL, wait_until="networkidle")
            expect(mobile.get_by_role("heading", name="من الفكرة إلى فيديو بشخصية كرتونية")).to_be_visible()
            mobile.screenshot(path=str(out / "mobile-editor.png"), full_page=True)
            width = mobile.evaluate("document.documentElement.scrollWidth - window.innerWidth")
            assert width <= 4, f"Mobile layout spills horizontally by {width}px"
            assert not errors, "Browser JS errors: " + "; ".join(errors)
            browser.close()
    finally:
        server.terminate()
        try: server.wait(timeout=10)
        except subprocess.TimeoutExpired:
            server.kill()
            server.wait()

if __name__ == "__main__":
    main()
