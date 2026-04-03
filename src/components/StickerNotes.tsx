"use client";
import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import type { Entry } from "@/types";
import { formatDuration } from "@/lib/utils";

import { prepare, layout } from "@chenglou/pretext";
import type { PreparedText } from "@chenglou/pretext";

const COLUMN_COUNT = 3;
const GAP = 12;
const CARD_PADDING = 24;
const HEADER_HEIGHT = 24;
const FONT = "14px system-ui, -apple-system, sans-serif";
const LINE_HEIGHT = 20;

const PIKA_W = 36;
const PIKA_H = 32;

interface Props {
  entries: Entry[];
}

interface CardPosition {
  entry: Entry;
  x: number;
  y: number;
  width: number;
  height: number;
}

// ── Masonry layout (unchanged) ──────────────────────────────────────────────

export function StickerNotes({ entries }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  const notesEntries = useMemo(
    () => entries.filter((e) => e.description && e.description.trim().length > 0),
    [entries]
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((obs) => {
      for (const entry of obs) setContainerWidth(entry.contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const positions = useMemo((): CardPosition[] => {
    if (containerWidth === 0 || notesEntries.length === 0) return [];
    const cols = containerWidth < 500 ? 1 : containerWidth < 768 ? 2 : COLUMN_COUNT;
    const colWidth = (containerWidth - GAP * (cols - 1)) / cols;
    const textWidth = colWidth - CARD_PADDING;

    const prepared: PreparedText[] = notesEntries.map((e) => prepare(e.description, FONT));
    const heights = prepared.map((p) => {
      const result = layout(p, textWidth, LINE_HEIGHT);
      return result.height + HEADER_HEIGHT + CARD_PADDING + 8; // +8 extra padding
    });

    const columnHeights = new Array(cols).fill(0);
    const result: CardPosition[] = [];
    for (let i = 0; i < notesEntries.length; i++) {
      let minCol = 0;
      for (let c = 1; c < cols; c++) {
        if (columnHeights[c] < columnHeights[minCol]) minCol = c;
      }
      const xp = minCol * (colWidth + GAP);
      const yp = columnHeights[minCol];
      result.push({ entry: notesEntries[i], x: xp, y: yp, width: colWidth, height: heights[i] });
      columnHeights[minCol] += heights[i] + GAP;
    }
    return result;
  }, [containerWidth, notesEntries]);

  if (notesEntries.length === 0) return null;

  const totalHeight = positions.length > 0
    ? Math.max(...positions.map((p) => p.y + p.height))
    : 0;

  return (
    <div className="space-y-3">
      <h2 className="font-semibold text-gray-700 dark:text-gray-300 text-sm uppercase tracking-wide">
        Notes
      </h2>
      <div ref={containerRef} className="relative" style={{ height: totalHeight || "auto" }}>
        {positions.map((pos) => (
          <StickerCard key={pos.entry.id} pos={pos} />
        ))}
      </div>
    </div>
  );
}

// ── Character-level measurement ─────────────────────────────────────────────

// Shared canvas for character width measurement
let _canvas: HTMLCanvasElement | null = null;
let _ctx: CanvasRenderingContext2D | null = null;
const _charWidthCache = new Map<string, number>();

function getCharWidth(char: string): number {
  const cached = _charWidthCache.get(char);
  if (cached !== undefined) return cached;

  if (!_canvas) {
    _canvas = document.createElement("canvas");
    _ctx = _canvas.getContext("2d");
  }
  if (!_ctx) return 8; // fallback
  _ctx.font = FONT;
  const w = _ctx.measureText(char).width;
  _charWidthCache.set(char, w);
  return w;
}

// ── Character-level types and layout ────────────────────────────────────────

type CharInfo = {
  char: string;
  width: number;
  isSpace: boolean;
  isNewline: boolean;
};

type CharPos = { x: number; y: number };

function buildChars(text: string): CharInfo[] {
  const result: CharInfo[] = [];
  for (const char of text) {
    if (char === "\n") {
      result.push({ char, width: 0, isSpace: false, isNewline: true });
    } else if (char === " ") {
      result.push({ char, width: getCharWidth(" "), isSpace: true, isNewline: false });
    } else {
      result.push({ char, width: getCharWidth(char), isSpace: false, isNewline: false });
    }
  }
  return result;
}

/**
 * Layout characters into lines with an optional rectangular obstacle.
 * Characters individually flow around the obstacle.
 */
function layoutCharsWithObstacle(
  chars: CharInfo[],
  maxWidth: number,
  lineHeight: number,
  obstacle: { ox: number; oy: number; ow: number; oh: number } | null,
): CharPos[] {
  const positions: CharPos[] = [];
  let cx = 0;
  let cy = 0;

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];

    if (ch.isNewline) {
      positions.push({ x: cx, y: cy });
      cx = 0;
      cy += lineHeight;
      continue;
    }

    // Wrap if character doesn't fit on current line (unless at start of line)
    if (cx + ch.width > maxWidth && cx > 0) {
      cx = 0;
      cy += lineHeight;
    }

    // Check obstacle overlap
    if (obstacle && !ch.isSpace) {
      const { ox, oy, ow, oh } = obstacle;
      const charTop = cy;
      const charBottom = cy + lineHeight;

      // Vertical overlap with obstacle?
      if (charBottom > oy && charTop < oy + oh) {
        const charLeft = cx;
        const charRight = cx + ch.width;

        // Horizontal overlap?
        if (charRight > ox && charLeft < ox + ow) {
          // Jump past the obstacle on this line
          const afterObs = ox + ow + 2;
          if (afterObs + ch.width <= maxWidth) {
            cx = afterObs;
          } else {
            // Wrap below obstacle
            cx = 0;
            cy += lineHeight;
            // If still overlapping vertically, push below
            if (cy + lineHeight > oy && cy < oy + oh) {
              if (cx + ch.width > ox && cx < ox + ow) {
                cy = oy + oh;
                cx = 0;
              }
            }
          }
        }
      }
    }

    positions.push({ x: cx, y: cy });
    cx += ch.width;
  }

  return positions;
}

// ── Sticker Card with character-level scatter ───────────────────────────────

function StickerCard({ pos }: { pos: CardPosition }) {
  const { entry, x, y, width, height } = pos;
  const [expanded, setExpanded] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);
  const charSpanRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const pikaRef = useRef<HTMLDivElement>(null);
  const rafId = useRef<number>(0);
  const activeRef = useRef(false);
  const color = entry.category_color || "#6B7280";
  const textWidth = width - CARD_PADDING;

  const chars = useMemo(() => buildChars(entry.description), [entry.description]);

  const basePositions = useMemo(
    () => layoutCharsWithObstacle(chars, textWidth, LINE_HEIGHT, null),
    [chars, textWidth]
  );

  // Container height from base layout — ensure ALL text is visible
  const baseHeight = useMemo(() => {
    if (basePositions.length === 0) return LINE_HEIGHT;
    const maxY = Math.max(...basePositions.map((p) => p.y));
    return maxY + LINE_HEIGHT + 4; // +4 padding
  }, [basePositions]);

  const applyPositions = useCallback((positions: CharPos[]) => {
    for (let i = 0; i < charSpanRefs.current.length; i++) {
      const span = charSpanRefs.current[i];
      const base = basePositions[i];
      const target = positions[i];
      if (!span || !base || !target) continue;

      const dx = target.x - base.x;
      const dy = target.y - base.y;
      if (Math.abs(dx) < 0.3 && Math.abs(dy) < 0.3) {
        span.style.transform = "";
      } else {
        span.style.transform = `translate(${dx}px, ${dy}px)`;
      }
    }
  }, [basePositions]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(() => {
      const textEl = textRef.current;
      const pika = pikaRef.current;
      if (!textEl || !pika) return;

      const rect = textEl.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      if (mx < -4 || mx > rect.width + 4 || my < -4 || my > rect.height + 4) {
        if (activeRef.current) {
          activeRef.current = false;
          pika.style.opacity = "0";
          for (const span of charSpanRefs.current) {
            if (span) span.style.transition = "transform 0.3s ease-out";
          }
          applyPositions(basePositions);
        }
        return;
      }

      activeRef.current = true;
      pika.style.opacity = "1";
      pika.style.transform = `translate(${mx - PIKA_W / 2}px, ${my - PIKA_H / 2}px)`;

      const obstacle = {
        ox: mx - PIKA_W / 2,
        oy: my - PIKA_H / 2,
        ow: PIKA_W,
        oh: PIKA_H,
      };

      const newPositions = layoutCharsWithObstacle(chars, textWidth, LINE_HEIGHT, obstacle);

      for (const span of charSpanRefs.current) {
        if (span) span.style.transition = "transform 0.1s ease-out";
      }
      applyPositions(newPositions);
    });
  }, [chars, textWidth, basePositions, applyPositions]);

  const handleMouseLeave = useCallback(() => {
    cancelAnimationFrame(rafId.current);
    if (!activeRef.current) return;
    activeRef.current = false;
    const pika = pikaRef.current;
    if (pika) pika.style.opacity = "0";
    for (const span of charSpanRefs.current) {
      if (span) span.style.transition = "transform 0.3s ease-out";
    }
    applyPositions(basePositions);
  }, [basePositions, applyPositions]);

  return (
    <div
      className="absolute group"
      style={{
        left: x,
        top: y,
        width,
        minHeight: expanded ? undefined : height,
        cursor: "url(/pikachu-cursor.svg) 16 16, auto",
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={() => setExpanded((v) => !v)}
    >
      <div
        className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-visible"
        style={{ borderLeftWidth: 3, borderLeftColor: color }}
      >
        <div className="p-3 bg-white dark:bg-gray-900 rounded-lg">
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
            <span className="text-xs font-semibold" style={{ color }}>{entry.category_name}</span>
            <span className="text-xs text-gray-400 ml-auto">{formatDuration(entry.duration_minutes)}</span>
          </div>

          {/* Character-level text — each char independently positioned */}
          <div
            ref={textRef}
            className="relative text-sm text-gray-600 dark:text-gray-300 overflow-visible"
            style={{ height: baseHeight, lineHeight: `${LINE_HEIGHT}px`, font: FONT }}
          >
            {/* Pikachu ghost overlay */}
            <div
              ref={pikaRef}
              className="pointer-events-none absolute z-10"
              style={{
                width: PIKA_W,
                height: PIKA_H,
                opacity: 0,
                transition: "opacity 0.15s ease-out",
                willChange: "transform",
              }}
              aria-hidden="true"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/pikachu-cursor.svg"
                alt=""
                width={PIKA_W}
                height={PIKA_H}
                style={{ filter: "drop-shadow(0 0 6px rgba(255, 215, 0, 0.5))" }}
              />
            </div>

            {/* Individual characters */}
            {chars.map((ch, i) => {
              if (ch.isNewline) return null;
              const bp = basePositions[i];
              if (!bp) return null;
              return (
                <span
                  key={i}
                  ref={(el) => { charSpanRefs.current[i] = el; }}
                  className="absolute"
                  style={{
                    left: bp.x,
                    top: bp.y,
                    willChange: "transform",
                  }}
                >
                  {ch.char}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
