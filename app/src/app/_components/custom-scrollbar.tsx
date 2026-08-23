"use client";

import { useEffect, useRef, useState } from "react";

const MIN_THUMB_HEIGHT = 40;
const TRACK_INSET = 2; // px from the viewport's right edge
// Matches .custom-scrollbar-thumb's width in globals.css — wide enough for
// the hovered (thicker) state to render without clipping against the
// wrapper's own box.
const TRACK_WIDTH = 14;

// Replaces the browser's own scrollbar (hidden globally — see globals.css)
// with a floating overlay that never reserves layout width, so switching
// between a page that scrolls and one that doesn't never shifts anything
// sideways. Tracks window scroll position directly since the app scrolls
// the whole page, not a boxed inner container (see the comment on
// SignedInPetApp's root div).
export function CustomScrollbar() {
  const [metrics, setMetrics] = useState<{
    thumbHeight: number;
    thumbTop: number;
  } | null>(null);
  const draggingRef = useRef<{ startY: number; startScrollTop: number } | null>(
    null,
  );

  useEffect(() => {
    function update() {
      const scrollHeight = document.documentElement.scrollHeight;
      const viewportHeight = window.innerHeight;
      // A few px of slack — some browsers report a 1px-off scrollHeight at
      // the exact "just barely fits" boundary, which would otherwise flash
      // a thumb for a page that doesn't really need to scroll.
      if (scrollHeight <= viewportHeight + 2) {
        setMetrics(null);
        return;
      }
      const thumbHeight = Math.max(
        MIN_THUMB_HEIGHT,
        (viewportHeight / scrollHeight) * viewportHeight,
      );
      const maxScrollTop = scrollHeight - viewportHeight;
      const maxThumbTop = viewportHeight - thumbHeight;
      const thumbTop =
        maxScrollTop > 0
          ? (window.scrollY / maxScrollTop) * maxThumbTop
          : 0;
      setMetrics({ thumbHeight, thumbTop });
    }

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    // Catches content height changes from navigation/data loading, which
    // don't fire a window "resize" event since the viewport itself hasn't
    // changed size.
    const ro = new ResizeObserver(update);
    ro.observe(document.body);

    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      ro.disconnect();
    };
  }, []);

  useEffect(() => {
    function onPointerMove(event: PointerEvent) {
      const drag = draggingRef.current;
      if (!drag) return;
      const scrollHeight = document.documentElement.scrollHeight;
      const viewportHeight = window.innerHeight;
      const thumbHeight = Math.max(
        MIN_THUMB_HEIGHT,
        (viewportHeight / scrollHeight) * viewportHeight,
      );
      const maxScrollTop = scrollHeight - viewportHeight;
      const maxThumbTop = viewportHeight - thumbHeight;
      if (maxThumbTop <= 0) return;
      const deltaRatio = (event.clientY - drag.startY) / maxThumbTop;
      window.scrollTo({ top: drag.startScrollTop + deltaRatio * maxScrollTop });
    }
    function onPointerUp() {
      draggingRef.current = null;
      document.body.style.userSelect = "";
    }
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, []);

  if (!metrics) return null;

  return (
    <div
      // Spans the full viewport height but only the thumb inside catches
      // pointer events — this wrapper itself is just a positioning
      // reference, not a click-blocking overlay.
      style={{
        position: "fixed",
        top: 0,
        right: TRACK_INSET,
        width: TRACK_WIDTH,
        height: "100vh",
        zIndex: 999,
        pointerEvents: "none",
      }}
    >
      <div
        className="custom-scrollbar-thumb"
        onPointerDown={(event) => {
          draggingRef.current = {
            startY: event.clientY,
            startScrollTop: window.scrollY,
          };
          document.body.style.userSelect = "none";
        }}
        style={{
          position: "absolute",
          top: metrics.thumbTop,
          right: 0,
          height: metrics.thumbHeight,
          pointerEvents: "auto",
        }}
      />
    </div>
  );
}
