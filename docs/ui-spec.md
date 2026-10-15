# UI & Design System Specification: AI Research Assistant with RAG

**Source of Truth:** Reference Interface Design (Dual-Pane Split Interface, macOS/Grok-inspired Neo-Minimalist aesthetic with Frosted Glass elements).

---

## 1. Visual Language & Aesthetic Direction

- **Aesthetic Classification:** *Neo-Minimalist Editorial Glassmorphism* (clean black-and-white typography, high contrast, subtle frosted glass surfaces, soft blurred gradient background canvas, refined micro-borders).
- **Core Layout Structure:**
  - **Background Canvas:** Soft ambient gradient (violet/lilac `#9d8ec2`, soft sky blue `#89a8d4`, warm amber `#d9a676` blurred backdrop) providing depth behind floating app panels.
  - **Dual Panel Architecture:**
    - **Left Panel (Document Inspector & Section Analyzer):** Crisp opaque white surface (`#FFFFFF`), `rounded-[28px]`, subtle soft shadow, housing document reader, quick model selector (`Grok 6.0`), toolbar, inline highlight annotations, and bottom floating prompt bar.
    - **Right Panel (Notes, Synthesized AI Insights & Research Hub):** Frosted translucent surface (`#EAEFF5` / `rgba(243, 245, 249, 0.94)` with `backdrop-blur-xl`), `rounded-[28px]`, housing tab navigation (`All`, `Highlights`, `Links`, `Media`, `Comparison Matrix`, `Literature Review`, `Evaluation`, `Web`), multi-type cards (Text notes, Code cards, Media visual cards, Citations), AI attribution pill, and bottom floating `✦ Actions` trigger.

---

## 2. Color Palette & Hex Tokens

| Token Name | Hex / CSS Value | Description & Usage |
|---|---|---|
| `--bg-canvas` | `linear-gradient(135deg, #1f1b2e 0%, #29384d 50%, #3d2b27 100%)` / Ambient mesh | Desktop blurred wallpaper background |
| `--surface-panel-left` | `#FFFFFF` | Crisp white document reader container |
| `--surface-panel-right` | `rgba(240, 243, 248, 0.92)` | Right-hand translucent frosted notes surface |
| `--surface-card-white` | `#FFFFFF` | Bento card background for insights and notes |
| `--surface-card-dark` | `#0D0F12` | Dark code block card and terminal widgets |
| `--surface-input` | `#F3F4F6` | Search and prompt input background |
| `--text-primary` | `#0F172A` | Primary typography for titles and key notes |
| `--text-secondary` | `#4B5563` | Subtitles, author info, and supporting copy |
| `--text-muted` | `#9CA3AF` | Inactive tab text, placeholders, metadata tags |
| `--text-on-dark` | `#F9FAFB` | Code and dark pill text |
| `--border-subtle` | `rgba(229, 231, 235, 0.8)` | Clean 1px dividers and card borders |
| `--border-focus` | `#111827` | Active focus outlines and active tab lines |
| `--accent-highlight-yellow` | `rgba(254, 240, 138, 0.5)` | Document text highlight (citations / key points) |
| `--accent-highlight-blue` | `rgba(186, 230, 253, 0.6)` | Active selection highlight |
| `--badge-black` | `#0A0A0A` | Header Grok badge, bottom `Actions` button |
| `--chip-citation` | `#EFF6FF` / border `#BFDBFE` | Interactive source citation chips |
| `--state-success` | `#10B981` | Evaluation pass, verification confirmed |
| `--state-warning` | `#F59E0B` | Low confidence / OCR warning |
| `--state-error` | `#EF4444` | Hallucination detected / extraction failed |

---

## 3. Typography System

- **Display & Headings:** `Instrument Serif` / `Newsreader` / `Plus Jakarta Sans` or modern grotesque for prominent document headers.
- **Body & Controls:** `Plus Jakarta Sans`, `Inter`, or system `-apple-system, BlinkMacSystemFont, "Segoe UI"` with `-0.02em` tracking for crisp editorial legibility.
- **Code & Syntax:** `JetBrains Mono`, `Fira Code`, or `ui-monospace`.

### Type Scale
- **Panel Title (e.g., "Notes"):** `32px` (`text-3xl`), font-weight `700`, leading `1.15`.
- **Document Title:** `24px` (`text-2xl`), font-weight `700`, leading `1.2`.
- **Card Heading:** `15px` (`text-sm`), font-weight `600`, leading `1.35`.
- **Card Body Text:** `13px` (`text-xs`), font-weight `400`, leading `1.5`.
- **Code Block:** `12px` (`text-xs`), font-weight `400`, mono, leading `1.6`.
- **Tabs & Metadata:** `13px` (`text-xs`), font-weight `500`.

---

## 4. Spacing, Borders & Shadows

- **Outer Panel Border Radius:** `28px` / `rounded-[28px]`.
- **Card Border Radius:** `20px` / `rounded-[20px]`.
- **Pill Badges & Buttons:** `9999px` / `rounded-full`.
- **Input Bars:** `24px` / `rounded-full`.
- **Shadows:**
  - *Panel Drop Shadow:* `0 20px 50px -12px rgba(0, 0, 0, 0.25)`
  - *Card Shadow:* `0 4px 14px -2px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.02)`
  - *Floating Pill Shadow:* `0 8px 24px -4px rgba(0, 0, 0, 0.12)`

---

## 5. Component Styles

### 1. Header Badges
- **Brand / Model Selector:**
  - Black pill (`#0A0A0A`), white icon and text `Grok`, paired with version pill `6.0` with subtle chevron.
  - "Share" button: sleek text button in medium gray with smooth hover opacity.

### 2. Document Reader Panel (Left)
- **Document Header:** Big bold document title ("The Science and Philosophy of Consciousness").
- **Reader Canvas Toolbar:** Compact dark gray toolbar (`#1E2228`) showing page counter `1 / 24`, zoom controls, download and print icons.
- **Reader Canvas:** Renders PDF pages with high clarity, dual-column academic rendering, selectable text with persistent color-coded highlights for citations.
- **Floating Query Prompt:**
  - Pill container at bottom with `microphone` icon on the left, divider line, placeholder `"Analyze this section"` or user chat query, and `+` action button on the right.

### 3. Notes & Insights Hub (Right)
- **Top Bar:** Large bold `"Notes"` header, tab list: `All`, `Highlights`, `Links`, `Media`, and extended mode tabs (`Matrix`, `Review`, `Eval`, `Web`).
- **Group Action:** Top-right `:: Group` pill button with icon.
- **Card Bento Grid:**
  - **Insight Card:** White background, `rounded-[20px]`, `...` kebab action, title, summary, and bottom `"Open"` pill action button.
  - **Visual / Media Card:** Thumbnail showing paper figures / diagrams or generated concepts, with media badge icon.
  - **Code / Extraction Card:** Jet-black background (`#0D0F12`), green/cyan highlighted syntax, showing structured JSON or Python data extracted from the document.
- **Attribution Pill:** Floating translucent pill: `"Notes generated by AI analysis of [Active Document]"` with sparkle icon.
- **Floating Action Pill:** Bottom centered pitch-black pill (`#000000`, text `#FFFFFF`) with sparkle icon: `✦ Actions` revealing actions (Compare, Literature Review, Web Research, Export).

---

## 6. Extended Views (Consistent Visual Language)

For screens not directly shown in the single crop, the design maintains identical visual DNA:
1. **Research Comparison Matrix:**
   - Displayed in the Right Panel or maximized full-screen modal.
   - Clean editorial table on frosted card surface: columns for Paper, Problem Statement, Methodology, Dataset, Results, Limitations, Future Scope.
   - Each table cell features interactive inline citation pills that open the exact page passage in the Left Panel reader.
2. **Literature Review Generator:**
   - Structured sections (Synthesis, Consensus, Disagreements, Research Gaps).
   - Markdown preview with one-click copy and `.md` file export.
3. **Web Research Mode:**
   - Split view indicating web retrieved sources (globe icon, live URL badge, domain pill) distinctly from local PDF documents (paper icon, page number chip).
4. **RAG Evaluation Dashboard:**
   - Metric overview cards (Hit Rate / MRR@k, Groundedness %, Citation Accuracy %, Latency ms).
   - Test suite runner with real-time pass/fail indicators across factual, citation, unanswerable, multi-paper, conflicting, irrelevant, and prompt-injection tests.
5. **Authentication & Document Library:**
   - Sleek minimal modal/drawer for login and document management (upload, tag, delete, scope selection).
