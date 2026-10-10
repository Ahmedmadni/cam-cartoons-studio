#!/usr/bin/env python3
"""Real Chromium/WebGL smoke for GLB loading, local import and mobile layout.

Run in CI after generate_qa_glb.py and Playwright installation.
Screenshots and dev-server logs are stored as GitHub Actions artifacts.
"""
import json
import os
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
    """Opt-in screenshot: CI's software GPU can hang on WebGL readback."""
    if os.environ.get("MODEL_QA_CAPTURE") != "1":
        return
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


def await_gltf_ready(page, name, expected_zero_bones=True, source_url=None):
    # The diagnostics appear only when Three.js GLTF loader actually mounts.
    try:
        expect(page.get_by_role("heading", name="تقرير جاهزية نموذج GLB")).to_be_visible(timeout=25000)
        page.wait_for_function("() => document.body.innerText.includes('العظام: ')", timeout=25000)
        if expected_zero_bones:
            page.wait_for_function("() => document.body.innerText.includes('العظام: 0')", timeout=25000)
        assert page.get_by_text("تعذر تحميل النموذج:", exact=False).count() == 0, (
            f"{name}: GLB load failed and the app displayed the procedural fallback"
        )
    except Exception:
        capture_evidence(page, "model-ready-failure.png")
        print("QA FAILED PAGE TEXT:", page.locator("body").inner_text()[-5000:])
        if source_url:
            print("QA DIRECT FULL GET:", page.evaluate("""async (url) => {
                try {
                    const resp = await fetch(url, { mode: 'cors', cache: 'no-store', credentials: 'omit' });
                    const bytes = new Uint8Array(await resp.arrayBuffer());
                    const view = new DataView(bytes.buffer);
                    return {
                        status: resp.status, responseType: resp.type, receivedBytes: bytes.length,
                        glbMagic: bytes.length >= 4 ? view.getUint32(0, true) : null,
                        glbVersion: bytes.length >= 8 ? view.getUint32(4, true) : null,
                        declaredBytes: bytes.length >= 12 ? view.getUint32(8, true) : null,
                        firstChunkLength: bytes.length >= 16 ? view.getUint32(12, true) : null,
                        firstChunkType: bytes.length >= 20 ? view.getUint32(16, true) : null,
                        firstBytes: Array.from(bytes.slice(0, 24)),
                    };
                } catch (error) { return { error: String(error) }; }
            }""", source_url))
        print("QA FAILED GLB response:", page.evaluate("""async () => {
            const resp = await fetch('/__qa__/model.glb');
            const buf = await resp.arrayBuffer();
            return { status: resp.status, type: resp.headers.get('content-type'),
              bytes: buf.byteLength,
              signature: Array.from(new Uint8Array(buf.slice(0, 12))) };
        }"""))
        raise


def add_character(page, name, *, local_file=None, model_url=None, expected_zero_bones=True):
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
        dialog.get_by_placeholder("https://example.com/avatar.glb").fill(model_url or "/__qa__/model.glb")
    dialog.get_by_role("button", name="حفظ الشخصية").click()
    expect(dialog).to_have_count(0, timeout=15000)
    await_gltf_ready(page, name, expected_zero_bones=expected_zero_bones)


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

                # Optional candidates must appear but should not be auto-seeded.
                expect(page.get_by_role("heading", name="شخصيات بشرية جديدة قيد التقييم")).to_be_visible()
                expect(page.get_by_role("button", name="أضف ياسمين للتقييم")).to_be_visible()
                expect(page.get_by_role("button", name="أضف زياد للتقييم")).to_be_visible()
                # Keep heavy optional avatar downloads isolated from baseline
                # renderer and IndexedDB regression tests.
                add_character(page, "اختبار الجودة")
                capture_evidence(page, "desktop-loaded-glb.png")
                # Dispatch actual DOM clicks to verify React controls without waiting on
                # unrelated Vite dev-server navigation/network tasks in Playwright.
                expect(page.get_by_role("button", name="نصف الجسم")).to_have_attribute("aria-pressed", "true")
                page.get_by_role("button", name="الوجه والكتفان").dispatch_event("click")
                expect(page.get_by_role("button", name="الوجه والكتفان")).to_have_attribute("aria-pressed", "true")
                # The Phase 18 angles are true interactive review controls, not
                # decorative labels. A selected angle must disable free spin.
                expect(page.get_by_role("button", name="أمامي")).to_have_attribute("aria-pressed", "true")
                page.get_by_role("button", name="جانبي").dispatch_event("click")
                expect(page.get_by_role("button", name="جانبي")).to_have_attribute("aria-pressed", "true")
                page.get_by_role("button", name="ثلاثة أرباع").dispatch_event("click")
                expect(page.get_by_role("button", name="ثلاثة أرباع")).to_have_attribute("aria-pressed", "true")
                page.get_by_role("button", name="أمامي").dispatch_event("click")
                backdrop = page.locator("#review-backdrop")
                backdrop.select_option("garden")
                expect(backdrop).to_have_value("garden")
                backdrop.select_option("studio")
                expect(backdrop).to_have_value("studio")
                page.get_by_role("button", name="استوديو ناعم").dispatch_event("click")
                expect(page.get_by_role("button", name="استوديو ناعم")).to_have_attribute("aria-pressed", "true")
                expect(page.get_by_text("تحليل الأسطح والخامات الفعلية")).to_be_visible()
                page.get_by_role("button", name="درامية").dispatch_event("click")
                expect(page.get_by_role("button", name="درامية")).to_have_attribute("aria-pressed", "true")
                page.get_by_role("button", name="سينمائية").dispatch_event("click")
                page.get_by_role("button", name="الجسم كاملًا").dispatch_event("click")
                page.get_by_role("button", name="تلويح").dispatch_event("click")
                expect(page.get_by_role("button", name="تلويح")).to_have_attribute("aria-pressed", "true")
                page.get_by_role("button", name="تدوير الشخصية").dispatch_event("click")
                expect(page.get_by_role("button", name="إيقاف الدوران")).to_have_attribute("aria-pressed", "true")
                capture_evidence(page, "desktop-glb.png")

                page.set_viewport_size({"width": 390, "height": 844})
                expect(page.get_by_role("heading", name="اختبار الجودة").last).to_be_visible()
                page.wait_for_function("() => document.body.innerText.includes('العظام: 0 · تعابير Morph')", timeout=15000)
                capture_evidence(page, "mobile-glb.png")

                page.set_viewport_size({"width": 1366, "height": 900})
                add_character(page, "اختبار الملف", local_file="public/__qa__/model.glb")
                capture_evidence(page, "indexeddb-import.png")
                page.reload(wait_until="networkidle")
                expect(page.get_by_role("heading", name="مكتبة الشخصيات المفتوحة")).to_be_visible()
                page.get_by_role("button", name=re.compile(r"اختبار الملف")).first.dispatch_event("click")
                await_gltf_ready(page, "اختبار الملف بعد تحديث الصفحة")
                # Real featured GLB files, fetched only if the upstream source is alive.
                # The synthetic fixture remains the mandatory offline regression check.
                featured_files = sorted(Path("public/__qa__/featured").glob("featured-*.glb"))
                verified_count = 0
                for featured_path in featured_files:
                    name = "فحص " + featured_path.stem
                    page.goto(URL, wait_until="networkidle", timeout=60000)
                    add_character(
                        page, name,
                        model_url="/__qa__/featured/" + featured_path.name,
                        expected_zero_bones=False,
                    )
                    assert "المجسمات:" in page.locator("body").inner_text()
                    verified_count += 1
                    print(f"PASS: real hosted model binary loaded in WebGL: {featured_path.name}", flush=True)
                print(f"Real publisher-hosted GLB models exercised: {verified_count}/5", flush=True)
                candidate_files = sorted(Path("public/__qa__/candidates").glob("curated-*.glb"))
                for candidate_path in candidate_files:
                    page.goto(URL, wait_until="networkidle", timeout=60000)
                    add_character(
                        page, "فحص النموذج " + candidate_path.stem,
                        model_url="/__qa__/candidates/" + candidate_path.name,
                        expected_zero_bones=False,
                    )
                    assert "تحريك الفم: مدعوم" in page.locator("body").inner_text(), (
                        f"{candidate_path.name}: morph metadata did not match actual loader"
                    )
                    print(f"PASS: real Rocketbox candidate loaded in Chromium: {candidate_path.name}", flush=True)
                print(f"Real candidate binary GLBs exercised: {len(candidate_files)}/2", flush=True)

                # Unlike same-origin CI fixture loading, this performs real CORS
                # requests and GLTFLoader renders from the publisher origin.
                origin_results = []
                featured_names = [
                    ("سارة", "https://three.ws/avatars/realistic-female.glb"),
                    ("عمر", "https://three.ws/avatars/realistic-male.glb"),
                    ("ليلى", "https://three.ws/avatars/selfie-girl.glb"),
                    ("هند", "https://three.ws/avatars/michelle.glb"),
                    ("ريم", "https://three.ws/avatars/realistic-halfbody.glb"),
                ]
                for name, source_url in featured_names:
                    page.goto(URL, wait_until="networkidle", timeout=60000)
                    page.get_by_role("button", name=re.compile(name)).first.dispatch_event("click")
                    expect(page.get_by_role("heading", name=name).last).to_be_visible(timeout=12000)
                    page.get_by_role("button", name="فحص رابط GLB وCORS").dispatch_event("click")
                    source_status = page.get_by_role("status")
                    expect(source_status).to_contain_text("المصدر متاح", timeout=22000)
                    await_gltf_ready(page, name, expected_zero_bones=False, source_url=source_url)
                    if name == "ريم":
                        expect(page.get_by_role("button", name="الوجه والكتفان")).to_have_attribute(
                            "aria-pressed", "true"
                        )
                        # Real morphological expression controls, not still-image overlays.
                        page.get_by_role("button", name="ابتسامة", exact=True).dispatch_event("click")
                        expect(page.get_by_role("button", name="ابتسامة", exact=True)).to_have_attribute(
                            "aria-pressed", "true"
                        )
                        page.get_by_role("button", name="محايد", exact=True).dispatch_event("click")
                        expect(page.get_by_role("button", name="محايد", exact=True)).to_have_attribute(
                            "aria-pressed", "true"
                        )
                    if name == "هند":
                        assert not page.get_by_role("button", name="ابتسامة", exact=True).is_enabled()

                    mouth_button = page.get_by_role("button", name="تجربة حركة الفم")
                    expect(mouth_button).to_be_visible()
                    mouth_available = mouth_button.is_enabled()
                    if name == "هند":
                        assert not mouth_available, "هند must not claim unsupported lipsync"
                    if name == "ريم":
                        assert mouth_available, "ريم must expose the verified face morphs"
                    if mouth_available:
                        mouth_button.dispatch_event("click")
                        expect(page.get_by_role("button", name="إيقاف تجربة الفم")).to_have_attribute(
                            "aria-pressed", "true"
                        )
                    origin_results.append({"name": name, "browser_cors": "passed", "direct_glb_render": "passed",
                                           "mouth_preview_available": mouth_available})
                    print(f"PASS: publisher-origin CORS and real GLB render for {name}", flush=True)
                (ARTIFACTS / "browser-origin-check.json").write_text(
                    json.dumps(origin_results, ensure_ascii=False, indent=2), encoding="utf-8"
                )
                # Tear down the original context and all its WebGL canvases
                # before the candidate review. A second tab in the same context
                # can exhaust SwiftShader resources on CI runners.
                context.close()
                candidate_context = browser.new_context(viewport={"width": 1366, "height": 900})
                candidate_page = candidate_context.new_page()
                candidate_page.goto(URL, wait_until="networkidle", timeout=60000)
                expect(candidate_page.get_by_role("button", name="أضف ياسمين للتقييم")).to_be_visible()
                candidate_page.get_by_role("button", name="أضف ياسمين للتقييم").dispatch_event("click")
                expect(candidate_page.get_by_role("button", name="افتح ياسمين في مكتبتي")).to_be_visible()
                expect(candidate_page.get_by_role("heading", name="ياسمين").last).to_be_visible()
                candidate_page.get_by_role("button", name="افتح ياسمين في مكتبتي").dispatch_event("click")
                assert candidate_page.get_by_role("button", name="حذف ياسمين").count() == 1, (
                    "Selecting an existing candidate must not create a duplicate"
                )
                candidate_page.get_by_role("button", name="فحص رابط GLB وCORS").dispatch_event("click")
                expect(candidate_page.get_by_role("status")).to_contain_text("المصدر متاح", timeout=22000)
                await_gltf_ready(candidate_page, "ياسمين", expected_zero_bones=False)
                candidate_context.close()
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
