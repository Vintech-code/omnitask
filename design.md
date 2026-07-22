# OmniTask UI Redesign Specification

Status: active implementation specification  
Scope: visual redesign only  
Target: React Native / Expo mobile app  
Reference: the supplied three-screen glassmorphism mobile UI

## 1. Design objective

Redesign OmniTask as a calm, premium personal productivity workspace. The new UI should borrow the reference image's visual language—soft glass panels, pearl-white surfaces, warm orange accents, rounded controls, subtle depth, and generous spacing—without copying its nutrition content or changing OmniTask's behavior.

All existing features, navigation destinations, data models, forms, validation, gestures, permissions, alarm behavior, timers, storage, and authentication flows must remain intact. This document changes how those features look and how their existing information is visually organized.

### Product character

- Calm rather than clinical
- Premium rather than decorative
- Warm rather than corporate
- Focused rather than dense
- Tactile rather than flat
- Consistent across light and dark themes

### Visual keywords

`frosted glass` · `pearl` · `warm orange` · `soft daylight` · `rounded` · `quiet depth` · `airy`

## 2. Existing OmniTask surfaces in scope

The redesign applies to the current application structure:

- Welcome, sign in, sign up, and onboarding
- Dashboard
- Focus timer and its sheets/modals
- Alarms
- Event alarms / calendar
- Tasks and note editor
- Create event and event detail
- Search
- Statistics
- Profile, preferences, account, help, and related modals
- Shared buttons, text inputs, cards, menus, headers, tab bar, empty states, and loading states

The main navigation remains limited to five destinations:

1. Dashboard
2. Focus
3. Alarm
4. Calculator
5. Organize (`Tasks` route), containing Notes and Events

Do not add reference-image features such as nutrition, premium subscriptions, or an AI companion unless they become separate product requirements later.

## 3. Design principles

### 3.1 Content remains dominant

Glass is a material treatment, not decoration. Use it to group controls and establish hierarchy. Never place multiple translucent layers over one another when a single surface would communicate the grouping.

### 3.2 Orange means action

Orange is the only primary accent. Reserve it for the active tab, primary buttons, progress, selected states, toggles, and the most important next action. Supporting semantic colors may appear for status, but should not compete with orange.

### 3.3 Depth comes from light

Create depth primarily with surface contrast, translucent fills, a bright inner edge, spacing, and a layered atmospheric background. Shadows are exceptional rather than the default. Avoid dark drop shadows, stacked glows, and strongly outlined cards.

### 3.6 Clean before decorative

- A screen should use no more than three surface levels: background, grouped surface, and floating navigation/modal.
- Prefer one grouped card with dividers over several individually elevated rows.
- Do not show two controls for the same primary action in the same viewport.
- Floating actions must clear the navigation capsule by at least 16 px and may not overlap its shadow or active item.
- Ambient color must remain quiet enough that content edges stay crisp.
- Never apply live blur beneath text, icons, buttons, chips, inputs, navigation items, or list content.
- Use consistent alignment lines: 20 px screen gutter, 16 px card inset, and 44 px minimum controls.

### 3.4 One visual system

Authentication screens, productivity screens, editors, and modals use the same tokens and component shapes. Do not keep the current blue UI on secondary screens.

### 3.5 Familiar interaction

The redesign must not move or hide an action in a way that changes its meaning. Existing accessibility labels, navigation paths, swipe behavior, save/cancel flows, and destructive confirmations must continue to work.

## 4. Color system

### 4.1 Light theme

| Token | Value | Usage |
| --- | --- | --- |
| `color.bg.base` | `#F3F3F1` | Pearl app background |
| `color.bg.top` | `#F6F3EC` | Warm ivory top of atmospheric gradient |
| `color.bg.bottom` | `#E8EDF0` | Bottom of atmospheric gradient |
| `color.bg.lavender` | `#F3F3F1` | Pearl diffuse ambient field |
| `color.bg.blue` | `#DCE5E8` | Mist blue-gray ambient field |
| `color.glass.primary` | `rgba(255,255,255,0.58)` | Main glass cards and tab bar |
| `color.glass.secondary` | `rgba(255,255,255,0.38)` | Chips and secondary controls |
| `color.glass.solid` | `rgba(255,255,255,0.86)` | Inputs and high-legibility surfaces |
| `color.glass.highlight` | `rgba(255,255,255,0.92)` | Hairline top edge |
| `color.glass.border` | `rgba(255,255,255,0.76)` | General glass outline |
| `color.divider` | `rgba(23,23,23,0.09)` | Dividers within grouped cards |
| `color.text.primary` | `#171717` | Titles and important values |
| `color.text.secondary` | `#666765` | Supporting labels |
| `color.text.muted` | `#92938F` | Metadata and placeholders |
| `color.icon` | `#191A19` | Default icon |
| `color.accent` | `#FF7A00` | Primary action and selection |
| `color.accent.pressed` | `#E66E00` | Pressed primary state |
| `color.accent.soft` | `rgba(255,122,0,0.13)` | Selected chip/icon background |
| `color.accent.glow` | `rgba(255,160,55,0.30)` | Controlled glow around primary action |
| `color.success` | `#74B82A` | Completed / positive state |
| `color.warning` | `#E7A126` | Warning state |
| `color.danger` | `#E45B55` | Destructive / overdue state |
| `color.info` | `#6E9FBD` | Informational state only |

### 4.2 Dark theme

Dark mode should feel like smoked glass, not a pure-black recolor.

| Token | Value | Usage |
| --- | --- | --- |
| `color.bg.base` | `#121311` | Smoked charcoal app background |
| `color.bg.top` | `#1A1B19` | Top gradient |
| `color.bg.bottom` | `#111615` | Bottom gradient |
| `color.bg.lavender` | `#1A1B19` | Smoked ambient field |
| `color.bg.blue` | `#6E9FBD` | Low-opacity slate-cyan ambient field |
| `color.glass.primary` | `rgba(38,39,37,0.68)` | Main card |
| `color.glass.secondary` | `rgba(49,50,47,0.48)` | Secondary control |
| `color.glass.solid` | `rgba(34,35,33,0.92)` | Blur fallback |
| `color.glass.highlight` | `rgba(255,255,255,0.15)` | Highlight edge |
| `color.glass.border` | `rgba(255,255,255,0.13)` | Glass outline |
| `color.divider` | `rgba(255,255,255,0.10)` | Divider |
| `color.text.primary` | `#F7F7F3` | Primary text |
| `color.text.secondary` | `#B8B9B4` | Supporting text |
| `color.text.muted` | `#81827E` | Metadata |
| `color.icon` | `#F1F1ED` | Default icon |
| `color.accent` | `#FF7A00` | Primary action and selection |
| `color.accent.pressed` | `#F17608` | Pressed state |
| `color.accent.soft` | `rgba(255,122,0,0.17)` | Selected background |

Semantic colors keep their meaning in dark mode and may be raised slightly in luminance to meet contrast requirements.

### 4.3 Ambient background

Each main screen uses the same quiet atmospheric canvas:

- A pearl gradient from `#F6F3EC` to `#E8EDF0` in light mode.
- Large fixed pearl and mist blue-gray fields sit behind the content.
- Weather content does not recolor or darken the shared application background.
- Decorative layers ignore pointer events and remain outside screen update paths.
- Translucent glass surfaces and floating navigation layer above the atmospheric canvas.

## 5. Typography

Use the system sans-serif for standard content. Dashboard greeting typography uses bundled Nunito for a friendly rounded brand expression with consistent Android and iOS rendering.

| Style | Size / line height | Weight | Usage |
| --- | --- | --- | --- |
| `display` | 32 / 38 | 700 | Timer values and major statistics |
| `title.large` | 26 / 32 | 700 | Screen title or greeting |
| `title` | 22 / 28 | 700 | Primary section title |
| `heading` | 18 / 24 | 600 | Card and modal heading |
| `body.strong` | 16 / 22 | 600 | Task title, button label |
| `body` | 15 / 22 | 400 | Standard content |
| `label` | 13 / 18 | 500 | Chips, metadata, compact buttons |
| `caption` | 12 / 16 | 400 | Supporting detail |

Guidelines:

- Use sentence case, including buttons and section labels.
- Avoid all caps except short status labels when necessary.
- Use tabular numerals for timers, alarm times, and statistics.
- Titles use no more than two lines; card titles normally use one line with ellipsis.
- Primary text must meet 4.5:1 contrast for normal text.

## 6. Layout, spacing, and shape

Continue the existing 4-point spacing model and expand it to:

| Token | Value |
| --- | --- |
| `space.1` | 4 |
| `space.2` | 8 |
| `space.3` | 12 |
| `space.4` | 16 |
| `space.5` | 20 |
| `space.6` | 24 |
| `space.8` | 32 |
| `space.10` | 40 |

Screen rules:

- Horizontal screen gutter: 20 px on phones, 24 px at 430 px width and above.
- Minimum safe-area top spacing: platform safe inset plus 8 px.
- Section gap: 24–32 px.
- Card internal padding: 16 px compact, 20 px standard, 24 px hero.
- Minimum touch target: 44 × 44 px.
- Scroll content bottom inset must clear the floating tab bar by at least 112 px.
- Content maximum width on tablets: 720 px, centered.

Corner radii:

| Token | Value | Usage |
| --- | --- | --- |
| `radius.sm` | 12 | Small icon tile and compact control |
| `radius.md` | 16 | Input and chip group |
| `radius.lg` | 22 | Standard card |
| `radius.xl` | 28 | Hero panel and modal sheet |
| `radius.pill` | 999 | Buttons, chips, tab bar, toggles |

## 7. Glass material recipes

### 7.1 Standard glass card

- No runtime blur; content and controls must remain optically crisp.
- Fill: `glass.primary`.
- Border: 1 px `glass.border`.
- Radius: 22 px.
- Shadow: none.
- Android elevation: 0.
- Optional inner highlight: a subtle top edge only, never a full bright outline.

### 7.2 Elevated glass / floating navigation

- No runtime blur.
- Fill: `rgba(250,250,248,0.90)` light or `rgba(35,36,34,0.94)` dark.
- Border: 1 px glass border.
- Radius: pill.
- Shadow: `0 6 18 rgba(30,30,30,0.08)`; this is the maximum elevation used in the app.
- Use only for the tab bar, popovers, and important floating controls.

### 7.3 Compact glass control

- Height: 44–48 px.
- Fill: `glass.secondary`.
- Border: 1 px glass border.
- Radius: pill.
- Pressed state: increase opacity and scale to 0.98.
- Selected state: orange icon/text with `accent.soft` fill.

### 7.4 Material behavior

Glass is expressed with translucent fill, a bright border/highlight, layered atmospheric color behind it, and restrained elevation. Content must remain fully readable and hierarchy must never depend on blur.

## 8. Core components

### App background

One shared component renders the gradient and ambient shapes behind screen content. It should avoid re-rendering during scroll and timer updates.

### Top app bar

- Transparent; no full-width solid header block.
- Height: 56 px excluding safe area.
- Left: page identity, avatar, or back button as the current flow requires.
- Center titles only on utility/form screens; use left-aligned titles on primary tabs.
- Right: one or two circular glass icon buttons.
- Remove the current hard divider; separation comes from spacing.

### Glass card

One reusable base with `standard`, `elevated`, and `subtle` variants. Cards should accept radius, padding, tint, and semantic accent without screens recreating shadow/border values.

### Buttons

- Primary: orange fill, near-white label, 52 px height, pill radius.
- Secondary: compact glass surface with primary text.
- Tonal: `accent.soft` fill with orange label/icon.
- Destructive: glass surface with danger label; solid danger only inside final confirmation.
- Icon button: 44 × 44 px circle, centered 20–22 px icon.
- Disabled: 45% opacity and no glow.

### Inputs

- Height: 52 px for single-line fields.
- Fill: `glass.solid` or a compact glass surface.
- Border: glass border at rest; orange at focus.
- Radius: 16 px.
- Label sits above the field; placeholder is not a replacement for a label.
- Validation message uses danger color and remains below the field.
- Multiline editors use a large glass panel and retain all existing formatting controls.

### Chips and segmented controls

- Height: 40–44 px.
- Unselected: translucent glass, secondary text.
- Selected: `accent.soft`, orange text/icon, brighter edge.
- Use a checkmark only when selection is not otherwise obvious.

### List row

- Minimum height: 68 px.
- Leading 40 px circular tonal icon or task checkbox.
- Center title and one metadata line.
- Trailing value, toggle, chevron, or overflow action.
- Rows inside a group are separated with inset dividers, not individual shadows.

### Progress

- Orange is the default progress color.
- Track: `rgba(23,23,23,0.08)` light / `rgba(255,255,255,0.10)` dark.
- Linear track: 6 px high, fully rounded.
- Ring: 6–8 px stroke with rounded ends.
- Keep progress values textual; color is supplementary.

### Empty state

- Small existing Lottie or monochrome line illustration, not a large saturated graphic.
- One concise heading, one explanation, and at most one primary action.
- Place inside a subtle glass panel when it improves grouping.

### Modal and bottom sheet

- Dim/blur the page behind it.
- Sheet uses `radius.xl` on upper corners and glass-solid fill.
- Destructive confirmations remain opaque enough for clarity.
- Preserve keyboard avoidance and safe-area handling.

### Skeleton loading

- Never replace an entire screen with a centered spinner when its layout is known.
- Skeletons must mirror the final hierarchy: header, compact controls, cards, and list rows.
- Use neutral glass-tinted blocks with 10–18 px radii; do not use orange skeletons.
- Animation is a restrained opacity pulse between 45% and 82%, 900–1100 ms per phase.
- Show skeletons only for genuine initial asynchronous loading, not for every refresh or button action.
- Keep the page background and navigation stable while loading so content does not jump.
- Match the expected number of items: three rows for a list, two metrics for a dashboard, and one hero panel for focus/alarm screens.
- Respect reduced motion by supporting a static fallback.
- Inline button submissions may retain a compact activity indicator because the surrounding form is already visible.

## 9. Floating bottom navigation

The current full-width bottom bar becomes a floating glass capsule inspired by the reference.

- Position: 16 px from left/right and 8 px above the bottom safe area.
- Height: 68 px.
- Five evenly distributed tab targets: Home, Focus, Alarm, Calculator, and Organize.
- Inactive tabs: black/white monochrome outline icons with muted labels.
- Active tab: 36 px orange circle with a white icon; no glow behind its label.
- Labels may remain beneath inactive icons if needed for accessibility; keep them small and stable so the layout does not jump.
- The active destination must not rely on color alone: use the filled circle and icon weight.
- Keep the `Tasks` route name for compatibility with existing Dashboard and Search links. Notes and Events are switched with a segmented control inside that destination; existing event detail, creation, alarm, calendar, and note editor flows remain intact.
- Floating create/add buttons must not collide with the tab bar. Prefer a contextual header action or an inline primary button over a second floating circle.

## 10. Screen-by-screen direction

### Welcome and onboarding

- Launch begins with an OmniTask-branded native splash, then a brief transform/opacity animation using `omnitasklogo.png`; the transition must not expose a blank frame or delay navigation initialization. The Android adaptive icon uses the same logo so Google account selection and system surfaces do not show an Expo placeholder.
- Use the atmospheric pearl background across all pages.
- Place existing Lottie artwork inside a large, edge-free light area rather than a bordered card.
- Keep the OmniTask mark compact at the top.
- Use a strong left-aligned headline and short secondary copy.
- Put the primary orange pill button near the bottom safe area; use a glass secondary action.
- Page indicators use orange for the active point and translucent gray for inactive points.

### Sign in and sign up

- Use a centered glass form panel on phones and tablets, maximum width 480 px.
- Keep all current fields, Firebase behavior, validation, links, and password visibility actions.
- Orange primary submit button; glass social/secondary actions if currently present.
- Google is the only third-party authentication action. Use Google's official, full-color SDK button at full form width with the same pill silhouette as the other authentication buttons on Welcome, Sign In, and Sign Up; do not show Apple or a simulated provider action.
- Google account selection feeds the same Firebase session and user-profile persistence flow as email authentication. Treat both first-time and returning Google accounts as one non-confusing continuation action.
- Firebase's credential result decides whether a Google identity is new or returning, regardless of whether the action started on Sign In or Sign Up. Returning UIDs must restore their existing local/cloud workspace, skip onboarding, and never initialize or overwrite empty account data. Onboarding completion is scoped and synced per UID rather than shared as one device-wide flag.
- Google button taps use the explicit Android account chooser so every device account and Add another account remain available. A successful Firebase credential must not be reported as failed because a later local-profile or cloud-sync write failed, and the official native button must be remounted after its account sheet closes if Android clears its rendered host.
- Sign Up is account creation only: no profile photo, security badge, or other profile-preparation controls. Explain that Google creates the Firebase account automatically on first use, and offer email creation as the alternative.
- Sign In and Sign Up fields use one compact outlined floating-label pattern with leading semantic icons: the label animates into the border on focus or when populated, the existing example placeholders appear on focus, input values stay stable, validation appears inline, and password visibility remains explicit. Place Forgot password directly below the password field, right-aligned.
- Authentication surfaces fully consume the active theme tokens: dark mode uses smoked-glass cards and fields, light primary text, visible muted copy and dividers, orange focus/action states, and dark-safe warning/error treatments. Do not leave hard-coded light labels, icons, borders, or white field surfaces on Sign In or Sign Up.
- Keyboard-open state must remain uncluttered and scrollable.
- Never translate a network timeout, disabled provider, or Firebase configuration failure into "incorrect credentials." Show the actionable authentication error inline and reserve the credentials message for Firebase's invalid-credential response.
- Preserve password input exactly as entered; trim email addresses but never trim passwords.
- While authentication is pending, disable duplicate submission, keep a "Signing in..." label beside the progress indicator, and show a compact connection hint if Firebase has not responded after 3.5 seconds.
- Email/password accounts are gated at the root navigator until Firebase reports `emailVerified`. The verification screen shows the account email, a Firebase-backed resend action with a 60-second cooldown, a manual refresh action, and logout. Password reset is a separate request/success flow and never reveals whether an address is registered. On the Spark plan, Firebase Authentication securely sends verification and reset messages through its built-in templates; no provider secret is stored in the app. The optional SendGrid Cloud Functions implementation remains isolated for a future Blaze upgrade. Trusted Google identities are already verified by Firebase and bypass the verification gate.

### Dashboard

Use the reference's day-planning screen as the structural inspiration, translated to OmniTask:

- Header: greeting and current date on the left; profile/avatar and search in circular glass controls on the right.
- Add a horizontal seven-day date strip under the greeting. Today uses a raised glass tile with an orange dot or outline.
- Keep upcoming events as a horizontally scrollable row of glass cards with subtle semantic priority markers.
- Present Focus Timer and Next Alarm as two compact metric cards, or one two-column glass group on wider devices.
- Present priority tasks as an `Agenda` section: one stacked glass row per task with checkbox/icon, title, and metadata.
- Keep existing navigation targets for calendar, focus, alarm, tasks, profile, search, and stats.
- Primary add action is an orange pill/circle placed in the section header or a non-colliding contextual position.

### Tasks and note editor

- The Tasks/Organize destination begins with a two-option `Notes` / `Events` segmented control. Switching changes the workspace content without adding another bottom tab.
- Left-align `Notes`; keep category management and create-note actions in the header.
- Search becomes a full-width glass input.
- Filter tabs become a pill segmented control with an orange active state.
- Task/note cards use a calm white-glass surface. Colorful note backgrounds should become a narrow category accent, icon tint, or extremely subtle 8–12% wash rather than a fully saturated card.
- Checkbox: 24 px rounded square; completed is orange with a white check.
- Priority appears as a compact semantic label, never a large block of color.
- Note creation uses one 52 px orange action on the lower-right, positioned at least 16 px above the floating navigation capsule. Do not duplicate it in the header.
- Preserve note colors, tags, todos, formatting, attachments, and editor operations as data/features even if their controls are visually restyled.

### Calculator

- Calculator is a primary tab and follows the same atmospheric background, top app bar, glass surfaces, orange action language, and floating-navigation clearance as the other main screens.
- Use one large glass display and one grouped keypad surface; avoid individually elevated or decorative key cards.
- Number keys use high-legibility glass surfaces, utility keys use orange-soft styling, and arithmetic/equals keys use solid orange.
- Support decimal input, sign change, percent, backspace, clear, the four basic arithmetic operations, chained calculations, and division-by-zero feedback.
- Place backspace in the final keypad row between decimal and equals. The top-right action opens a recent-calculation history sheet and may restore a result to the display.
- Let the calculator surfaces fill the available vertical space and end at the navigation-clearance boundary; do not add decorative empty space beneath the keypad.
- Follow a four-column calculator flow with the largest keys that fit while retaining 44 px minimum targets. A compact chevron above the keypad expands or hides the scientific rows without moving content beneath the floating navigation.
- The optional scientific panel provides square root, pi, powers, factorial, degree/radian mode, trigonometric and inverse-trigonometric functions, Euler's number, natural logarithm, and base-10 logarithm. The standard keypad provides parentheses.
- Scientific controls must execute with standard operator precedence and valid domain/error handling; they are not decorative shortcuts.
- Keep touch targets at least 44 px and expose each key with an accessibility label.

### Focus

- Center the timer in one large hero glass panel.
- Use an orange progress ring around the tabular time value.
- Primary play/pause is a 64 px orange circle; reset and settings are smaller glass circles.
- Mode/duration selectors use the shared segmented control.
- Session count and daily goal appear beneath the timer as quiet metadata/progress.
- Existing sounds, haptics, duration choices, modals, and timer lifecycle remain unchanged.
- Stopwatch controls must use the device bottom safe-area plus floating-navigation clearance; they may never sit beneath the tab capsule.

### Alarms

- Keep `Next alarm` as the first hero glass panel with time, label, and relative duration.
- Alarm entries become stacked glass cards. Time remains the strongest element.
- Use the orange switch for enabled alarms and a neutral translucent switch when disabled.
- Repeat days are seven small circular chips; selected days are orange or orange-soft.
- Sound, repeat, label, add, edit, enable, and delete behavior stay unchanged.
- The alarm-sound picker uses explicit `Preview` / `Stop` controls. Do not hide preview behind a long-press gesture.
- Sound rows use a flexible label column, a separate preview target, and a separate selection target so text and controls cannot overlap.

### Events, create event, and event detail

- Events begins with a glass date/month control and compact calendar strip.
- The selected date uses the raised white tile/orange state from the reference.
- Event agenda rows follow the shared list-row pattern with a slim priority color marker.
- Create/edit screens use grouped glass sections for date/time, recurrence, location, category, priority, and alarm options.
- Put the all-day switch before date/time controls. All-day events hide time pickers; multi-day events expose a separate end date and never encode a date range in the notes field.
- Show an explicit IANA time-zone field on create/edit and event detail. Store the zone with the event and calculate notification triggers from that zone so travel does not silently change the intended wall-clock time.
- Custom event categories are user-level data, not form-local state. Persist them locally and in the signed-in user's cloud metadata, merge them without duplicates, and reuse them for future events.
- Location selection is a full-screen map flow with current-location permission handling, tap-to-place coordinates, an editable place label, and explicit Cancel/Done actions. Store latitude and longitude with the label; directions use coordinates when available.
- A selected map point remains usable if reverse geocoding fails. Permission denial must show inline recovery guidance and must not block manual map selection.
- Never mount the native event map when its Android API key is absent from the build. Show an inline setup-safe fallback with current-location recovery instead of allowing a native crash.
- Sticky bottom actions must clear the floating navigation and keyboard.
- Event detail uses one hero card for title/date and smaller grouped cards for metadata and actions.
- Event overflow actions, bulk reminder actions, reminder selection, notices, and destructive confirmations use glass-solid bottom sheets with an explicit Cancel, Close, or Keep event control. Do not use platform alert menus for Events actions.
- Do not duplicate Edit or Delete actions in multiple menus on the same detail screen. The visible edit control and bottom delete action are sufficient.
- Do not expose placeholder settings or metadata without backing behavior. Event status, sound labels, recurrence labels, and reminder counts must come from stored event data.
- Every selected reminder time schedules its own notification. Daily, weekly, and monthly recurrence must preserve the correct reminder offset across hour and day boundaries.
- All-day reminders use 9:00 AM in the event time zone as their notification anchor. Multi-day events appear on every included day in the Events calendar.
- Automated event coverage includes create, edit, delete confirmation, recurrence, calendar selection, reminder toggling, date-range inclusion, time-zone conversion, permission-denied notification behavior, and cleanup after partial scheduling failures.
- Android device QA uses the development-build notification probe to verify both the OS permission-denied state and actual notification delivery. Expo Go is not an acceptable delivery test environment.
- Dashboard and Search entry points route Events through the Organize destination; do not reopen the removed standalone Events stack.

### Search

- Search field is pinned visually at the top but floats on the atmospheric background.
- Results are grouped by existing content type with small labels and glass rows.
- Highlight matches with weight or a faint orange wash, not bright marker yellow.
- Empty and no-result states use the shared empty-state treatment.

### Statistics

- Keep all existing computed values and charts.
- Replace the dense KPI grid with horizontally scrollable or 2 × 2 glass metric cards.
- Use orange for the principal goal/progress; use semantic secondary colors only to distinguish categories.
- Chart tracks and dividers stay low contrast.
- Rings, bars, labels, and numerical values must remain readable without relying on color.

### Profile

Use the reference profile screen most directly:

- Large left-aligned `Profile` title and a circular sign-out/back action.
- A hero glass card contains avatar, name, email, edit profile action, and existing account details.
- Settings/preferences become one or more grouped glass lists with circular leading icons and chevrons.
- Theme/system-theme controls retain their current behavior and use the shared switch/segmented styling.
- Sign out and delete account are separated from routine preferences and use clear destructive styling.

## 11. Motion and feedback

- Standard transition: 180–240 ms, ease-out.
- Button press: scale from 1 to 0.98 over 90 ms, return over 140 ms.
- Active tab circle: subtle scale/fade; no bouncing navigation bar.
- Cards may fade and translate upward by no more than 8 px on initial load.
- Use existing haptics for meaningful selection/completion, not every tap.
- Honor reduced-motion settings: remove scale and translation while retaining opacity/state changes.
- Do not animate background fields or blur intensity continuously.

## 12. Accessibility and resilience

- Minimum text contrast: WCAG AA (4.5:1 normal, 3:1 large text and UI boundaries).
- Minimum touch target: 44 × 44 px.
- Support font scaling without clipping timer labels, task titles, or tab names.
- Selected, completed, enabled, warning, and error states require a shape/icon/text cue in addition to color.
- Transparency must have an opaque fallback.
- Screen reader labels and focus order must survive component restyling.
- Dark mode, system theme, reduced motion, and reduced transparency are first-class states.
- Keep text and interactive content on crisp compositing layers; never place controls inside a runtime blur view.

## 13. Implementation architecture

This section describes the shared implementation architecture now used by the app.

### Theme

Replace hardcoded screen colors with semantic tokens exposed by `ThemeContext`. Extend the theme beyond `bg`, `card`, and `text` to include:

```ts
interface Theme {
  dark: boolean;
  background: {
    base: string;
    top: string;
    bottom: string;
    ambientLavender: string;
    ambientBlue: string;
  };
  glass: {
    primary: string;
    secondary: string;
    solid: string;
    border: string;
    highlight: string;
  };
  text: { primary: string; secondary: string; muted: string };
  accent: { base: string; pressed: string; soft: string; glow: string };
  semantic: { success: string; warning: string; danger: string; info: string };
  divider: string;
  icon: string;
}
```

Provide temporary compatibility aliases during migration so screens can be converted one at a time without behavior changes.

### Suggested shared UI files

```text
src/components/ui/
  AppBackground.tsx
  GlassCard.tsx
  GlassIconButton.tsx
  PillButton.tsx
  SegmentedControl.tsx
  AppHeader.tsx
  ListRow.tsx
  ProgressRing.tsx
  Screen.tsx
src/theme/
  colors.ts
  typography.ts
  spacing.ts
  radii.ts
  shadows.ts
```

### Expo dependency

- `expo-linear-gradient` renders the pearl background and diffuse lavender/blue atmospheric fields.

Do not use `expo-blur` for cards, buttons, text, icons, inputs, list rows, or navigation. The translucent surface system is intentionally deterministic across Android and iOS.

### Performance rules

- Memoize decorative background layers.
- Keep gradient background layers outside scroll and timer update paths.
- Use native-driver-compatible animations for opacity and transform.
- Test long task/event lists on a mid-range Android device.

## 14. Migration sequence

1. Add the expanded semantic tokens, radii, shadows, and compatibility aliases.
2. Build and verify `AppBackground`, `GlassCard`, buttons, inputs, header, and segmented control.
3. Convert the floating bottom navigation and validate safe-area/keyboard behavior.
4. Redesign Dashboard as the reference screen for the system.
5. Convert Tasks, Focus, Alarms, Events, and their detail/create flows.
6. Convert Search, Statistics, Profile, authentication, and onboarding.
7. Remove obsolete hardcoded colors and duplicated local component styles.
8. Run light/dark, small/large phone, font-scale, reduced-motion, reduced-transparency, and Android performance QA.

Each step must be visually reviewable and must not include feature or data-model changes.

## 15. Acceptance criteria

The redesign is complete when:

- Every existing screen uses the shared pearl/smoked atmospheric background and semantic theme tokens.
- Primary actions and active states consistently use warm orange rather than the current brand blue.
- Main cards, controls, grouped lists, and the tab bar follow the glass recipes in this document.
- The main tab bar is a floating capsule with an unmistakable orange active state.
- Dashboard, Focus, Alarm, Events, Tasks, Statistics, and Profile feel like one product.
- Both light and dark themes are intentional and readable.
- Blur-off and reduced-transparency fallbacks are usable.
- No current feature, route, field, action, stored value, notification, alarm, timer, or authentication flow is removed or behaviorally changed.
- Layout remains usable at 320 px width, common 360–430 px phones, and tablet widths.
- Interactive elements meet touch-target and contrast requirements.
- Scrolling and timer interactions remain smooth on Android and iOS.

## 16. Non-goals

- Adding new product functionality outside an explicitly approved feature brief
- Replacing the information architecture
- Copying the reference app's brand, content, profile identity, or nutrition features
- Using glass on every element
- Introducing saturated gradients, neon effects, or heavy shadows
- Redesigning backend, storage, notifications, alarm scheduling, or authentication logic

This specification is the visual source of truth for the OmniTask UI remake. Where a current screen conflicts with the visual rules above, preserve the screen's behavior and content while applying this system.
