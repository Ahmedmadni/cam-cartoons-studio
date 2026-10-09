#!/usr/bin/env python3
"""Real Chromium/WebGL smoke for GLB loading, local import and mobile layout.

Run in CI after generate_qa_glb.py and Playwright installation.
Screenshots and dev-server logs are stored as GitHub Actions artifacts.
"""
import re
import subprocess
import time
import urllib.error
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright, expect

URL = "http://127.0.0.1:4173"
ARTIFACTS = Path("artifacts/model-review")
ARTIFACTS.mkdir(parents=True, exist_ok=True)


def wait_for_server(proc):
    for _ in range(90):
        if proc.poll() is not None:
            raise RuntimeError(f"Vite exited early with code {proc.returncode}")
        try:
            with urllib.request.urlopen(URL, timeout=1) as resp:
                if resp.status == 200:
                    return
        except (urllib.error.URLError, TimeoutError):
            pass
        time.sleep(1)
    raise RuntimeError("Local Vite server was not ready within 90 seconds")


def await_gltf_ready(page, name):
    # The diagnostics appear only when Three.js GLTF loader actually mounts.
    expect(page.get_by_role("heading", name="تقرير جاهزية نموذج GLB")).to_be_visible(timeout=25000)
    expect(page.get_by_text(re.compile(r"العظام:\s*0"))).to_be_visible(timeout=25000)
    assert page.get_by_text("تعذر تحميل النموذج:", exact=False).count() == 0, (
        f"{name}: GLB load failed and the app displayed the procedural fallback"
    )


def add_character(page, name, *, local_file=None):
    page.get_by_role("button", name="إضافة شخصية").click()
    dialog = page.get_by_role("dialog")
    dialog.get_by_label("اسم الشخصية").fill(name)
    if local_file:
        dialog.locator('input[type="file"]').set_input_files(local_file)
    else:
        dialog.get_by_placeholder("https://example.com/avatar.glb").fill("/__qa__/model.glb")
    dialog.get_by_role("button", name="حفظ الشخصية").click()
    expect(dialog).to_have_count(0, timeout=15000)
    await_gltf_ready(page, name)


def main():
    Path("public/__qa__/model.glb").stat()
    log = ARTIFACTS / "vite.log"
    with log.open("w") as output:
        server = subprocess.Popen(
            ["bun", "run", "dev", "--host", "127.0.0.1", "--port", "4173"],
            stdout=output,
            stderr=subprocess.STDOUT,
        )
        try:
            wait_for_server(server)
            with sync_playwright() as p:
                browser = p.chromium.launch(
                    headless=True,
                    args=[
                        "--no-sandbox", "--enable-webgl", "--enable-unsafe-swiftshader",
                        "--use-gl=angle", "--use-angle=swiftshader",
                    ],
                )
                context = browser.new_context(viewport={"width": 1366, "height": 900})
                page = context.new_page()
                page.goto(URL, wait_until="domcontentloaded", timeout=60000)
                expect(page.get_by_role("heading", name="مكتبة الشخصيات المفتوحة")).to_be_visible(timeout=30000)

                add_character(page, "اختبار الجودة")
                page.get_by_role("button", name="تلويح").click()
                expect(page.get_by_role("button", name="تلويح")).to_have_attribute("aria-pressed", "true")
                page.get_by_role("button", name="تدوير الشخصية").click()
                expect(page.get_by_role("button", name="إيقاف الدوران")).to_have_attribute("aria-pressed", "true")
                page.screenshot(path=str(ARTIFACTS / "desktop-glb.png"), full_page=True)

                page.set_viewport_size({"width": 390, "height": 844})
                expect(page.get_by_role("heading", name="اختبار الجودة").last).to_be_visible()
                expect(page.get_by_text(re.compile(r"العظام:\s*0"))).to_be_visible()
                page.screenshot(path=str(ARTIFACTS / "mobile-glb.png"), full_page=True)

                page.set_viewport_size({"width": 1366, "height": 900})
                add_character(page, "اختبار الملف", local_file="public/__qa__/model.glb")
                page.screenshot(path=str(ARTIFACTS / "indexeddb-import.png"), full_page=True)
                page.reload(wait_until="domcontentloaded")
                expect(page.get_by_role("heading", name="مكتبة الشخصيات المفتوحة")).to_be_visible()
                page.get_by_role("button", name=re.compile(r"اختبار الملف")).first.click()
                await_gltf_ready(page, "اختبار الملف بعد تحديث الصفحة")
                context.close()
                browser.close()
            print("PASS: hosted GLB, model controls, mobile WebGL, IndexedDB import and reload")
        finally:
            server.terminate()
            try:
                server.wait(timeout=10)
            except subprocess.TimeoutExpired:
                server.kill()
                server.wait()


if __name__ == "__main__":
    main()
