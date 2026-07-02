import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { type Candidate } from '../lib/candidates';
import { t } from '../i18n';
import CandidateCard from './CandidateCard';
import './TeamGrid.css';
import './candidate-modal.css';

interface Row {
  candidate: Candidate;
  explanation: string;
}

interface Props {
  rows: Row[];
}

/**
 * The "why chosen" note. The "i" reveals the explanation on hover (desktop) or
 * tap (mobile). The popover is portalled to <body> and positioned with fixed
 * coordinates so it can grow large and overflow the card's `overflow: hidden`.
 */
function NoteTooltip({ label, text }: { label: string; text: string }) {
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState<CSSProperties>({});
  const [canHover] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches,
  );
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const place = () => {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const margin = 12;
    const width = Math.min(420, window.innerWidth - margin * 2);
    // Right-align the popover with the button (RTL), then clamp into the viewport.
    let left = r.right - width;
    left = Math.max(margin, Math.min(left, window.innerWidth - margin - width));
    const spaceBelow = window.innerHeight - r.bottom;
    const spaceAbove = r.top;
    const base: CSSProperties = { left, width };
    // Drop below the button when there's room, otherwise flip above.
    if (spaceBelow >= 220 || spaceBelow >= spaceAbove) {
      setStyle({ ...base, top: r.bottom + 8, maxHeight: spaceBelow - margin });
    } else {
      setStyle({ ...base, bottom: window.innerHeight - r.top + 8, maxHeight: spaceAbove - margin });
    }
  };

  const show = () => {
    clearTimeout(hideTimer.current);
    place();
    setOpen(true);
  };
  const hideSoon = () => {
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setOpen(false), 120);
  };

  useEffect(() => {
    if (!open) return;
    const reposition = () => place();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (btnRef.current?.contains(target) || popRef.current?.contains(target)) return;
      setOpen(false);
    };
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    window.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  return (
    <span className="tcard-note">
      <button
        ref={btnRef}
        type="button"
        className="tcard-note-btn"
        aria-label={label}
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          if (canHover) return;
          if (open) setOpen(false);
          else show();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') e.stopPropagation();
        }}
        onMouseEnter={canHover ? show : undefined}
        onMouseLeave={canHover ? hideSoon : undefined}
        onFocus={canHover ? show : undefined}
        onBlur={canHover ? hideSoon : undefined}
      >
        i
      </button>
      {open &&
        createPortal(
          <div
            ref={popRef}
            className="tcard-note-pop"
            role="tooltip"
            style={style}
            onMouseEnter={canHover ? show : undefined}
            onMouseLeave={canHover ? hideSoon : undefined}
          >
            <strong>{label}</strong>
            <span>{text}</span>
          </div>,
          document.body,
        )}
    </span>
  );
}

export default function TeamGrid({ rows }: Props) {
  const [modalId, setModalId] = useState<string | null>(null);
  const active = rows.find((r) => r.candidate.id === modalId) ?? null;

  return (
    <>
      <div className="tgrid">
        {rows.map(({ candidate: c, explanation }) => {
          const open = () => setModalId(c.id);
          return (
            <article
              key={c.id}
              className="tcard"
              role="button"
              tabIndex={0}
              aria-label={`${t.team.viewProfile}: ${c.name}`}
              onClick={open}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  open();
                }
              }}
            >
              <div className="tcard-photo-wrap">
                <img
                  className="tcard-photo"
                  src={c.photo}
                  alt={c.name}
                  loading="lazy"
                  decoding="async"
                  width={200}
                  height={200}
                />
                {explanation ? (
                  <NoteTooltip label={t.team.explanationHeading} text={explanation} />
                ) : null}
              </div>
              <div className="tcard-body">
                <h3 className="tcard-name">
                  {c.title ? <span className="cand-title">{c.title} </span> : null}
                  {c.name}
                </h3>
                <p className="tcard-bio">{c.bio}</p>
              </div>
            </article>
          );
        })}
      </div>

      {active && (
        <div
          className="cand-modal-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={() => setModalId(null)}
        >
          <div className="cand-modal-inner" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="cand-modal-close"
              aria-label={t.team.close}
              onClick={() => setModalId(null)}
            >
              ×
            </button>
            <CandidateCard candidate={active.candidate} />
          </div>
        </div>
      )}
    </>
  );
}
