# Conversations Workspace Design

## Design read

- **Surface:** Dense CRM master-detail inbox.
- **Audience:** Operators triaging leads and replying repeatedly under time pressure.
- **Primary job:** Select a conversation, understand its context, and prepare the next response.
- **Content risks:** Long identities, message bodies, tags, unread counts, and sparse contact fields.
- **Material:** Flat cool-neutral surfaces, precise separators, restrained radius, and one blue active marker.
- **Typography:** Existing application sans family; 12–14px utility text with compact line height.

## Desktop composition

After the product navigation, the workspace uses five functional columns:

1. 44px channel/tool rail.
2. 292–304px inbox list.
3. Flexible conversation thread, never narrower than its available grid space.
4. 300px contact details panel at desktop widths.
5. 36px contextual utility rail at wide desktop widths.

Each column owns its scrolling region. The page itself must not create horizontal scrolling.

## Reused primitives

- Existing app shell, sidebar, header, colors, type, and focus tokens.
- Local Avatar, Badge, Button, and Sheet components.
- Tabler icons exclusively, with native controls and accessible names.
- Native inputs, buttons, checkboxes, links, and disclosure controls.

## Interaction states

- Selected rows combine a blue edge, neutral fill, and `aria-current`.
- Inbox/contact tabs use text weight, border position, counts, and `aria-pressed`.
- Hover changes color only; geometry remains stable.
- Keyboard focus uses the shared visible ring.
- Star, notification, checkbox, and disclosure states remain visible without color alone.
- Unavailable tabs, delete, attachment, and send controls are disabled honestly.
- Empty search results preserve the inbox structure and provide recovery text.
- The composer retains drafts locally but never delivers messages in demo mode.

## Responsive recomposition

- **Wide desktop:** all five workspace columns.
- **Intermediate:** channel rail, inbox, and thread; contact details open in a sheet.
- **Mobile:** inbox first, then selected thread, with an explicit back control.
- The composer remains reachable in thread view and contact details remain reachable from the header.
- Compact actions collapse before contact identity or reply access is lost.

## Verification matrix

| Check | Target |
| --- | --- |
| Desktop hierarchy | 1562×785 screenshot against supplied reference |
| Intermediate layout | 1024×768 without page-level horizontal overflow |
| Mobile task flow | 390×844 list → thread → composer |
| Search and filters | Unread, All, Recent, Starred, and empty results |
| State controls | Selection, checkbox, star, contact tabs, disclosures |
| Keyboard | Logical order, visible focus, no traps |
| Automated checks | Focused Vitest, lint, format check, TypeScript |
| Manual-only scope | Screen reader, forced colors, and 200% zoom reported unverified if unavailable |

## Anti-default ruling

Compact icon controls belong because repeated triage actions need recognition at CRM density. No decorative elevation, ambient motion, remote imagery, fabricated customer claims, or mixed icon family is used.
