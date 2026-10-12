---
argument-hint: [scope — optional]
description: Run a WCAG 2.2 Level AA accessibility audit, create tasks for real violations, and generate a Playwright regression test when the project supports it.
allowed-tools: Bash, Read, Write, Edit, Grep, Glob, Task
---

# WCAG Audit

Perform a comprehensive WCAG 2.2 Level AA accessibility audit. Phase 1 is static code analysis, where every concrete Critical, High, or Medium violation becomes one task. Phase 2 generates a real Playwright test file for ongoing runtime verification when the project already has Playwright configured.

Credit: adapted from `creativeprofit22/wcag-audit-command` under CC BY 4.0.
Source: https://github.com/creativeprofit22/wcag-audit-command

## Standard

Audit against WCAG 2.2, W3C Recommendation October 2023, ISO/IEC 40500:2025. WCAG 2.2 has 87 success criteria total and 56 at Levels A and AA. It adds 9 criteria over WCAG 2.1 and removes SC 4.1.1 Parsing.

Target WCAG 2.2 Level AA. Treat AAA items as recommendations only, not failures.

## Step 0: Determine scope

If `$ARGUMENTS` is provided, use it as the audit scope. Examples:

- `settings page`
- `auth flow`
- `app/admin/(dashboard)/inbox/`
- `components/`

If `$ARGUMENTS` is empty, infer scope from context in this order:

1. **Git diff**: run `git diff --name-only HEAD~1 HEAD` and `git status --short` to find recently changed UI files.
2. **Active plan**: inspect the most recently modified file in `.gg/plans/`.
3. **Session context**: use what was just discussed or implemented.
4. **Default UI directories**: audit existing UI directories such as `app/`, `components/`, `src/presentation/`, `src/components/`, or `ui/`.

If multiple unrelated UI surfaces exist and none are obviously in scope, ask the user which surface to audit. Do not blanket-audit a large monorepo without confirmation.

## Phase 1: Static analysis

Read the source files in scope and flag every WCAG violation visible in code without running the app. For every issue, capture:

- File and line, or file plus selector when line-imprecise
- WCAG success criterion number and name
- Severity
- Who is affected
- Concrete code-level fix

Only flag real, verifiable violations. Do not flag speculative concerns, style preferences unrelated to a specific criterion, or SC 4.1.1 Parsing, which was removed in WCAG 2.2.

### 1. Perceivable, WCAG Principle 1

- **1.1.1 Non-text Content**: Images, SVGs, icons, canvas elements have meaningful `alt`, or `alt=""` / `aria-hidden="true"` when decorative.
- **1.3.1 Info and Relationships**: Semantic HTML is used correctly. Form inputs have associated labels. Tables use `th` and scope. Heading hierarchy is logical.
- **1.3.2 Meaningful Sequence**: DOM order matches visual order. CSS does not create a reading order that contradicts source order.
- **1.3.3 Sensory Characteristics**: Instructions do not rely only on shape, colour, size, or position.
- **1.3.4 Orientation**: Content does not restrict to a single orientation.
- **1.3.5 Identify Input Purpose**: Inputs use appropriate `autocomplete` attributes.
- **1.4.1 Use of Color**: Colour is not the sole means of conveying information.
- **1.4.3 Contrast Minimum**: Text has at least 4.5:1 contrast, or 3:1 for large text. Check foreground/background combinations in CSS where possible.
- **1.4.4 Resize Text**: Text resizes to 200 percent without content loss. Watch for `max-height` plus `overflow: hidden` on text containers.
- **1.4.5 Images of Text**: Text is not rendered as images except logos.
- **1.4.10 Reflow**: Content reflows at 320px width / 256px height without horizontal scrolling.
- **1.4.11 Non-text Contrast**: UI components and graphical objects have at least 3:1 contrast against adjacent colours.
- **1.4.12 Text Spacing**: No content loss with line-height 1.5x, paragraph spacing 2x, letter spacing 0.12em, and word spacing 0.16em.
- **1.4.13 Content on Hover or Focus**: Tooltips and popovers are dismissible, hoverable, and persistent.

### 2. Operable, WCAG Principle 2

- **2.1.1 Keyboard**: All functionality is keyboard-accessible. Custom widgets have proper key handlers.
- **2.1.2 No Keyboard Trap**: Focus can always be moved away using standard keys.
- **2.4.1 Bypass Blocks**: Skip links or landmark regions exist.
- **2.4.2 Page Titled**: Pages have descriptive titles.
- **2.4.3 Focus Order**: Tab order is logical and matches visual layout. No positive `tabindex`.
- **2.4.4 Link Purpose**: Links have descriptive text. Avoid bare “click here” or “read more” without context.
- **2.4.6 Headings and Labels**: Headings and labels describe their topic or purpose.
- **2.4.7 Focus Visible**: Interactive elements have visible focus indicators. `outline: none` must have a replacement.
- **2.4.11 Focus Not Obscured Minimum, WCAG 2.2 AA**: Focused elements are not entirely hidden by sticky headers, footers, modals, or overlapping content.
- **2.5.1 Pointer Gestures**: Multipoint or path gestures have single-pointer alternatives.
- **2.5.2 Pointer Cancellation**: Down-events do not trigger actions. Prefer `click` or equivalent release actions, not `mousedown` / `pointerdown` for irreversible actions.
- **2.5.3 Label in Name**: Visible labels match accessible names. `aria-label` includes visible text.
- **2.5.4 Motion Actuation**: Motion-triggered actions have UI alternatives and can be disabled.
- **2.5.7 Dragging Movements, WCAG 2.2 AA**: Drag-and-drop has a single-pointer alternative such as move buttons or click-to-place.
- **2.5.8 Target Size Minimum, WCAG 2.2 AA**: Interactive targets are at least 24 by 24 CSS pixels or have sufficient spacing. Consider allowed exceptions for inline links, user-agent defaults, and legally required layouts.

### 3. Understandable, WCAG Principle 3

- **3.1.1 Language of Page**: `html` has a `lang` attribute.
- **3.1.2 Language of Parts**: Different-language content has `lang` on the containing element.
- **3.2.1 On Focus**: Focus alone does not trigger context changes.
- **3.2.2 On Input**: Input changes do not auto-change context without warning.
- **3.2.6 Consistent Help, WCAG 2.2 A**: If help mechanisms exist across pages, they appear in the same relative order.
- **3.3.1 Error Identification**: Form errors are identified in text, not only colour.
- **3.3.2 Labels or Instructions**: Form inputs have labels or instructions.
- **3.3.3 Error Suggestion**: Errors include suggestions for correction where possible.
- **3.3.4 Error Prevention Legal, Financial, Data**: Submissions are reversible, verified, or confirmed where required.
- **3.3.7 Redundant Entry, WCAG 2.2 A**: Information already entered in the session is auto-populated or available for selection in multi-step flows.
- **3.3.8 Accessible Authentication Minimum, WCAG 2.2 AA**: Authentication does not require cognitive function tests unless an acceptable alternative or exception exists.

### 4. Robust, WCAG Principle 4

- **4.1.2 Name, Role, Value**: Custom widgets have proper ARIA roles, states, and properties. Interactive elements have accessible names. Dynamic content uses appropriate ARIA.
- **4.1.3 Status Messages**: Status messages use `role="status"`, `role="alert"`, or `aria-live` so screen readers announce updates without moving focus.

### 5. Enhanced, Level AAA recommendations only

- **2.4.12 Focus Not Obscured Enhanced**: Focused element is entirely visible.
- **2.4.13 Focus Appearance**: Focus indicator is at least 2px thick and has at least 3:1 contrast between focused and unfocused states.
- **3.3.9 Accessible Authentication Enhanced**: Authentication avoids cognitive function tests with no exceptions.

## Step F1: Classify findings

For each violation found, record:

- **WHERE**: `file:line`, or `file` plus selector if line-imprecise.
- **CRITERION**: SC number and name.
- **WHAT**: Plain-English violation.
- **WHO**: Affected users, such as screen reader users, keyboard-only users, low-vision users, or motor-impaired users.
- **FIX**: Concrete code-level fix with exact attributes, roles, classes, selectors, or contrast values where possible.

Severity:

- **Critical**: Level A failure that blocks a task entirely, such as an unlabeled form input or non-keyboard-accessible critical control.
- **High**: Level AA failure that creates significant difficulty, such as insufficient contrast, missing focus indicator, drag with no alternative, or undersized target.
- **Medium**: Partial AA failure or edge-case failure, such as non-critical missing autocomplete or minor text-spacing clipping.
- **Low**: AAA recommendation or non-blocking accessibility polish.

## Step F2: Create tasks

For every Critical, High, and Medium violation, add one task to the task pane using the task tool. One task per violation.

Do not auto-create tasks for Low / AAA recommendations. List them inline in the final report under Recommendations and ask the user which ones to convert.

Each task must be self-contained so a separate worker can fix it with no extra context. Include:

- Severity label
- SC criterion number and name
- Exact file and line, or file plus selector
- Plain-English description
- Concrete code-level fix
- Affected user group
- Related files to read first, such as design tokens, theme files, shared components, or page layouts

Task order: Critical first, then High, then Medium.

If a violation is too ambiguous to fix concretely, do not create a task. Mark it Skipped with the reason.

## Phase 2: Generate Playwright test file

After Phase 1 tasks are created, generate `tests/wcag-audit.spec.ts` for ongoing runtime verification. This file is a real test artifact, not a report.

Before writing:

1. Read the project’s existing Playwright config.
2. Read any existing tests in `tests/`, `e2e/`, or equivalent Playwright directories.
3. Match import style, fixtures, base URL, route navigation, and conventions.
4. If the project is Electron, use the project’s Electron test pattern.
5. If no Playwright setup exists, skip Phase 2 and note it in the final report. Do not install Playwright unless the user explicitly asks.
6. If `tests/wcag-audit.spec.ts` already exists, read it before editing.

The generated test should cover scoped routes or pages relevant to the audit, not arbitrary pages. If the route cannot be inferred from the scope, include a small route list at the top of the file that the user can update, and mention that in the report.

### Required test categories

Group tests with `test.describe()` blocks by WCAG principle. Mark WCAG 2.2 criteria with `// WCAG 2.2 NEW` comments.

Include runtime checks for:

- Keyboard navigation and keyboard trap detection: SC 2.1.1, 2.1.2, 2.4.3.
- Focus visibility and focus obscurement: SC 2.4.7, 2.4.11.
- Target size: SC 2.5.8.
- Colour contrast where computable: SC 1.4.3, 1.4.11.
- Drag alternatives: SC 2.5.7.
- Hover and focus content behaviour: SC 1.4.13.
- ARIA names, roles, values, and live regions: SC 4.1.2, 4.1.3.
- Page structure: SC 3.1.1, 2.4.2, 2.4.1.
- Reflow at 320px: SC 1.4.10.
- Text spacing: SC 1.4.12.

Tests should produce actionable failure messages that identify the element or route. Avoid brittle assertions where the app legitimately may not include that feature, such as requiring a live region on a static page. Prefer checks that validate any matching elements when present and fail only on actual violations.

## Step P1: Final report

Reply inline with this structure:

- Audited: `<scope>`
- Files scanned: `<N>`
- Violations found: `<N>` with Critical, High, Medium, and Low counts
- Tasks created: `<N>` for Critical, High, and Medium violations
- Recommendations: `<N>` Low / AAA items listed below
- Playwright test file: `tests/wcag-audit.spec.ts`, or skipped with reason
- Skipped: `<N>`

Then list one line per task:

- `[Critical] [SC 1.1.1] file:line — one sentence description`
- `[High] [SC 2.4.7] file:line — one sentence description`
- `[Medium] [SC 1.4.12] file:line — one sentence description`

Then list any Low / AAA recommendations awaiting decision.

Then list any skipped items with reasons.

End by asking: “Convert any Recommendations into tasks? List the SC numbers or say none.”

If a Playwright file was generated, include the run command: `npx playwright test tests/wcag-audit.spec.ts`.

## Rules

- Only flag real, verifiable violations.
- Generate the Playwright test file even when static analysis found zero issues, if the project already has Playwright configured.
- Compute contrast ratios from actual CSS values where possible. Do not guess.
- WCAG criteria are technology-agnostic. Apply them to web, Electron, and desktop UIs with the project’s existing runtime test conventions.
- Mark WCAG 2.2 new criteria clearly in tasks and in the test file.
- Match the project’s existing Playwright config and test conventions before generating tests.
- Preserve project conventions and local slash-command style.
- Attribution must remain in this command file because the upstream command is CC BY 4.0.
