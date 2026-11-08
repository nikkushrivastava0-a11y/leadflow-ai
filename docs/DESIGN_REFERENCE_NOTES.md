# LeadFlow AI — visual direction and video references

Updated 2026-11-09, based on two video references the founder shared on November 8. These were explicitly shared BEFORE the first Agent Studio version; the initial repetitive six-card design did not reflect them.

## What the two references actually show

**Video 1: a2d68eacd27d40d19dc060f55adf0bbe.mp4**
- The creator argues code generation is not the same as design; do not invent UI without looking at references.
- Three named tools: **Mobbin MCP** for professional product UI references, **Watermelon UI** for ready-made components and **Impeccable** for design system refinements.
- These are recommendations to evaluate, not automatic installations and not proof that the three products are available in the user's environment.
- The video did **not** show a specific 3D website; 3D is a separate explicit founder preference.

**Video 2: e3faf055909b491e97c0669a3466d92e.mp4**
The source shows a practical website-launch checklist:
1. Custom 404 page
2. Unique title on every page
3. Meta description on every page
4. Social sharing preview image
5. Image alt text
6. Internal links
7. Sitemap in Search Console
8. robots.txt not blocking the site
9. HTTPS everywhere
10. Spam protection on form
11. Thank-you page after form
12. Google Analytics
13. Privacy policy
14. FAQ for visitors
15. Only real testimonials

These are quality checks, not claims that LeadFlow AI already passes them. In particular, the *public enquiry form* needs anti-spam and privacy treatment before a customer launch.

## Product design contract

**The founder dislikes layouts that visibly look template-generated.** Treat this as a hard requirement. Avoid: repetitious equal-sized role cards; a landing page full of large generic claims; monochrome green SaaS templates; decorative, invented KPIs; stock dashboard charts; gradients/glass everywhere; generic purple/blue glows; fake testimonials; features presented as live before implementation.

**Preferred visual direction for Agent Studio:**
- Editorial, intentional, slightly experimental product design grounded in actual work.
- Dark ink + warm off-white + a vivid true blue for the 3D work surface and one lime highlight for selected work. Minimal secondary colours.
- Real 3D **CSS perspective and physical depth** on a specific meaningful object: six operational divisions on an interactive table. This is not a randomly floating robot, orb, generic chatbot, or a still 3D image.
- Clicking a division selects the role and brings real responsibilities and assigned GitHub issues into focus. There must be a completely usable flat control alternative for keyboard and mobile.
- Use a quiet, deliberate motion system and honour prefers-reduced-motion.
- Avoid forcing identical card layouts. The agent selector, role details, GitHub tracker and milestones need distinct compositions.
- Truthful state: GitHub issue progress is real; autonomous AI workers are not running; revenue remains "not connected" until verified.
- 3D visual must not import costly 3D framework unnecessarily. Start with native CSS 3D, no extra JS rendering library or model fees.

## Implemented in PR #10

- Replaced repetitive six-card hero with dimensional interactive six-role work table.
- Replaced repeated agent cards with a single horizontal selection track and deep role detail area.
- Kept read-only GitHub issue sync and actual issue counts; no fake agent or revenue metrics.
- Added responsive alternatives and keyboard support, no client secrets or new dependencies.

**DO NOT** claim this design is fully visually validated until desktop and mobile screenshots, interaction and performance have been manually checked. Vercel build READY does not substitute for a visual QA pass.

## Next release review

1. Screenshot checks at 1440, 1024, 768 and 390 px; verify readable slab labels and stage geometry.
2. Keyboard tab/focus and role switching; check that the selected division and details update together.
3. Confirm task search, role filter, open/closed filter and issue links work, including empty and error states.
4. Check reduced motion, mobile touch target sizes, no clip/overflow and acceptable Core Web Vitals.
5. For public LeadFlow AI marketing pages apply the full 15-point checklist above.
6. Preserve actual app authentication, tenant RLS and payment safeguards. No design changes should mask backend launch blockers.

## Primary inspiration sources and verification

- https://github.com/Leonxlnx/taste-skill
- https://github.com/elayadesign/ai-design-skills/tree/main/skills/landing-page-design

Read the actual skills before future UI updates. Product references should be studied, not copied wholesale.
