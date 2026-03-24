# Gantt Continuous Scroll — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the jarring "jump 3 months + reset scroll to 0" behavior with a seamless sliding-window scroll where new months appear on the right as the user scrolls, and stale months are silently trimmed from the left.

**Architecture:** Two scroll-triggered operations — *extend right* (append 1 month to `viewEnd` when near the right edge) and *trim left* (remove 1 month from `viewStart` when the first month is fully off-screen, using `else if` to prevent simultaneous firing). A synchronous `useLayoutEffect` compensates `scrollLeft` before each paint so the user sees no jump. Button navigation ("Önceki/Sonraki") is handled separately via `isButtonNavRef` which resets scroll to 0. All changes are confined to `GanttChart.tsx`.

**Tech Stack:** React 18 (automatic batching), `useLayoutEffect` for synchronous DOM mutation before paint, `date-fns` `getDaysInMonth` for month pixel width.

---

## Chunk 1: Replace scroll logic in GanttChart.tsx

### Task 1: Update imports and refs

**Files:**
- Modify: `mfg-planner/src/components/Gantt/GanttChart.tsx`

Current line 1 (React imports):
```tsx
import { useRef, useState, useCallback, useEffect } from 'react'
```
Current line 7 (date-fns imports):
```tsx
import { format, addMonths, startOfMonth, endOfMonth } from 'date-fns'
```
Current line 31:
```tsx
const isAdvancingRef = useRef(false)
```

- [ ] **Step 1: Add `useLayoutEffect` to React imports**

Change line 1 to:
```tsx
import { useRef, useState, useCallback, useLayoutEffect } from 'react'
```
Note: `useEffect` is no longer needed — remove it here.

- [ ] **Step 2: Add `getDaysInMonth` to date-fns imports**

Change line 7 to:
```tsx
import { format, addMonths, startOfMonth, endOfMonth, getDaysInMonth } from 'date-fns'
```

- [ ] **Step 3: Replace `isAdvancingRef` declaration with three new refs**

Remove line 31:
```tsx
const isAdvancingRef = useRef(false)
```
Add in its place:
```tsx
const pendingTrimPxRef = useRef(0)       // px to subtract from scrollLeft after left-trim
const isButtonNavRef = useRef(false)     // true when Önceki/Sonraki button was clicked
const viewStartRef = useRef(viewStart)   // always-current viewStart for scroll handler
```

- [ ] **Step 4: Confirm no remaining `isAdvancingRef` references exist**

Run:
```bash
grep -n "isAdvancingRef" mfg-planner/src/components/Gantt/GanttChart.tsx
```
Expected: no output (zero matches). If any remain, remove them.

- [ ] **Step 5: Verify TypeScript compiles after import/ref changes**

```bash
cd mfg-planner && npx tsc --noEmit
```
Expected: no errors.

---

### Task 2: Replace `shiftMonth`, `handleScroll`, and effects

**Files:**
- Modify: `mfg-planner/src/components/Gantt/GanttChart.tsx`

The block to delete is everything from the `shiftMonth` function through the closing of the `useEffect([viewStart])` — currently lines 52–75:

```tsx
/** Görünüm penceresini `months` ay kaydır, pencere boyutunu koru */
const shiftMonth = (months: number) => {
  setViewStart((d) => startOfMonth(addMonths(d, months)))
  setViewEnd((d) => endOfMonth(addMonths(d, months)))
}

/** Sağ kenara ulaşınca otomatik olarak 3 ay ilerle */
const handleScroll = useCallback(() => {
  const el = scrollRef.current
  if (!el || isAdvancingRef.current) return
  if (el.scrollLeft + el.clientWidth >= el.scrollWidth - DAY_WIDTH * 2) {
    isAdvancingRef.current = true
    setViewStart((d) => startOfMonth(addMonths(d, 3)))
    setViewEnd((d) => endOfMonth(addMonths(d, 3)))
  }
}, [])

/** İlerleme sonrası scroll'u sıfırla */
useEffect(() => {
  if (isAdvancingRef.current && scrollRef.current) {
    scrollRef.current.scrollLeft = 0
    isAdvancingRef.current = false
  }
}, [viewStart])
```

- [ ] **Step 6: Delete lines 52–75 (old shiftMonth + handleScroll + useEffect)**

After deletion, insert in their place:

```tsx
// Keep viewStartRef current so handleScroll (stale closure) always reads the live value.
// Plain render-body assignment — intentional, runs before any event handler each render.
viewStartRef.current = viewStart

/** Buton navigasyonu: pencereyi `months` ay kaydır, scroll'u başa al */
const shiftMonth = (months: number) => {
  isButtonNavRef.current = true
  setViewStart((d) => startOfMonth(addMonths(d, months)))
  setViewEnd((d) => endOfMonth(addMonths(d, months)))
}

/**
 * Kayan pencere scroll handler.
 *
 * Sağa genişlet (extend right):
 *   Sağda 1 aydan az içerik kaldıysa viewEnd'e 1 ay ekle.
 *   scrollLeft değişmez — içerik sağdan büyür, kullanıcı kaymayı hissetmez.
 *
 * Soldan kırp (trim left):
 *   Birinci ay + 3 günlük buffer tamamen geçildiyse:
 *   pendingTrimPxRef'e o ayın piksel genişliğini yaz, viewStart'ı 1 ay ilerlet.
 *   useLayoutEffect boya öncesi scrollLeft'i kompanse eder.
 *
 * `else if`: her iki işlem aynı scroll eventında çalışmaz —
 *   trim sırasında useLayoutEffect'in hesapladığı piksel değeri tutarlı kalır.
 */
const handleScroll = useCallback(() => {
  const el = scrollRef.current
  if (!el || pendingTrimPxRef.current > 0) return

  const { scrollLeft, scrollWidth, clientWidth } = el
  const firstMonthPx = getDaysInMonth(viewStartRef.current) * DAY_WIDTH

  if (scrollLeft + clientWidth >= scrollWidth - firstMonthPx) {
    // Sağa genişlet
    setViewEnd((d) => endOfMonth(addMonths(d, 1)))
  } else if (scrollLeft > firstMonthPx + DAY_WIDTH * 3) {
    // Soldan kırp — kompansasyon useLayoutEffect'te yapılır
    pendingTrimPxRef.current = firstMonthPx
    setViewStart((d) => startOfMonth(addMonths(d, 1)))
  }
}, [])

/**
 * viewStart her değiştiğinde boyadan önce çalışır.
 *
 * Trim kompansasyonu:
 *   pendingTrimPxRef sıfırlanır ÖNCE, sonra DOM mutasyonu yapılır.
 *   Böylece scrollLeft değişiminin tetiklediği yeni scroll eventi
 *   pendingTrimPxRef = 0 görür ve ikinci trim çalışmaz.
 *
 * Buton navigasyonu:
 *   isButtonNavRef set edilmişse scroll sıfırlanır.
 */
useLayoutEffect(() => {
  const trimPx = pendingTrimPxRef.current
  pendingTrimPxRef.current = 0      // önce sıfırla — re-entry'i engeller
  if (trimPx > 0 && scrollRef.current) {
    scrollRef.current.scrollLeft -= trimPx
  }
  if (isButtonNavRef.current && scrollRef.current) {
    scrollRef.current.scrollLeft = 0
    isButtonNavRef.current = false
  }
}, [viewStart])
```

- [ ] **Step 7: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors.

---

### Task 3: Manual verification

- [ ] **Step 8: Start dev server**

```bash
npm run dev --prefix mfg-planner -- --port 5174
```
Open http://localhost:5174 → Planlama tab.

- [ ] **Step 9: Smoke test — continuous right scroll**

Scroll the Gantt timeline slowly to the right until you pass the current 3-month window.

**Pass criteria (all must be true):**
- New month header appears on the right before hitting the hard edge
- `scrollLeft` does NOT reset to 0 at any point
- Order blocks remain in correct visual positions throughout (no blocks "jumping" left)
- Toolbar label (e.g., "March 2026 — May 2026") updates to include the new month
- No flash, blink, or white-screen moment

**Fail criteria (any = fail):**
- Page visibly scrolls back to the beginning
- Order block positions shift during scrolling
- Any render artifact (blank grid, missing month header)

- [ ] **Step 10: Smoke test — old months silently drop**

Continue scrolling right for 2+ months past the initial viewStart.

**Pass criteria:**
- The original start month (e.g., March) eventually disappears from the left without any visible jump
- Total content width stays approximately constant (3–4 months visible at a time)
- Scroll position does not reset

- [ ] **Step 11: Smoke test — button navigation**

Click "← Önceki" and "Sonraki →" buttons.

**Pass criteria:**
- Window shifts 1 month in the correct direction
- Scroll resets to position 0 (leftmost day of the new window is visible)
- Toolbar label updates to new range

- [ ] **Step 12: Smoke test — drag-and-drop date accuracy**

Drag an order block to a new position while scrolled ~2 months into the timeline.

**Pass criteria:**
- Block drops at the visually-indicated date (correct day column)
- No off-by-one month in the assigned `start_date` (verify by clicking the block to open OrderForm and confirming the date)

- [ ] **Step 13: Commit**

```bash
cd mfg-planner
git add src/components/Gantt/GanttChart.tsx
git commit -m "feat: continuous sliding-window scroll in Gantt timeline"
```

---

## Key Invariants

| Invariant | How enforced |
|-----------|--------------|
| Only one trim in-flight | `pendingTrimPxRef.current > 0` guard at top of `handleScroll` |
| Trim and extend never fire in same event | `else if` in `handleScroll` |
| No double-trim from scroll re-entry after DOM mutation | `pendingTrimPxRef.current = 0` set before `scrollLeft` is mutated |
| Drag-drop pixel math correct after trim | `handleDragEnd` reads `viewStart` from closure — same value that shifted blocks |
| Button nav always resets scroll | `isButtonNavRef.current = true` set before both `setViewStart` + `setViewEnd` |
