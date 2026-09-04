#!/usr/bin/env python3
"""Capture adaptive-flow evidence: visible outcomes + action counts (corrections 003)."""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

ROOT = Path("/workspace/ops-concierge")
OUT = ROOT / "refs" / "evidence-003"
OUT.mkdir(parents=True, exist_ok=True)
BASE = "http://127.0.0.1:8765/"
VIEW = {"width": 1440, "height": 900}
MOBILE = {"width": 390, "height": 844}


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


async def wait_idle(page):
    for _ in range(80):
        thinking = await page.evaluate(
            """() => {
              const s = window.__OPS_GET_STATE && window.__OPS_GET_STATE();
              return s ? !!s.thinking : false;
            }"""
        )
        if not thinking:
            return
        await page.wait_for_timeout(250)


async def shot(page, name):
    path = OUT / name
    await page.screenshot(path=str(path), full_page=False)
    print("wrote", path, path.stat().st_size)


async def action_counts(page):
    return await page.evaluate(
        """() => {
          const s = window.__OPS_GET_STATE();
          const tools = (s.tools || []);
          const notify = tools.filter(t => t.name === 'notify.household' && t.status === 'ok').length;
          const task = tools.filter(t => t.name === 'task.open' && t.status === 'ok').length;
          const notifyErr = tools.filter(t => t.name === 'notify.household' && t.status === 'err').length;
          const taskErr = tools.filter(t => t.name === 'task.open' && t.status === 'err').length;
          return { notifyOk: notify, taskOk: task, notifyErr, taskErr, phase: s.phase,
            recipient: s.proposal && s.proposal.recipient && s.proposal.recipient.name,
            planId: s.proposal && s.proposal.planId,
            status: s.proposal && s.proposal.status,
            scenarioId: s.scenarioId,
            msgCount: (s.messages || []).length,
            toolCount: tools.length };
        }"""
    )


async def main():
    notes = []
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport=VIEW)
        await page.goto(BASE, wait_until="networkidle")
        await dismiss_coach(page)
        await page.reload(wait_until="networkidle")
        await dismiss_coach(page)
        await page.wait_for_timeout(300)

        # Fresh Start bedtime suggestion must INSPECT (not empty resume)
        await say(page, "Start bedtime")
        await wait_idle(page)
        st0 = await action_counts(page)
        print("fresh Start bedtime:", st0)
        assert st0["scenarioId"] == "bedtime"
        assert st0["phase"] in ("proposed", "inspecting")
        assert st0["planId"], "expected a proposal after inspect"
        assert st0["toolCount"] > 0, "expected inspection tools"
        notes.append("fresh Start bedtime inspected and proposed")
        await shot(page, "00-fresh-bedtime-inspect.png")

        # Reset and Doorstep
        await page.evaluate("() => { try { localStorage.removeItem('ops-demo-v1'); } catch(e){} }")
        await page.reload(wait_until="networkidle")
        await dismiss_coach(page)

        await page.click("#demoBtn")
        await wait_idle(page)
        await page.wait_for_timeout(600)
        phase = await page.evaluate("() => window.__OPS_GET_STATE().phase")
        print("after doorstep phase:", phase)
        await shot(page, "01-doorstep-proposed.png")

        # Refuse — no writes
        before = await action_counts(page)
        await say(page, "Don't make the guest code")
        await wait_idle(page)
        chat = await page.inner_text("#chat")
        st = await action_counts(page)
        print("after refuse:", st)
        assert "Don't make the guest code" in chat or "Don’t make the guest code" in chat
        assert st["phase"] == "refused"
        assert st["notifyOk"] == before["notifyOk"]
        assert st["taskOk"] == before["taskOk"]
        await shot(page, "02-refuse.png")

        # Fresh doorstep for replan + stale approve
        await page.evaluate("() => { try { localStorage.removeItem('ops-demo-v1'); } catch(e){} }")
        await page.click("#demoBtn")
        await wait_idle(page)
        await page.wait_for_timeout(500)
        plan0 = await page.evaluate("() => window.__OPS_GET_STATE().proposal.planId")
        await say(page, "The neighbour is unavailable")
        await wait_idle(page)
        st2 = await action_counts(page)
        print("after replan:", st2)
        assert st2["recipient"] == "Mira"
        plan_new = st2["planId"]
        assert plan_new != plan0
        await shot(page, "03-replan.png")

        # Approve superseded plan_ id must REJECT (no action calls)
        before_ap = await action_counts(page)
        await say(page, f"Approve {plan0}")
        await wait_idle(page)
        after_stale = await action_counts(page)
        chat_stale = await page.inner_text("#chat")
        print("after stale approve:", after_stale)
        assert after_stale["notifyOk"] == before_ap["notifyOk"]
        assert after_stale["taskOk"] == before_ap["taskOk"]
        assert "superseded" in chat_stale.lower() or "rejected" in chat_stale.lower() or "That plan" in chat_stale
        notes.append("stale Approve plan_N rejected with zero action calls")

        # Confirm whether — no writes
        await say(page, "Confirm whether Mira is available")
        await wait_idle(page)
        after_q = await action_counts(page)
        assert after_q["notifyOk"] == before_ap["notifyOk"]
        assert after_q["taskOk"] == before_ap["taskOk"]
        notes.append("Confirm whether… did not execute actions")

        # Current-plan explicit approval executes once
        await say(page, f"Approve {plan_new}")
        await wait_idle(page)
        await page.wait_for_timeout(800)
        st3 = await action_counts(page)
        print("after approve:", st3)
        assert st3["phase"] == "acted"
        assert st3["notifyOk"] >= 1 and st3["taskOk"] >= 1
        notify_after_first = st3["notifyOk"]
        task_after_first = st3["taskOk"]
        await shot(page, "04-approve.png")

        # Repeat approve — zero additional action calls
        await say(page, "approve")
        await wait_idle(page)
        st_rep = await action_counts(page)
        assert st_rep["notifyOk"] == notify_after_first
        assert st_rep["taskOk"] == task_after_first
        notes.append("repeat approve added zero action calls")

        # Reload preserves transcript + timeline
        msg_before = st_rep["msgCount"]
        tools_before = st_rep["toolCount"]
        await page.goto(BASE, wait_until="networkidle")
        await page.wait_for_timeout(500)
        st_reload = await action_counts(page)
        print("after reload:", st_reload)
        assert st_reload["scenarioId"] == "doorstep"
        assert st_reload["msgCount"] >= msg_before - 1  # welcome may or may not duplicate
        assert st_reload["toolCount"] == tools_before
        assert st_reload["phase"] == "acted"
        notes.append("reload restored tools/messages/plan")
        await shot(page, "04b-reload.png")

        # Switch stories both ways with usable proposals
        await say(page, "Try the other story")
        await wait_idle(page)
        sid = await page.evaluate("() => window.__OPS_GET_STATE().scenarioId")
        print("after other story:", sid)
        assert sid == "bedtime"
        bed = await action_counts(page)
        assert bed["planId"] or bed["toolCount"] > 0
        await say(page, "Try the other story")
        await wait_idle(page)
        sid2 = await page.evaluate("() => window.__OPS_GET_STATE().scenarioId")
        print("back:", sid2)
        assert sid2 == "doorstep"

        # Bedtime Mira unavailable changes plan
        await page.evaluate("() => { try { localStorage.removeItem('ops-demo-v1'); } catch(e){} }")
        await page.reload(wait_until="networkidle")
        await dismiss_coach(page)
        if await page.query_selector("#demoBtn2"):
            await page.click("#demoBtn2")
        else:
            await say(page, "Start bedtime")
        await wait_idle(page)
        await say(page, "Mira is unavailable")
        await wait_idle(page)
        bed2 = await action_counts(page)
        print("bedtime mira unavailable:", bed2)
        assert bed2["recipient"] != "Mira", "must not keep Mira as recipient while unavailable"
        notes.append("Bedtime Mira unavailable changed recipient")
        await shot(page, "03b-bedtime-mira-unavail.png")

        # Failure inject (force-fail hook — still assert no false success)
        await page.evaluate("() => { try { localStorage.removeItem('ops-demo-v1'); } catch(e){} }")
        await page.reload(wait_until="networkidle")
        await dismiss_coach(page)
        await page.click("#demoBtn")
        await wait_idle(page)
        await page.evaluate("() => { window.__OPS_SET_FORCE_FAIL(true); }")
        await say(page, "approve")
        await wait_idle(page)
        st4 = await action_counts(page)
        print("after fail inject:", st4)
        assert st4["phase"] == "failed"
        chat3 = await page.inner_text("#chat")
        assert "false success" in chat3.lower() or "no false success" in chat3.lower() or "Action failed" in chat3
        await shot(page, "05-failure.png")

        # Mobile + sim badge visibility
        page2 = await browser.new_page(viewport=MOBILE)
        await page2.goto(BASE, wait_until="networkidle")
        await dismiss_coach(page2)
        await page2.reload(wait_until="networkidle")
        badge = await page2.evaluate(
            """() => {
              const el = document.querySelector('.sim-badge');
              if (!el) return { present: false };
              const cs = getComputedStyle(el);
              return { present: true, display: cs.display, visibility: cs.visibility };
            }"""
        )
        print("mobile sim-badge:", badge)
        assert badge.get("present"), "sim-badge missing"
        assert badge.get("display") != "none", "sim-badge must stay visible below 900px"
        await shot(page2, "06-mobile-390.png")
        notes.append("sim-badge visible at 390x844")

        await browser.close()
        print("ALL UI CHECKS PASSED")
        for n in notes:
            print("NOTE:", n)


if __name__ == "__main__":
    asyncio.run(main())
