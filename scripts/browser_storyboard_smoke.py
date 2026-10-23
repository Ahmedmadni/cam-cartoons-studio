#!/usr/bin/env python3
"""Standalone Chromium smoke for multi-scene story editing and autosave.

Uses only local UI + IndexedDB: no remote GLB, TTS or networking dependency.
"""
import subprocess
import math
import struct
import wave
import time
import urllib.error
import urllib.request
from playwright.sync_api import sync_playwright, expect

URL = "http://127.0.0.1:4175"

def wait_for_ready(server):
    for _ in range(75):
        if server.poll() is not None:
            raise RuntimeError("Story UI dev server exited early")
        try:
            with urllib.request.urlopen(URL, timeout=1) as response:
                if response.status == 200:
                    return
        except (urllib.error.URLError, TimeoutError):
            pass
        time.sleep(1)
    raise RuntimeError("Storyboard dev server startup timed out")

def main():
    server = subprocess.Popen(
        ["bun", "run", "dev", "--host", "127.0.0.1", "--port", "4175"],
        stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT,
    )
    try:
        wait_for_ready(server)
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True, args=["--no-sandbox"])
            context = browser.new_context(viewport={"width": 1360, "height": 900}, accept_downloads=True)
            page = context.new_page()
            runtime_errors = []
            page.on("pageerror", lambda error: runtime_errors.append(str(error)))
            page.on("console", lambda message: runtime_errors.append("console: " + message.text) if message.type == "error" else None)
            page.goto(URL + "/projects", wait_until="networkidle", timeout=60000)
            expect(page.get_by_role("heading", name="استوديو مشاريعي")).to_be_visible()
            # Wait for hydration and IndexedDB load: SSR button clicks before handlers mount are lost.
            expect(page.get_by_text("ابدأ بإنشاء مشروعك الأول.")).to_be_visible(timeout=15000)
            page.get_by_role("button", name="مشروع جديد").click()
            try:
                expect(page.get_by_label("عنوان القصة")).to_be_visible(timeout=12000)
            except Exception:
                print("PROJECT CREATION PAGE:", page.locator("body").inner_text()[:5000], flush=True)
                print("PROJECT CREATION JS ERRORS:", runtime_errors, flush=True)
                raise
            page.get_by_role("button", name="+ مشهد", exact=True).click()
            expect(page.get_by_label("اسم المشهد")).to_be_visible()
            page.get_by_label("اسم المشهد").fill("الافتتاحية")
            page.get_by_label("المدة (ثوان)").fill("3")
            expect(page.get_by_role("region", name="معاينة القصة الزمنية")).to_be_visible()
            expect(page.get_by_role("button", name="تشغيل")).to_be_enabled()
            expect(page.get_by_text("تم الحفظ التلقائي", exact=False)).to_be_visible(timeout=8000)
            page.reload(wait_until="networkidle")
            page.get_by_role("button", name="قصة جديدة", exact=True).click()
            expect(page.get_by_label("اسم المشهد")).to_have_value("الافتتاحية")
            # Add a deterministic voice cue via IndexedDB without fetching a remote GLB.
            page.evaluate("""async () => {
                const db = await new Promise((resolve, reject) => {
                    const request = indexedDB.open('cam-story-projects', 1);
                    request.onsuccess = () => resolve(request.result);
                    request.onerror = () => reject(request.error);
                });
                await new Promise((resolve, reject) => {
                    const tx = db.transaction('projects', 'readwrite');
                    const store = tx.objectStore('projects');
                    const req = store.getAll();
                    req.onsuccess = () => {
                        const project = req.result[0];
                        const scene = project.scenes[0];
                        scene.actors = [{id:'actor-smoke',characterId:'not-in-catalog',x:0,scale:1}];
                        scene.cues = [{id:'cue-smoke',actorId:'actor-smoke',kind:'speech',value:'صوت اختبار',atMs:0,durationMs:1800}];
                        store.put(project);
                    };
                    tx.oncomplete = resolve;
                    tx.onerror = () => reject(tx.error);
                });
                db.close();
            }""")
            page.reload(wait_until="networkidle")
            page.get_by_role("button", name="قصة جديدة", exact=True).click()
            expect(page.get_by_label("رفع ملف صوتي للحوار")).to_be_visible()
            voice_path = "artifacts/model-review/voice-smoke.wav"
            with wave.open(voice_path, "wb") as voice:
                voice.setnchannels(1)
                voice.setsampwidth(2)
                voice.setframerate(22050)
                signal = b"".join(struct.pack("<h", int(12000 * math.sin(2 * math.pi * 440 * i / 22050)))
                                  for i in range(22050))
                voice.writeframes(signal)
            page.get_by_label("رفع ملف صوتي للحوار").set_input_files(voice_path)
            expect(page.get_by_label("معاينة صوت الحوار")).to_be_visible(timeout=8000)
            page.get_by_role("button", name="تشغيل").click()
            expect(page.get_by_role("button", name="إيقاف مؤقت")).to_be_visible()
            page.get_by_role("button", name="إيقاف مؤقت").click()
            # Exercise a real short, silent WebM capture through MediaRecorder.
            export_button = page.get_by_role("button", name="تسجيل معاينة WebM")
            expect(export_button).to_be_enabled()
            export_button.click()
            expect(page.get_by_role("link", name="تنزيل الفيديو")).to_be_visible(timeout=18000)
            with page.expect_download() as webm_download:
                page.get_by_role("link", name="تنزيل الفيديو").click()
            webm = webm_download.value.path()
            if not webm or webm.stat().st_size < 1000:
                raise RuntimeError("WebM preview did not produce a usable file")
            # Chromium MediaRecorder must contain a real Opus audio track, not TTS-only speech.
            content = webm.read_bytes()
            if b"A_OPUS" not in content and b"OpusHead" not in content:
                raise RuntimeError("WebM output has no Opus audio track")
            with page.expect_download() as download:
                page.get_by_role("button", name="تنزيل نسخة JSON").click()
            path = download.value.path()
            if not path:
                raise RuntimeError("JSON backup was not saved")
            page.get_by_label("استيراد نسخة احتياطية").set_input_files(str(path))
            expect(page.get_by_role("button", name="قصة جديدة — نسخة", exact=True)).to_be_visible(timeout=8000)
            assert page.get_by_role("button", name="قصة جديدة", exact=True).count() >= 1
            browser.close()
    finally:
        server.terminate()
        try:
            server.wait(timeout=10)
        except subprocess.TimeoutExpired:
            server.kill()
            server.wait()

if __name__ == "__main__":
    main()
