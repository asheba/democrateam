import { useEffect, useMemo, useState } from 'react';
import { type Candidate } from '../lib/candidates';
import {
  MAX_SELECTION,
  MIN_SELECTION,
  isValidCount,
  loadSelection,
  saveSelection,
} from '../lib/selection';
import { t, fmt } from '../i18n';
import CandidateCard from './CandidateCard';
import './CandidateGrid.css';

interface Props {
  candidates: Candidate[];
}

export default function CandidateGrid({ candidates }: Props) {
  const byId = useMemo(() => new Map(candidates.map((c) => [c.id, c])), [candidates]);
  const [selected, setSelected] = useState<string[]>([]);
  const [warnTooMany, setWarnTooMany] = useState(false);

  // Hydrate from localStorage on mount; keep only ids that still exist.
  useEffect(() => {
    setSelected(loadSelection().filter((id) => byId.has(id)));
  }, [byId]);

  // Persist on every change.
  useEffect(() => {
    saveSelection(selected);
  }, [selected]);

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) {
        setWarnTooMany(false);
        return prev.filter((x) => x !== id);
      }
      if (prev.length >= MAX_SELECTION) {
        setWarnTooMany(true);
        return prev; // block the 9th
      }
      setWarnTooMany(false);
      return [...prev, id];
    });
  };

  const count = selected.length;
  const canShare = isValidCount(count);
  const selectedCandidates = selected
    .map((id) => byId.get(id))
    .filter((c): c is Candidate => Boolean(c));

  return (
    <>
      <div className="cand-grid">
        {candidates.map((c) => (
          <CandidateCard
            key={c.id}
            candidate={c}
            selectable
            selected={selectedSet.has(c.id)}
            onToggle={toggle}
          />
        ))}
      </div>

      {count > 0 && (
        <div className="selbar" role="region" aria-label={t.selection.barTitle}>
          <div className="selbar-inner container">
            <div className="selbar-avatars">
              {selectedCandidates.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="selbar-chip"
                  onClick={() => toggle(c.id)}
                  title={`${c.name} — ${t.selection.remove}`}
                  aria-label={`${c.name} — ${t.selection.remove}`}
                >
                  <img src={c.photo} alt="" width={36} height={36} />
                  <span className="selbar-name">{c.name}</span>
                  <span className="selbar-x" aria-hidden="true">×</span>
                </button>
              ))}
            </div>

            <div className="selbar-actions">
              <div className="selbar-status">
                <strong>{fmt(t.selection.counter, { count })}</strong>
                <span className={`selbar-rule${canShare ? ' ok' : ''}`}>
                  {warnTooMany ? t.selection.tooMany : t.selection.rule}
                </span>
              </div>
              <a
                className="btn"
                href="/share"
                aria-disabled={!canShare}
                onClick={(e) => {
                  if (!canShare) e.preventDefault();
                }}
              >
                {t.selection.shareButton}
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
