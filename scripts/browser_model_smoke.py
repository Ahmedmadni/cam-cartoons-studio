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


def capture_evidence(page, filename):
    """Optional screenshot: Chromium software GPU may stall on WebGL readback."""
    try:
        page.screenshot(
            path=str(ARTIFACTS / filename),
            full_page=False,
            animations="disabled",
            timeout=8000,
        )
    except Exception as error:
        print(f"Non-blocking screenshot unavailable ({filename}): {error}")


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
    try:
        expect(page.get_by_role("heading", name="تقرير جاهزية نموذج GLB")).to_be_visible(timeout=25000)
        page.wait_for_function("() => document.body.innerText.includes('العظام: 0')", timeout=25000)
        assert page.get_by_text("تعذر تحميل النموذج:", exact=False).count() == 0, (
            f"{name}: GLB load failed and the app displayed the procedural fallback"
        )
    except Exception:
        capture_evidence(page, "model-ready-failure.png")
        print("QA FAILED PAGE TEXT:", page.locator("body").inner_text()[-5000:])
        print("QA FAILED GLB response:", page.evaluate("""async () => {
            const resp = await fetch('/__qa__/model.glb');
            const buf = await resp.arrayBuffer();
            return { status: resp.status, type: resp.headers.get('content-type'),
              bytes: buf.byteLength,
              signature: Array.from(new Uint8Array(buf.slice(0, 12))) };
        }"""))
        raise


def add_character(page, name, *, local_file=None):
    page.get_by_role("button", name="إضافة شخصية").click()
    dialog = page.get_by_role("dialog")
    try:
        expect(dialog).to_be_visible(timeout=12000)
    except AssertionError:
        capture_evidence(page, "form-open-failure.png")
        print("Editor failed to open. Page text:", page.locator("body").inner_text()[:2400])
        raise
    dialog.locator("#character-editor-name").fill(name)
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
                page.goto(URL, wait_until="networkidle", timeout=60000)
                expect(page.get_by_role("heading", name="مكتبة الشخصيات المفتوحة")).to_be_visible(timeout=30000)

                add_character(page, "اختبار الجودة")
                capture_evidence(page, "desktop-loaded-glb.png")
                # Dispatch actual DOM clicks to verify React controls without waiting on
                # unrelated Vite dev-server navigation/network tasks in Playwright.
                page.get_by_role("button", name="تلويح").dispatch_event("click")
                expect(page.get_by_role("button", name="تلويح")).to_have_attribute("aria-pressed", "true")
                page.get_by_role("button", name="تدوير الشخصية").dispatch_event("click")
                expect(page.get_by_role("button", name="إيقاف الدوران")).to_have_attribute("aria-pressed", "true")
                capture_evidence(page, "desktop-glb.png")

                page.set_viewport_size({"width": 390, "height": 844})
                expect(page.get_by_role("heading", name="اختبار الجودة").last).to_be_visible()
                expect(page.get_by_text(re.compile(r"العظام:\s*0"))).to_be_visible()
                capture_evidence(page, "mobile-glb.png")

                page.set_viewport_size({"width": 1366, "height": 900})
                add_character(page, "اختبار الملف", local_file="public/__qa__/model.glb")
                capture_evidence(page, "indexeddb-import.png")
                page.reload(wait_until="networkidle")
                expect(page.get_by_role("heading", name="مكتبة الشخصيات المفتوحة")).to_be_visible()
                page.get_by_role("button", name=re.compile(r"اختبار الملف")).first.dispatch_event("click")
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
