# Lumiscan Design System — "Instrument Grade"

The UI is the software face of the physical Lumiscan scanner. It behaves like
the instrument: machined panels separated by hairline seams (not floating
shadowed cards), a dark instrument-rail sidebar against a warm ivory work
surface, and every measured value rendered as calibrated mono data. Color is
rationed — near-monochrome surfaces, ONE cobalt action color, and the four
classification colors reserved as indicator lights.

All tokens live in `src/app/globals.css`; the signature primitives live in
`src/components/ui/instrument.tsx`. Use the utilities and primitives — never
raw hex or raw Tailwind palette classes.

## Tokens

Surfaces & ink:

| Utility | Value | Role |
| --- | --- | --- |
| `bg-background` | `#F2F2EF` | ivory canvas (set by the shell only) |
| `bg-surface` | `#FFFFFF` | panel face |
| `bg-surface-2` | `#F7F7F4` | hover wash |
| `bg-surface-3` | `#EAEAE6` | sunken wells, image mats, device-read fields |
| `text-foreground` | `#17191C` | primary ink |
| `text-muted` | `#4B5058` | secondary ink |
| `text-faint` | `#7A8089` | labels, units, timestamps |
| `border-border` | `#DBDCD6` | hairline seams |
| `border-border-strong` | `#B7B9B1` | inputs, table header rules |

Instrument rail (sidebar): `bg-sidebar` `#16181B`, `bg-sidebar-raised`
`#22252A`, `border-sidebar-border` `#2A2D33`, `text-ink-on-dark` `#E9EAE6`,
`text-ink-on-dark-dim` `#A9ADB3`.

Accent (the only action color): `bg-primary` `#2049B0` cobalt,
`hover:bg-primary-hover` `#1A3C93`, tint pair `bg-primary-soft` /
`border-primary-soft-border` / `text-primary-soft-foreground`.

Classification status (clinically locked semantics — BENIGN green, SUSPICIOUS
amber, MALIGNANT red, INCONCLUSIVE grey): each has four utilities, e.g.
`text-benign` `#1A7F4B`, `text-benign-ink`, `bg-benign-soft`,
`border-benign-border` — same pattern for `suspicious`, `malignant`,
`inconclusive`. Charts use `var(--chart-grid)` `#E8E9E3` and
`var(--chart-axis)` `#C6C8C0`.

## Type

- UI voice: **Archivo** (`--font-archivo`, the default sans). 500 nav/labels,
  600 titles/buttons, 700 page titles/hero.
- Data voice: **IBM Plex Mono** (`--font-plex-mono`). Every metric, %, delta,
  timestamp, serial, MRN/LSN id, chart tick, overline label. Always
  tabular-nums.
- `.overline` utility — mono 11px uppercase 0.08em tracking; the universal
  section/column/label style.
- `.datum` utility — mono + tabular numerals for any measured value.
- Hard rule: mono never sets running prose or action-button labels. (The
  timeline mode switcher and A/B slot tags are deliberate exceptions: they are
  label chrome, not prose buttons.)

## Shape

- Radius: 2px controls (`rounded-sm`), 4px panels (`rounded`; the theme maps
  `rounded-lg/xl/2xl` down to 4px so nothing rounder can exist). Avatars are
  the lone circle; status LEDs stay square.
- No card shadows — borders do the work. `shadow-md` only for true overlays.
- Adjacent panels share 1px seams via the `Fascia` primitive
  (`grid gap-px bg-border`); never hand-roll seams. A ragged seam grid exposes
  border-colored holes — match column count to cell count.
- Density: 8px grid, 40px table rows, `p-4`/`p-5` card padding, whitespace
  spent between sections rather than inside components.

## Primitives (`src/components/ui/instrument.tsx`)

`Fascia` seam grid · `Overline` · `Datum` · `Tick` (8×2px cobalt registration
mark) · `SectionLabel` (`01 · IMAGE` indexed headers — thread two-digit
indexes through every screen) · `Led` (square status light) · `StatusChip`
(rectangular, never a pill: `MALIGNANT · 94%`) · `Delta` (signed mono delta —
glyph follows the number, **color follows clinical risk**, so a shrinking
diameter reads green) · `ReticleFrame` (corner-bracket viewfinder for clinical
imagery) · `SpecimenBar` (mono evidence caption under photos) · `RulerStrip`
(dermatoscope ruler divider).

## Absolute rules

1. Never color alone for status — always a square LED and/or spelled-out label.
2. No pills, no rounded-2xl geometry, no card shadows, no gradients, no glass.
3. Filled red is reserved for malignancy; danger buttons are border-only until
   a real confirm step (`variant="danger"` vs `variant="dangerSolid"`).
4. Leaf components never set the page background; the shell owns the canvas.
5. Charts restyle via Recharts props only; two metrics = two small multiples,
   never dual axes; every dot on a trend line is a real scan event
   (`isAnimationActive={false}` — measured data appears instantly).

## Local verification

- Seed under tsx: `pnpm tsx --env-file=.env --conditions=react-server
  scripts/seed.ts` (the `react-server` condition neutralizes `server-only`).
- Don't run `pnpm build` while `pnpm dev` is running — they share `.next` and
  the dev server's chunks get corrupted.
