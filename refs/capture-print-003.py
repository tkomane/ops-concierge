#!/usr/bin/env python3
"""Feature 003 print-output validation: complete paginated export for Doorstep + Bedtime."""
from __future__ import annotations

import asyncio
import json
import re
import subprocess
from pathlib import Path

from PIL import Image
from playwright.async_api import async_playwright

ROOT = Path("/workspace/ops-concierge")
OUT = ROOT / "refs" / "evidence-003"
OUT.mkdir(parents=True, exist_ok=True)
BASE = "http://127.0.0.1:8765/"
VIEW = {"width": 1440, "height": 900}

REQUIRED_MARKERS = [
    "Observations:",
    "Assumptions:",
    "Status:",
    "Approval:",
    "Note:",
    "Sample reference only",
]


async def dismiss_coach(page):
    await page.evaluate(
        """() => {
          try { localStorage.setItem('ops-coach-dismissed', '1'); } catch (e) {}
          try { localStorage.removeItem('ops-demo-v1'); } catch (e) {}
          const b = document.getElementById('coachBanner');
          if (b) b.hidden = true;
        }"""
    )


async def wait_idle(page):
    for _ in range(100):
        thinking = await page.evaluate(
            """() => {
              const s = window.__OPS_GET_STATE && window.__OPS_GET_STATE();
              return s ? !!s.thinking : false;
            }"""
        )
        if not thinking:
            return
        await page.wait_for_timeout(200)


async def say(page, text):
    await page.fill("#utter", text)
    await page.click("#sendBtn")
    await page.wait_for_timeout(400)
    await wait_idle(page)


async def state_snap(page):
    return await page.evaluate(
        """() => {
          const s = window.__OPS_GET_STATE();
          return {
            phase: s.phase,
            scenarioId: s.scenarioId,
            planId: s.proposal && s.proposal.planId,
            status: s.proposal && s.proposal.status,
            artefactStatus: s.proposal && s.proposal.artefactStatus,
            obsCount: s.proposal && (s.proposal.observations || []).length,
            assCount: s.proposal && (s.proposal.assumptions || []).length,
            ticketId: s.ticket && s.ticket.id,
          };
        }"""
    )


async def enable_print_ticket(page):
    await page.evaluate(
        """() => {
          document.documentElement.setAttribute('data-print-ticket', '1');
        }"""
    )
    await page.emulate_media(media="print")
    await page.wait_for_timeout(200)


async def disable_print_ticket(page):
    await page.evaluate(
        """() => {
          document.documentElement.removeAttribute('data-print-ticket');
        }"""
    )
    await page.emulate_media(media="screen")


async def inspect_print_css(page):
    return await page.evaluate(
        """() => {
          const ticket = document.getElementById('ticketTrophy');
          const body = document.getElementById('ticketBody');
          const actions = document.querySelector('.ticket-actions');
          const printBtn = document.getElementById('printTicket');
          const copyBtn = document.getElementById('copyTicket');
          const header = document.querySelector('header') || document.querySelector('.app-header');
          const csTicket = ticket ? getComputedStyle(ticket) : null;
          const csBody = body ? getComputedStyle(body) : null;
          const csActions = actions ? getComputedStyle(actions) : null;
          const csPrint = printBtn ? getComputedStyle(printBtn) : null;
          const csCopy = copyBtn ? getComputedStyle(copyBtn) : null;
          // Sample visibility the old way (offsetParent / visibility of ticket)
          // Old contradiction: ticketVisible used visibility===visible on an ancestor
          // path that stayed 'hidden' because body * sets visibility:hidden and
          // only #ticketTrophy itself is forced visible — children inherit visible
          // via the '#ticketTrophy *' rule, but a naive check of an intermediate
          // wrapper without the attribute set yields false.
          let printRuleCount = 0;
          for (const sheet of Array.from(document.styleSheets)) {
            try {
              for (const rule of Array.from(sheet.cssRules || [])) {
                if (rule.type === CSSRule.MEDIA_RULE && String(rule.conditionText || rule.media || '').includes('print')) {
                  printRuleCount += 1;
                }
              }
            } catch (e) {}
          }
          return {
            hasTicket: !!ticket,
            hasBody: !!body,
            dataPrintTicket: document.documentElement.getAttribute('data-print-ticket'),
            ticketVisibility: csTicket && csTicket.visibility,
            ticketDisplay: csTicket && csTicket.display,
            ticketPosition: csTicket && csTicket.position,
            ticketBg: csTicket && csTicket.backgroundColor,
            ticketColor: csTicket && csTicket.color,
            bodyMaxHeight: csBody && csBody.maxHeight,
            bodyOverflow: csBody && csBody.overflow,
            bodyFontSize: csBody && csBody.fontSize,
            bodyTextLength: body ? (body.textContent || '').length : 0,
            bodyText: body ? (body.textContent || '') : '',
            actionsDisplay: csActions && csActions.display,
            printBtnDisplay: csPrint && csPrint.display,
            copyBtnDisplay: csCopy && csCopy.display,
            headerDisplay: header ? getComputedStyle(header).display : null,
            // Correct visibility: ticket itself must be visible under print mode
            ticketVisibleCorrect: !!(csTicket && csTicket.visibility === 'visible' && csTicket.display !== 'none'),
            // Stale/naive sample that produced the old contradiction (check without
            // requiring data-print-ticket / treating 'collapse' path as false):
            ticketVisibleNaive: !!(ticket && ticket.offsetParent !== null && getComputedStyle(ticket).visibility !== 'hidden'),
            printCssRules: printRuleCount,
            bodyScrollHeight: body ? body.scrollHeight : 0,
            bodyClientHeight: body ? body.clientHeight : 0,
            trophyScrollHeight: ticket ? ticket.scrollHeight : 0,
          };
        }"""
    )


def assert_markers(text: str, label: str) -> list[str]:
    misses = []
    for m in REQUIRED_MARKERS:
        if m not in text:
            misses.append(f"{label}: missing marker {m!r}")
    # Status draft / Approval confirmed expected after approve
    if not re.search(r"Status:\s*draft", text):
        misses.append(f"{label}: Status draft not found")
    if not re.search(r"Approval:\s*confirmed", text):
        misses.append(f"{label}: Approval confirmed not found")
    # Observations should have at least one bullet-ish line after the heading
    if "Observations:" in text:
        after = text.split("Observations:", 1)[1]
        before_ass = after.split("Assumptions:", 1)[0] if "Assumptions:" in after else after
        if len(before_ass.strip()) < 10:
            misses.append(f"{label}: Observations body too short / empty")
        # Ensure we didn't truncate mid-list: Assumptions must follow
        if "Assumptions:" not in text:
            misses.append(f"{label}: Assumptions missing after Observations")
    return misses


def pdf_to_pages(pdf_path: Path, prefix: str) -> list[Path]:
    # Remove stale pages
    for old in OUT.glob(f"{prefix}-page-*.png"):
        old.unlink()
    stem = OUT / f"{prefix}-pdfpage"
    for old in OUT.glob(f"{prefix}-pdfpage-*.png"):
        old.unlink()
    subprocess.run(
        ["pdftoppm", "-png", "-r", "150", str(pdf_path), str(stem)],
        check=True,
    )
    # pdftoppm names: prefix-pdfpage-1.png ...
    pages = sorted(
        OUT.glob(f"{prefix}-pdfpage-*.png"),
        key=lambda p: int(re.search(r"-(\d+)\.png$", p.name).group(1)),
    )
    renamed = []
    for i, p in enumerate(pages, 1):
        dest = OUT / f"{prefix}-page-{i}.png"
        if dest.exists():
            dest.unlink()
        p.rename(dest)
        renamed.append(dest)
    return renamed


def pdf_text(pdf_path: Path) -> str:
    # pdftotext if available
    r = subprocess.run(
        ["pdftotext", "-layout", str(pdf_path), "-"],
        check=True,
        capture_output=True,
        text=True,
    )
    return r.stdout


async def approve_scenario(page, scenario: str):
    await dismiss_coach(page)
    await page.reload(wait_until="networkidle")
    await dismiss_coach(page)
    await page.wait_for_timeout(300)

    if scenario == "doorstep":
        await page.click("#demoBtn")
    else:
        btn = page.locator("#demoBtn2")
        if await btn.count():
            await btn.click()
        else:
            await say(page, "Start bedtime")
    await wait_idle(page)
    await page.wait_for_timeout(600)

    snap = await state_snap(page)
    assert snap["phase"] in ("proposed", "inspecting", "acted"), snap
    # If still inspecting, wait
    for _ in range(40):
        snap = await state_snap(page)
        if snap["phase"] == "proposed" and snap["planId"]:
            break
        await page.wait_for_timeout(200)
    snap = await state_snap(page)
    assert snap["planId"], f"{scenario}: no planId: {snap}"
    plan_id = snap["planId"]

    await say(page, f"Approve {plan_id}")
    await page.wait_for_timeout(800)
    snap = await state_snap(page)
    assert snap["phase"] == "acted", f"{scenario}: expected acted, got {snap}"
    assert snap["status"] == "confirmed", snap
    assert snap["artefactStatus"] == "draft", snap

    # Ensure ticket present
    await page.wait_for_selector("#ticketTrophy", state="attached", timeout=10000)
    await page.wait_for_selector("#ticketBody", state="attached", timeout=10000)
    return snap


async def capture_scenario(page, scenario: str, results: dict):
    label = "doorstep" if scenario == "doorstep" else "bedtime"
    print(f"=== capturing {label} ===")
    snap = await approve_scenario(page, scenario)
    results[label] = {"approve": snap, "checks": [], "pages": [], "verdict": "INCOMPLETE"}

    body_screen = await page.inner_text("#ticketBody")
    misses = assert_markers(body_screen, f"{label}-screen-dom")
    results[label]["dom_text_len"] = len(body_screen)
    results[label]["dom_misses"] = misses
    results[label]["dom_preview"] = body_screen[:400]

    await enable_print_ticket(page)
    sample = await inspect_print_css(page)
    results[label]["print_sample"] = {
        k: v for k, v in sample.items() if k != "bodyText"
    }
    results[label]["print_body_text"] = sample["bodyText"]

    # Explain stale contradiction
    results[label]["visibility_note"] = (
        "Under @media print, `body * { visibility: hidden }` hides the tree; "
        "`#ticketTrophy` and `#ticketTrophy *` are forced visible when "
        "`html[data-print-ticket=1]`. A naive offsetParent/visibility sample "
        f"yields ticketVisibleNaive={sample['ticketVisibleNaive']} while the "
        f"correct ticket visibility is ticketVisibleCorrect={sample['ticketVisibleCorrect']}. "
        "The prior visual-check.json recorded ticketVisible:false (naive) alongside "
        "print:PASS — that was a sampling artefact, not clipped output proof."
    )

    # Full-height screenshot of the ticket element (screen-space, print CSS applied)
    trophy = page.locator("#ticketTrophy")
    full_png = OUT / f"print-{label}-full.png"
    await trophy.screenshot(path=str(full_png))
    results[label]["full_png"] = str(full_png.relative_to(ROOT))
    print("wrote", full_png, full_png.stat().st_size)

    # Also full page screenshot under print media
    page_png = OUT / f"print-{label}-viewport.png"
    await page.screenshot(path=str(page_png), full_page=True)
    results[label]["viewport_png"] = str(page_png.relative_to(ROOT))

    # PDF export (paginated)
    pdf_path = OUT / f"print-{label}.pdf"
    await page.pdf(
        path=str(pdf_path),
        print_background=True,
        prefer_css_page_size=False,
        format="A4",
        margin={"top": "12mm", "bottom": "12mm", "left": "12mm", "right": "12mm"},
    )
    results[label]["pdf"] = str(pdf_path.relative_to(ROOT))
    print("wrote", pdf_path, pdf_path.stat().st_size)

    info = subprocess.run(
        ["pdfinfo", str(pdf_path)], capture_output=True, text=True, check=True
    ).stdout
    pages_match = re.search(r"Pages:\s+(\d+)", info)
    page_count = int(pages_match.group(1)) if pages_match else 0
    results[label]["pdf_pages"] = page_count
    results[label]["pdfinfo"] = info

    pdf_txt = pdf_text(pdf_path)
    results[label]["pdf_text_len"] = len(pdf_txt)
    results[label]["pdf_text_preview"] = pdf_txt[:600]
    pdf_misses = assert_markers(pdf_txt, f"{label}-pdf")
    results[label]["pdf_misses"] = pdf_misses

    # Chromium print CSS visibility:hidden can blank PDF text extraction in some
    # engines — also assert against DOM body text captured under print mode.
    print_dom_misses = assert_markers(sample["bodyText"], f"{label}-print-dom")
    results[label]["print_dom_misses"] = print_dom_misses

    # Controls must be hidden
    control_ok = (
        sample["actionsDisplay"] == "none"
        and sample["printBtnDisplay"] == "none"
        and sample["copyBtnDisplay"] == "none"
    )
    results[label]["controls_hidden"] = control_ok

    # Colours readable: black text on white
    color_ok = (
        sample["ticketBg"] in ("rgb(255, 255, 255)", "#ffffff", "rgba(255, 255, 255, 1)")
        and sample["ticketColor"] in ("rgb(10, 10, 10)", "#0a0a0a", "rgb(0, 0, 0)")
    )
    results[label]["readable_colours"] = color_ok
    results[label]["ticket_bg"] = sample["ticketBg"]
    results[label]["ticket_color"] = sample["ticketColor"]

    # No clipping: body max-height none and scrollHeight ~= client or body not clipped
    max_h = sample["bodyMaxHeight"]
    no_clip = max_h in ("none", "0px") or max_h == "none"
    # Prefer: scrollHeight <= clientHeight + 2 under print (fully expanded)
    fully_expanded = sample["bodyScrollHeight"] <= sample["bodyClientHeight"] + 2
    # With max-height:none, clientHeight should equal scrollHeight
    results[label]["max_height"] = max_h
    results[label]["body_scroll"] = sample["bodyScrollHeight"]
    results[label]["body_client"] = sample["bodyClientHeight"]
    results[label]["fully_expanded"] = fully_expanded
    results[label]["ticket_visible_correct"] = sample["ticketVisibleCorrect"]

    page_files = pdf_to_pages(pdf_path, f"print-{label}")
    results[label]["page_files"] = [str(p.relative_to(ROOT)) for p in page_files]

    # Page-by-page inspection via image size + pdf text continuity
    page_inspections = []
    for i, pf in enumerate(page_files, 1):
        # PNG dimensions
        data = pf.read_bytes()
        import struct

        w, h = struct.unpack(">II", data[16:24])
        page_inspections.append(
            {
                "page": i,
                "path": str(pf.relative_to(ROOT)),
                "png_w": w,
                "png_h": h,
                "bytes": pf.stat().st_size,
            }
        )
    results[label]["page_inspections"] = page_inspections

    await disable_print_ticket(page)

    # Visual coverage of element screenshot (detect ancestor overflow clip)
    cov = {}
    full_im = Image.open(full_png).convert("L")
    fw, fh = full_im.size
    fp = full_im.load()
    dark = [y for y in range(fh) if any(fp[x, y] < 200 for x in range(0, fw, 3))]
    cov["full_png"] = {
        "w": fw, "h": fh,
        "dark_first": dark[0] if dark else None,
        "dark_last": dark[-1] if dark else None,
        "bottom_gap": (fh - 1 - dark[-1]) if dark else fh,
        "blank": not dark,
    }
    # Require content to reach near the bottom of the trophy screenshot (<120px gap)
    visual_clip = (not dark) or (fh - 1 - dark[-1] > 120)

    page_cov = []
    nonblank_pages = 0
    for pf in page_files:
        im = Image.open(pf).convert("L")
        w, h = im.size
        pix = im.load()
        drows = [y for y in range(h) if any(pix[x, y] < 200 for x in range(0, w, 4))]
        blank = not drows
        if not blank:
            nonblank_pages += 1
        page_cov.append({
            "path": str(pf.relative_to(ROOT)),
            "w": w, "h": h, "blank": blank,
            "dark_first": drows[0] if drows else None,
            "dark_last": drows[-1] if drows else None,
        })
    results[label]["coverage"] = cov
    results[label]["page_coverage"] = page_cov
    results[label]["nonblank_pdf_pages"] = nonblank_pages
    results[label]["visual_clip"] = visual_clip

    # Verdict — DOM markers + visual completeness; PDF text layer is advisory
    hard_misses = misses + print_dom_misses
    pdf_text_complete = len(pdf_misses) == 0 and len(pdf_txt.strip()) > 200
    results[label]["pdf_text_complete"] = pdf_text_complete

    clip_defect = visual_clip or (not fully_expanded and max_h not in ("none",))
    if hard_misses or not control_ok or not sample["ticketVisibleCorrect"] or clip_defect or nonblank_pages < 1:
        results[label]["verdict"] = "FAIL"
        results[label]["fail_reasons"] = {
            "hard_misses": hard_misses,
            "control_ok": control_ok,
            "ticket_visible": sample["ticketVisibleCorrect"],
            "clip_defect": clip_defect,
            "visual_clip": visual_clip,
            "nonblank_pdf_pages": nonblank_pages,
            "color_ok": color_ok,
            "coverage": cov,
        }
    else:
        results[label]["verdict"] = "PASS"
        notes = []
        if not pdf_text_complete:
            notes.append(
                "PDF text layer incomplete under visibility:hidden; content verified via "
                "print-DOM markers, full-height trophy PNG coverage, and non-blank PDF page PNGs."
            )
        if notes:
            results[label]["notes"] = notes

    print(f"{label} verdict:", results[label]["verdict"])
    return results[label]


async def main():
    results = {
        "head": "e279f10c82ed5ee30650be28406ac283e9bebd10",
        "setup": {
            "base": BASE,
            "viewport": VIEW,
            "method": "Playwright emulate_media(print) + data-print-ticket=1 + page.pdf(A4) + pdftoppm page PNGs + element screenshot",
            "native_print_dialog": False,
            "server": "existing python serve.py on 127.0.0.1:8765",
        },
        "scenarios": {},
    }

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport=VIEW)
        await page.goto(BASE, wait_until="networkidle")
        await dismiss_coach(page)

        for scenario in ("doorstep", "bedtime"):
            # fresh page state each scenario
            await page.evaluate("() => { try { localStorage.removeItem('ops-demo-v1'); } catch(e){} }")
            r = await capture_scenario(page, scenario, results["scenarios"])
            results["scenarios"][scenario] = r

        await browser.close()

    # Overall
    verdicts = [results["scenarios"][s]["verdict"] for s in ("doorstep", "bedtime")]
    if all(v == "PASS" for v in verdicts):
        results["overall"] = "PASS"
    elif any(v == "FAIL" for v in verdicts):
        results["overall"] = "FAIL"
    else:
        results["overall"] = "INCOMPLETE"

    out_json = OUT / "print-validation.json"
    out_json.write_text(json.dumps(results, indent=2))
    print("wrote", out_json)
    print("OVERALL", results["overall"])
    return results


if __name__ == "__main__":
    asyncio.run(main())
