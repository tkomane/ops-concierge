#!/usr/bin/env python3
"""Capture adaptive-flow evidence screenshots: refuse / replan / approve."""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

ROOT = Path("/workspace/ops-concierge")
OUT = ROOT / "refs" / "evidence-003"
OUT.mkdir(parents=True, exist_ok=True)
BASE = "http://127.0.0.1:8765/"
VIEW = {"width": 1440, "height": 900}


async def dismiss_coach(page):
    await page.evaluate(
        """() => {
          try { localStorage.setItem('ops-coach-dismissed', '1'); } catch (e) {}
          try { localStorage.removeItem('ops-demo-v1'); } catch (e) {}
          const b = document.getElementById('coachBanner');
          if (b) b.hidden = true;
        }"""
    )


async def say(page, text):
    await page.fill("#utter", text)
    await page.click("#sendBtn")
    await page.wait_for_timeout(400)


async def wait_idle_loop(page):
    for _ in range(60):
        thinking = await page.evaluate(
            """() => {
              const s = window.__OPS_GET_STATE && window.__OPS_GET_STATE();
              return s ? !!s.thinking : false;
            }"""
        )
        if not thinking:
            return
        await page.wait_for_timeout(250)


async def wait_idle(page):
    await wait_idle_loop(page)


async def shot(page, name):
    path = OUT / name
    await page.screenshot(path=str(path), full_page=False)
    print("wrote", path, path.stat().st_size)


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport=VIEW)
        await page.goto(BASE, wait_until="networkidle")
        await dismiss_coach(page)
        await page.reload(wait_until="networkidle")
        await dismiss_coach(page)
        await page.wait_for_timeout(300)

        # Start Doorstep — auto inspect + propose
        await page.click("#demoBtn")
        await wait_idle(page)
        await page.wait_for_timeout(600)
        phase = await page.evaluate("() => window.__OPS_GET_STATE().phase")
        print("after doorstep phase:", phase)
        await shot(page, "01-doorstep-proposed.png")

        # Refuse
        await say(page, "Don't make the guest code")
        await wait_idle(page)
        await page.wait_for_timeout(400)
        chat = await page.inner_text("#chat")
        st = await page.evaluate(
            """() => {
              const s = window.__OPS_GET_STATE();
              return { phase: s.phase, proposal: s.proposal && s.proposal.status, tools: s.tools.map(t => t.name+':'+t.status) };
            }"""
        )
        print("after refuse:", st)
        assert "Don't make the guest code" in chat or "Don’t make the guest code" in chat
        assert st["phase"] == "refused"
        assert "task.open" not in str(st["tools"])
        await shot(page, "02-refuse.png")

        # Fresh doorstep for replan path
        await page.evaluate("() => { try { localStorage.removeItem('ops-demo-v1'); } catch(e){} }")
        await page.click("#demoBtn")
        await wait_idle(page)
        await page.wait_for_timeout(500)
        await say(page, "The neighbour is unavailable")
        await wait_idle(page)
        await page.wait_for_timeout(500)
        st2 = await page.evaluate(
            """() => {
              const s = window.__OPS_GET_STATE();
              const p = s.proposal;
              return {
                phase: s.phase,
                recipient: p && p.recipient && p.recipient.name,
                action: p && p.action,
                timing: p && p.timing && p.timing.windowLabel,
                status: p && p.status,
                planId: p && p.planId
              };
            }"""
        )
        print("after replan:", st2)
        assert st2["recipient"] == "Mira"
        assert st2["action"] == "defer_handoff_parent"
        await shot(page, "03-replan.png")

        # Approve
        await say(page, "approve")
        await wait_idle(page)
        await page.wait_for_timeout(800)
        st3 = await page.evaluate(
            """() => {
              const s = window.__OPS_GET_STATE();
              return {
                phase: s.phase,
                status: s.proposal && s.proposal.status,
                tools: s.tools.filter(t => t.name === 'task.open' || t.name === 'notify.household').map(t => t.name+':'+t.status)
              };
            }"""
        )
        print("after approve:", st3)
        assert st3["phase"] == "acted"
        assert st3["status"] == "confirmed"
        await shot(page, "04-approve.png")

        # Idempotent approve
        await say(page, "approve")
        await wait_idle(page)
        chat2 = await page.inner_text("#chat")
        assert "no duplicate" in chat2.lower() or "Already approved" in chat2

        # Switch stories both ways
        await say(page, "Try the other story")
        await wait_idle(page)
        sid = await page.evaluate("() => window.__OPS_GET_STATE().scenarioId")
        print("after other story:", sid)
        assert sid == "bedtime"
        await say(page, "Try the other story")
        await wait_idle(page)
        sid2 = await page.evaluate("() => window.__OPS_GET_STATE().scenarioId")
        print("back:", sid2)
        assert sid2 == "doorstep"

        # Failure inject
        await page.evaluate("() => { window.__OPS_SET_FORCE_FAIL(true); }")
        await page.evaluate("() => { try { localStorage.removeItem('ops-demo-v1'); } catch(e){} }")
        await page.click("#demoBtn")
        await wait_idle(page)
        # clear force during inspect... actually force fails all tools including inspect
        await page.evaluate("() => { window.__OPS_SET_FORCE_FAIL(false); }")
        await page.click("#demoBtn")
        await wait_idle(page)
        await page.evaluate("() => { window.__OPS_SET_FORCE_FAIL(true); }")
        await say(page, "approve")
        await wait_idle(page)
        st4 = await page.evaluate(
            """() => {
              const s = window.__OPS_GET_STATE();
              return { phase: s.phase, status: s.proposal && s.proposal.status };
            }"""
        )
        print("after fail inject:", st4)
        assert st4["phase"] == "failed"
        chat3 = await page.inner_text("#chat")
        assert "false success" in chat3.lower() or "no false success" in chat3.lower() or "Action failed" in chat3
        await shot(page, "05-failure.png")

        await browser.close()
        print("ALL UI CHECKS PASSED")


if __name__ == "__main__":
    asyncio.run(main())
