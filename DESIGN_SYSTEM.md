# FreelanceReach Design System

**Status:** Product direction and implementation reference  
**Scope:** Authenticated FreelanceReach web app  
**Visual direction:** Premium, Linear-inspired dark SaaS for focused freelance client acquisition

This document translates the supplied Inspo MCP research report into a practical visual system for the existing FreelanceReach frontend. It defines design intent and screen behavior; it does not prescribe changes to the app architecture, APIs, or dependencies. Treat the tokens below as the source of truth for future interface work.

## 1. Product and implementation context

### Current frontend

- React app bootstrapped with Vite, routed with React Router, and wrapped in an existing authentication context and protected app shell.
- The authenticated shell currently lives in `client/src/components/AppShell.jsx`; it has a fixed desktop sidebar, top bar, mobile drawer, account controls, and an `Outlet` for page content.
- Existing routed pages include Dashboard, Leads, Discovery, Website Analysis, Email Drafts, Gmail, and Settings. Settings currently routes to the Gmail settings page. The `PlannedPage` component exists for forthcoming areas.
- Shared global styles are in `client/src/index.css`; page-specific styles are currently in `client/src/App.css`. The global stylesheet imports Tailwind CSS 4, while much of the current interface uses existing custom CSS.
- Keep current routing, authentication, API behavior, component organization, and CSS setup intact when implementing future design work. This document is a design target, not a request to migrate styling approaches.

### Installed versions verified in `client`

| Package | Installed version | Manifest range |
| --- | ---: | ---: |
| React | 19.3.1 | `^19.3.1` |
| Vite | 8.3.7 | `^8.3.6` |
| Tailwind CSS | 4.3.5 | `^4.3.5` |
| Recharts | 3.10.1 | `^3.10.1` |
| lucide-react | 1.70.0 | `^1.70.0` |

These versions are an environment snapshot. Recheck the lockfile and installed packages before relying on version-sensitive APIs.

## 2. Design principles

1. **Calm precision:** Use a restrained dark canvas, clear hierarchy, and quiet dividers. Reserve bright color for actions, selection, and meaningful data changes.
2. **Work before decoration:** Every panel should help a freelancer find, assess, or contact a prospective client.
3. **Scannable density:** Keep tables and analytics information-rich but readable. Favor alignment, grouping, and progressive disclosure over tiny type.
4. **Consistent interaction:** Reuse the same visual language for navigation, filters, statuses, forms, dialogs, and empty states across screens.
5. **Responsive by intent:** Preserve primary tasks at all widths; reflow, simplify, and use a drawer where the desktop shell no longer fits.
6. **Accessible contrast and state:** Never communicate status by color alone. Include text or icons, visible focus, keyboard-operable controls, and reduced-motion support.

## 3. Color tokens

The palette adapts the supplied Linear reference and the report's recommendation. Use semantic token names in UI code and avoid introducing one-off near-duplicates.

| Token | Value | Use |
| --- | --- | --- |
| `canvas` | `#0A0A0A` | Application background and page gutters |
| `surface` | `#191A1B` | Cards, sidebar, menus, and primary raised regions |
| `surface-elevated` | `#282828` | Hovered controls, popovers, selected rows, and nested panels |
| `surface-sunken` | `#111213` | Inputs, table headers, inset chart plotting regions |
| `line` | `#37393A` | Strong borders, focused divisions, selected outlines |
| `line-subtle` | `#202122` | Card borders, row separators, and quiet dividers |
| `line-overlay` | `#FFFFFF0D` | Delicate overlay edge where a solid line feels heavy |
| `text-primary` | `#F7F8F8` | Headings, important values, and primary labels |
| `text-secondary` | `#D0D6E0` | Body copy and supporting labels |
| `text-tertiary` | `#8A8F98` | Metadata, placeholders, and secondary navigation |
| `text-muted` | `#62666D` | Disabled or low-priority information; do not use for essential text |
| `accent` | `#7170FF` | Primary actions, active navigation, links, and chart series |
| `accent-hover` | `#828FFF` | Hover state for accent controls |
| `accent-tint` | `#18182F` | Selected backgrounds, focus halos, and subtle callouts |
| `success` | `#04D494` | Completed, healthy, won, or positive movement |
| `warning` | `#FABC20` | Needs attention, pending, or caution |
| `danger` | `#FC667F` | Destructive, failed, or blocked states |
| `info` | `#52A8FF` | Informational states and secondary chart series |

### Color behavior

- Keep the majority of each screen in `canvas`, `surface`, and neutral text. Use accent as an interaction signal, not as a large decorative wash.
- Primary button: `accent` fill with a high-contrast label; hover uses `accent-hover`; disabled uses muted surface/text and no hover lift.
- Keyboard focus: visible 2px `accent` outline with 2px offset. Do not rely on shadow alone.
- Status pills use a low-opacity semantic tint, semantic text, and a 1px semantic border. Always show a readable status label.
- Charts use accent for the primary series; assign additional series from `info`, `success`, `warning`, and neutral grays. Ensure comparable contrast in legends, tooltips, and line styles.
- Preserve the chosen dark mode consistently throughout the authenticated workspace. A future light theme is outside the current screen specifications.

## 4. Typography

### Font family

- **Primary:** Inter Variable, with `Inter`, system UI, and sans-serif fallbacks.
- **Numeric:** Use tabular numerals for KPIs, counts, dates where aligned, and table columns. A monospace fallback may be used sparingly for IDs or technical identifiers only.
- Avoid mixing display serif typography into the product UI; maintain a crisp, grotesk-sans voice.

### Type ramp

| Style | Size / line height | Weight | Typical use |
| --- | --- | ---: | --- |
| Display | 36px / 40px | 600–680 | Dashboard welcome or key screen title, desktop only |
| H1 | 28px / 34px | 600 | Screen title |
| H2 | 20px / 28px | 600 | Major card and section title |
| H3 | 16px / 24px | 600 | Subsection title and dialog heading |
| Body | 14px / 22px | 400 | Default interface copy |
| Body small | 13px / 20px | 400 | Dense table content and supporting instructions |
| Label | 12px / 16px | 500 | Field labels, metadata, table headers |
| Micro | 11px / 14px | 500 | Compact captions and timestamps; use sparingly |
| KPI | 32–40px / 1.1 | 600–680 | Prominent metric values |

Use slight negative tracking for larger headings (`-0.02em`) and restrained tracking for all caps labels (`0.08–0.12em`). Do not use all caps for long labels or body content.

## 5. Spacing, sizing, and layout

### Spacing scale

Use a 4px base grid. The preferred scale is `4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128px`.

| Token | Value | Common use |
| --- | ---: | --- |
| `space-1` | 4px | Icon-to-label micro-gap |
| `space-2` | 8px | Compact control padding and inline gaps |
| `space-3` | 12px | Dense row and input padding |
| `space-4` | 16px | Default component gap and card padding minimum |
| `space-5` | 20px | Standard card padding |
| `space-6` | 24px | Section/card spacing |
| `space-8` | 32px | Major layout gap and page header separation |
| `space-10` | 40px | Desktop page inset |
| `space-12` | 48px | Larger section separation |
| `space-16` | 64px | Major page grouping |

### Shell dimensions

- Maximum content width: **1440px**. At wider viewport sizes, center the page content within the available main column.
- Desktop sidebar: **224px** expanded, collapsible to a **64px** icon rail where useful.
- Top bar: **56–64px** high, with a subtle lower divider.
- Main content inset: **32–40px** on large screens, **24px** at medium sizes, **16px** on small screens.
- Dashboard grid gaps: **16–24px**. Use a bento composition with varied panel widths, but keep consistent card padding.
- Table row height: **48–56px** for standard rows; allow taller rows when secondary details wrap.

## 6. Breakpoints and responsive behavior

| Range | Layout behavior |
| --- | --- |
| `< 640px` — small | Single-column content; off-canvas navigation drawer; compact top bar; cards stack; KPI grid may use two columns; tables switch to a clear card/list presentation or retain horizontal scroll with a visible affordance. |
| `640–767px` — large phone | Two-column KPI grid where labels fit; forms remain one column; toolbars wrap into a second row; drawer remains available. |
| `768–1023px` — tablet | Collapsible 64px navigation rail or drawer; dashboard uses two columns where space permits; filters can wrap; charts retain useful minimum height. |
| `1024–1279px` — desktop | Expanded 224px sidebar; two-column dashboard grid; standard table density. |
| `1280px+` — wide | Expanded sidebar; content capped at 1440px; richer 3–4 column KPI/bento layouts. |

Navigation behavior should follow the existing app shell's responsive drawer pattern. On small screens, drawer open state must trap focus appropriately, close on Escape and route selection, and provide a labeled close control. Avoid forcing desktop-only hover interactions onto touch screens.

## 7. Radii, borders, and shadows

### Radius scale

| Token | Value | Use |
| --- | ---: | --- |
| `radius-none` | 0px | Data grid edges only when needed |
| `radius-xs` | 2px | Tiny status markers |
| `radius-sm` | 4px | Compact controls and tags |
| `radius-md` | 6px | Inputs and buttons |
| `radius-lg` | 8px | Cards and standard dialogs |
| `radius-xl` | 12px | Large panels and prominent overlays |
| `radius-pill` | 9999px | Pills, avatars, and circular controls |

### Elevation

Prefer borders over heavy shadows in the default dark canvas. Use shadow to communicate overlay elevation:

- `shadow-low`: `0 2px 4px rgb(0 0 0 / 0.10)`
- `shadow-card`: `0 4px 16px rgb(0 0 0 / 0.16)`
- `shadow-overlay`: `0 7px 32px rgb(0 0 0 / 0.35)`

Cards use `surface` plus `line-subtle`; hover may move to `surface-elevated` or strengthen the border. Avoid stacking multiple strong shadows.

## 8. Iconography and charts

- **Icons:** Lucide React, typically 16px for inline metadata, 18px for navigation and controls, and 20px for major actions. Use consistent 1.75–2px stroke weight.
- Give icon-only buttons accessible names and tooltips when their meaning is not obvious from context.
- **Charts:** Recharts, already present in the stack. Prefer simple line/area, bar, and funnel visualizations with clear axes and useful tooltips.
- Chart gridlines use `line-subtle`; axis labels use `text-tertiary`; primary series uses `accent`. Avoid unnecessary gradients, 3D effects, or excessive series.
- Include a textual summary or data table alternative for important chart conclusions. Tooltips must be keyboard and touch accessible where the chart interaction permits.

## 9. Reusable component specifications

### App shell and navigation

- Persistent desktop sidebar with product mark, workspace switcher, grouped navigation, settings, and account/logout area.
- Active route uses an accent-tinted background, primary label, and restrained accent indicator. Inactive links use tertiary text and gain contrast on hover.
- Use short, familiar labels. Align navigation icons and text consistently; maintain at least a 40px target height.
- Top bar contains route context/breadcrumbs, optional page utilities, workspace state, and account affordance. Avoid repeating the full page title in multiple locations.

### Page heading

- Include one H1, a concise supporting sentence when useful, and a primary action aligned to the end on desktop.
- On narrow screens, stack action below heading or place it as a full-width action when it is the page's main task.
- Use overlines only for short grouping context; do not add decorative eyebrow labels to every panel.

### Cards and bento panels

- Default card: `surface`, 1px `line-subtle`, 8px radius, 20–24px padding.
- Panel header aligns title/description with an optional action. Keep heading and content separation around 16px.
- Bento layouts may vary column span to emphasize a key chart or workflow, but preserve a clear reading order on mobile.

### KPI cards

- Show one metric, a concise label, optional trend/context, and an optional small chart.
- Use 32–40px tabular-number values; semantic trend color plus text or direction icon.
- Desktop: 3–4 columns depending on content width. Tablet/mobile: 2 columns when readable; stack on very narrow screens.
- Keep metric time ranges explicit and consistent across the row.

### Tables and filters

- Use a quiet, sticky header when a table scrolls; right-align numeric data; left-align names and descriptions.
- Separate rows with `line-subtle`. Hover and selected states use `surface-elevated` and an additional non-color cue.
- Keep key columns visible on mobile; move secondary fields into row details or a detail drawer. Provide search, filters, sort state, pagination, loading, empty, and error feedback.
- Filter chips and selectors must show selected state and remain operable by keyboard.

### Buttons and controls

- Primary: accent fill, high-contrast text, 6px radius, 40px minimum height, 14px/500 label.
- Secondary: surface or transparent fill, subtle border, secondary text; hover uses elevated surface.
- Destructive: danger label/outline or semantic fill reserved for confirmed destructive actions.
- Icon button: 36–40px hit area, visible hover/focus, accessible name.
- Inputs: sunken surface, subtle border, 40–44px height, clear label, placeholder in tertiary text, accent focus outline. Inline validation uses semantic text and a linked error description.

### Status, feedback, and overlays

- Status badge: short text plus semantic tint/border; never rely on color alone.
- Toasts/alerts: concise, actionable, dismissible when appropriate, with correct live-region semantics.
- Dialogs: clear title, explanation, primary/secondary actions, Escape handling, focus containment, and return focus to the trigger.
- Loading: use stable skeletons for page structure and a labeled inline progress indicator for local actions. Avoid layout shifts.
- Empty states: explain what belongs here and offer one next action. Error states: explain what failed in plain language and offer retry where appropriate.

### Motion

- Use short 150–220ms transitions for hover/focus and 250–350ms for panel entrances.
- Keep movement subtle; avoid animated row bounce or continuous decoration in data-heavy screens.
- Respect `prefers-reduced-motion` and provide state changes that remain clear without animation.

## 10. Screen specifications

These specifications describe the intended product destinations. Several requested sections do not yet have dedicated routes or real data models in the current frontend; they should be designed and implemented only when product behavior and data are available. Do not imply that a future section is already functional.

### 10.1 Dashboard

**Purpose:** Give the freelancer a quick, actionable picture of their client pipeline and next steps.

**Structure:**

1. Page heading with a personalized welcome, time period selector if metrics support it, and a high-value action such as “Add lead.”
2. KPI row: total active leads, outreach sent, replies, and clients won. Show comparison period only when data supports it.
3. Primary bento row: pipeline/funnel summary or outreach activity chart beside a compact “Needs attention” panel.
4. Recent leads table/list with name, company, stage, last activity, and a direct link to the full Leads view.
5. Optional recent activity feed or onboarding checklist, only when backed by actual account state.

**Responsive:** Four KPI columns on wide desktop, two columns on tablet/mobile. Stack chart and attention panels on narrow screens. Recent leads become compact cards or a scrollable table with primary fields preserved.

**Data states:** Loading skeletons match the final grid. Empty state guides the user to add or discover a lead. Errors preserve retry and avoid replacing the whole shell.

### 10.2 Leads

**Purpose:** Organize prospects and make the next follow-up obvious.

**Structure:**

1. Page heading, lead count, and primary “Add lead” action.
2. Search and filters for status, priority, source/category, and location when those fields exist. Include a clear-filters affordance.
3. Optional status summary or compact pipeline tabs, not a second competing navigation system.
4. Main list/table: business/person name, category/location, contact method, status, priority, and last-updated/activity context.
5. Row actions in a menu; selecting a lead opens a detail panel or existing detail interaction. Add/edit forms use labeled, grouped fields and clear save/cancel controls.

**Responsive:** Desktop uses a sortable table. On mobile, show name, status, location, and one primary action in each row card; place secondary fields in details. Search and filters wrap or open in a filter drawer.

**States and safeguards:** Include loading, no leads, no filter matches, validation, save failure, pagination, and delete confirmation states. Respect do-not-contact flags prominently and do not make outreach actions available for blocked leads.

### 10.3 Email Campaigns

**Purpose:** Create, review, and monitor intentional outreach sequences.

**Current scope note:** The existing frontend has Email Drafts and Gmail routes, not a full campaign model. This screen is a future product specification; align with existing draft/send safeguards until campaign behavior is defined.

**Structure:**

1. Page heading with “Create campaign” when creation is supported.
2. Summary metrics: draft campaigns, scheduled, sent, reply rate—only when the underlying system can calculate them.
3. Campaign list with name, audience/lead segment, status, schedule, sent count, and reply metric.
4. Campaign detail/editor with a sequence timeline, message editor, personalization preview, audience review, and a clear sending/scheduling confirmation.
5. Sending status and per-step delivery outcomes; make paused, failed, and completed states distinguishable.

**Responsive:** Campaign list becomes stacked rows; editor becomes a single-column flow with a sticky action bar only when it does not cover content.

**Safety and clarity:** Show recipient count, sender identity, schedule/time zone, and a final review before sending. Exclude do-not-contact leads and clearly distinguish saved drafts from queued or sent messages.

### 10.4 AI Assistant

**Purpose:** Help prepare relevant research and outreach while keeping the freelancer in control.

**Current scope note:** There is no dedicated AI Assistant route in the current app. Treat this as a future screen requiring defined AI capabilities and data handling.

**Structure:**

1. Assistant workspace with conversation/history column and a focused task area.
2. Suggested tasks such as summarize a prospect, identify a personalization angle, or draft an email, clearly labeled as suggestions.
3. Lead context panel showing the source fields used for an answer and linking to the lead record.
4. Draft preview with inline editing and actions to copy or save to existing drafts.
5. Clear generation, retry, empty, and error states.

**Responsive:** Collapse history and context into accessible drawers/accordions. Keep the prompt/editor and generated result as the primary reading sequence.

**Trust cues:** Distinguish sourced facts from generated suggestions. Let the user review and edit before any external action; do not imply messages were sent automatically.

### 10.5 Analytics

**Purpose:** Show how prospecting and follow-up translate into conversations and clients.

**Current scope note:** The current UI includes a Website Analysis page, but not a dedicated business analytics destination. Build this view only when event definitions and historical data are reliable.

**Structure:**

1. Page heading with date range and comparison period controls.
2. KPI row: leads added, contact rate, reply rate, conversion to client, and time-to-response where measurable.
3. Outreach activity trend using a Recharts line/area chart.
4. Pipeline conversion funnel or stage distribution.
5. Breakdown by source, category, or campaign only where sample sizes and attribution support a fair comparison.

**Responsive:** Charts stack; legends move above/below plots; axes simplify without hiding units. Provide data summaries and tabular alternatives for critical comparisons.

**Integrity:** Define each metric and denominator in help text. Display empty/insufficient-data states rather than zero or misleading percentages. Keep timezone and date range visible.

### 10.6 Settings

**Purpose:** Manage profile, workspace preferences, integrations, and account access.

**Current scope note:** `/settings` currently resolves to the Gmail settings page. Preserve that behavior until settings sections are deliberately designed and routed.

**Structure:**

1. Settings heading and secondary section navigation.
2. Profile: name, email, profile completion if supported.
3. Workspace: workspace name and locale/timezone preferences when supported.
4. Integrations: Gmail connection state, permissions context, connect/disconnect actions.
5. Notifications/preferences and account/security sections only when corresponding behavior exists.

**Responsive:** Use a compact tab/select navigation for settings sections on mobile. Keep save state and unsaved-change feedback visible.

**Interaction:** Group related controls into cards, label fields, explain sensitive actions, and confirm disconnect or account-level destructive changes.

## 11. Tailwind CSS 4 token mapping reference

The values below are a reference for a future implementation in the existing Tailwind CSS 4 setup. This code is illustrative only and does not require replacing current CSS or introducing a configuration file.

```css
@theme {
  --color-canvas: #0a0a0a;
  --color-surface: #191a1b;
  --color-surface-elevated: #282828;
  --color-surface-sunken: #111213;
  --color-line: #37393a;
  --color-line-subtle: #202122;
  --color-text-primary: #f7f8f8;
  --color-text-secondary: #d0d6e0;
  --color-text-tertiary: #8a8f98;
  --color-text-muted: #62666d;
  --color-accent: #7170ff;
  --color-accent-hover: #828fff;
  --color-accent-tint: #18182f;
  --color-success: #04d494;
  --color-warning: #fabc20;
  --color-danger: #fc667f;
  --radius-control: 6px;
  --radius-card: 8px;
  --radius-panel: 12px;
}
```

## 12. Source and research notes

The supplied Inspo MCP report compared Linear, Dovetail, Amie, and Trello, surveyed modern SaaS screen references, and retrieved reference navigation and KPI components. Its strongest fit for FreelanceReach is Linear's dark, sidebar-driven product language, supported by Dovetail's data-oriented visual treatment. The report notes that the archive primarily contains public marketing captures rather than authenticated CRM screens; this system therefore applies the extracted design conventions to FreelanceReach's real workflows instead of treating those captures as exact product templates.

**Reference palette anchors:** Linear-inspired `#0A0A0A`, `#191A1B`, `#282828`, `#7170FF`; semantic tones `#04D494`, `#FABC20`, `#FC667F`.  
**Reference layout anchors:** 1440px maximum content width, 224px desktop sidebar, bento/grid dashboard, responsive off-canvas mobile navigation.  
**Reference stack:** React, Vite, Tailwind CSS 4, Recharts, Lucide React.
