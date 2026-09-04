# Yohanansoltd UI/design-skills thread

- **X post:** https://x.com/Yohanansoltd/status/2094528147576234281
- **Author:** yohanan.sol (`@Yohanansoltd`)
- **Date:** 2026-08-31
- **Retrieval:** The X browser page was unavailable in this session, so the public FxTwitter endpoints were used: [post](https://api.fxtwitter.com/status/2094528147576234281) and [conversation/replies](https://api.fxtwitter.com/2/conversation/2094528147576234281).

## Author's recommendation

> “Before I build any website or mobile app. I tell Claude to pull every Emil kowalski ui skill and design system pattern. You would really avoid all those slop allegations”

This is the only substantive recommendation by the author in the retrieved conversation. The post is a single post, not a multi-post self-thread. The author later replies only “Solid workflow,” “You should,” “We should build something soon. Before u leave naij,” and similar conversational acknowledgements; no additional skill names or URLs are supplied by the author.

## Emil Kowalski skill set to pull

Source repository: https://github.com/emilkowalski/skills  
Install command recommended by the repository:

```bash
npx skills@latest add emilkowalski/skills
```

| Skill | What it covers | Direct source |
|---|---|---|
| `emil-design-eng` | Main design-engineering philosophy: UI polish, component craft, animation decisions, and invisible details. | https://github.com/emilkowalski/skills/blob/main/skills/emil-design-eng/SKILL.md |
| `animate` | Build motion from first principles: whether to animate, purpose, tool, properties, curve, duration, interruption, and exit. | https://github.com/emilkowalski/skills/blob/main/skills/animate/SKILL.md |
| `animate-expo` | React Native/Expo motion: gestures, sheets, haptics, screen transitions, and keeping motion off the JS thread. | https://github.com/emilkowalski/skills/blob/main/skills/animate-expo/SKILL.md |
| `review-animations` | Strict review of existing animation against Emil's standards. | https://github.com/emilkowalski/skills/blob/main/skills/review-animations/SKILL.md |
| `improve-animations` | Audit a codebase's animations and produce prioritized, executable plans. | https://github.com/emilkowalski/skills/blob/main/skills/improve-animations/SKILL.md |
| `find-animation-opportunities` | Find UI moments that genuinely benefit from motion, and identify what not to animate. | https://github.com/emilkowalski/skills/blob/main/skills/find-animation-opportunities/SKILL.md |
| `animation-vocabulary` | Translate vague motion descriptions into precise animation terms. | https://github.com/emilkowalski/skills/blob/main/skills/animation-vocabulary/SKILL.md |
| `apple-design` | Apple-inspired interface foundations, fluid/interruptible gestures, sheets, materials, typography, accessibility, and restraint. | https://github.com/emilkowalski/skills/blob/main/skills/apple-design/SKILL.md |
| `write-swift` | Modern Swift: value types, Swift 6 concurrency, generics, performance, and Swift Testing. | https://github.com/emilkowalski/skills/blob/main/skills/write-swift/SKILL.md |
| `pick-ui-library` | Choose one trusted library for a frontend task instead of hand-rolling or installing abandoned packages. | https://github.com/emilkowalski/skills/blob/main/skills/pick-ui-library/SKILL.md |
| `prototype` | Build genuinely different UI variants behind a live picker, in an isolated prototype surface. | https://github.com/emilkowalski/skills/blob/main/skills/prototype/SKILL.md |
| `ask-sonner` | Sonner setup, toast calls, promise/loading flows, styling, themes, positioning, and troubleshooting. | https://github.com/emilkowalski/skills/blob/main/skills/ask-sonner/SKILL.md |

## Frontend/UI instructions worth applying

### Agent workflow

1. Install/pull the complete skill repository before building UI; do not ask the agent to rely on generic taste.
2. For a UI task, identify the task first, check `package.json`, and select one trusted library when the curated list covers it. Do not present an unnecessary menu of alternatives.
3. Before adding motion, ask in order: **should this animate; what is its purpose; which tool; which properties; which easing/duration; how does it interrupt and exit?**
4. Use CSS for predetermined motion, WAAPI for programmatic motion with CSS-like performance, and springs for interruptible/gesture-driven motion. Do not install a motion library for a simple fade.
5. When exploring design directions, build multiple genuinely different variants in an isolated prototype, show one full-size variant at a time in realistic context, and integrate only the selected one.
6. When reviewing UI code, use a `Before | After | Why` Markdown table rather than a loose list.

### Motion/design rules

- Never animate something used dozens/hundreds of times per day; in particular, do not animate keyboard-initiated actions.
- Never start an entrance at `scale(0)`; use roughly `scale(0.9–0.95)` plus opacity.
- Animate `transform` and `opacity` rather than layout properties such as `height`, `width`, `margin`, or `padding`.
- Never use `ease-in` for UI entrances. Prefer a strong custom ease-out; use ease-in-out for on-screen movement and linear for constant motion.
- Keep ordinary UI motion under 300 ms: roughly 100–160 ms for press feedback, 125–200 ms for tooltips, 150–250 ms for dropdowns, and 200–500 ms for modals/drawers.
- Use subtle press feedback (`scale(0.95–0.98)`), correct `transform-origin` (popover from its trigger; modals can remain centered), and short 30–80 ms stagger delays where appropriate.
- Use springs for drag, momentum, decorative tracking, and interactions users may interrupt; preserve velocity and animate from the current presentation value.
- Use pointer capture for drags, protect against multi-touch jumps, apply friction/rubber-banding at boundaries, and project the resting position from release velocity.
- Respect `prefers-reduced-motion`; gate hover motion with `(hover: hover) and (pointer: fine)`.
- Test motion slowly/frame-by-frame and on real touch hardware.
- For typography, use size-specific tracking: tighten large display text; keep body text near zero tracking. Keep labels specific and navigation answer “where am I / where can I go / how do I get out?”

## Library/plugin names in the curated `pick-ui-library` skill

The repository calls these libraries out by task (they are recommendations from the skill, not additional X-post text):

- **UI/primitives:** `base-ui` (accessible dialogs/popovers/menus/selects), `cmdk` (command menus), **Sonner** (toasts), `input-otp`, `Leva`, `dialkit`.
- **Motion/visuals:** `motion` / Framer Motion, `NumberFlow`, `torph`, `Cobe`, `Satori`, `shiki`.
- **Charts:** `Liveline`, `recharts`.
- **Interaction/performance:** `dnd kit`, `Virtuoso`.
- **State/styling:** `zustand`, `clsx`, `cva`, `next-themes`.

Key URLs:

- base-ui — https://base-ui.com
- cmdk — https://cmdk.paco.me
- Sonner — https://sonner.emilkowal.ski
- input-otp — https://input-otp.rodz.dev
- motion — https://motion.dev
- NumberFlow — https://number-flow.barvian.me
- Cobe — https://cobe.vercel.app
- Satori — https://github.com/vercel/satori
- shiki — https://shiki.style
- Liveline — https://github.com/benjitaylor/liveline
- recharts — https://recharts.org
- dnd kit — https://dndkit.com
- Virtuoso — https://virtuoso.dev
- zustand — https://zustand.docs.pmnd.rs
- clsx — https://github.com/lukeed/clsx
- cva — https://cva.style
- next-themes — https://github.com/pacocoursey/next-themes

### Sonner-specific instructions

- Mount exactly one `<Toaster />` once near the app root; call `toast()` from client code.
- Use `toast.promise()` for promise-bound loading/success/error, or update a loading toast by reusing its `id`.
- Use `duration: Infinity` for persistence and `toast.dismiss(id)` to dismiss.
- Prefer defaults first, then inline styles/classes; use `toast.custom()` headless when a design system needs full control.
- Use `theme="system"` or the resolved theme; add `richColors` when success/error need semantic colors.

## URLs explicitly found in the source material

- Skills repository: https://github.com/emilkowalski/skills
- Skills directory/index: https://skills.sh/emilkowalski/skills
- Emil's skills newsletter: https://animations.dev/skills
- Emil's course: https://animations.dev/
- Agents with Taste: https://emilkowal.ski/ui/agents-with-taste
- Practical easing tips: https://emilkowal.ski/ui/7-practical-animation-tips#4.-choose-the-right-easing
- Easing references: https://easing.dev/ and https://easings.co/
- Sonner: https://sonner.emilkowal.ski
- X post: https://x.com/Yohanansoltd/status/2094528147576234281

## Conversation coverage and caveats

The public conversation endpoint returned the root post plus 34 direct replies. Relevant replies included:

- `@mohamedgshoaib`: suggested checking `@jakubkrehel` (a person, not a named skill).
- `@lundunbear`: mentioned “figmà” and “Mcpm.simple” (commenter text; not an author recommendation).
- `@_alphashark_`: mentioned **Sonner** and **vaul**, and advised reading source directly (commenter suggestion; `vaul` is Emil's drawer component: https://github.com/emilkowalski/vaul).
- `@olavlj`: linked https://x.com/olavlj/status/2094524951025914278 (commenter link).
- Several commenters asked for the exact prompt or a GitHub link; the author did not provide a further prompt or link in the retrieved replies.

The thread therefore supports the concise author instruction “have Claude pull the complete Emil Kowalski skills/design-system set.” The detailed skill names, install command, library names, URLs, and implementation rules above come from that referenced public repository and its skill files, not from extra author posts.
