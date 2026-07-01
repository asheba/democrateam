import { useState } from 'react';
import { type Candidate, LINK_ORDER } from '../lib/candidates';
import { t, fmt } from '../i18n';
import { LINK_SUMMARY_ICON } from './icons';
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

export default function TeamGrid({ rows }: Props) {
  const [modalId, setModalId] = useState<string | null>(null);
  const active = rows.find((r) => r.candidate.id === modalId) ?? null;

  return (
    <>
      <div className="tgrid">
        {rows.map(({ candidate: c, explanation }) => {
          const linkCount = LINK_ORDER.filter((k) => c.links[k]).length;
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
                  <span className="tcard-note-dot" title={t.team.explanationHeading} aria-hidden="true">
                    i
                  </span>
                ) : null}
              </div>
              <div className="tcard-body">
                <h3 className="tcard-name">
                  {c.title ? <span className="cand-title">{c.title} </span> : null}
                  {c.name}
                </h3>
                <p className="tcard-bio">{c.bio}</p>
                {linkCount > 0 && (
                  <span
                    className="tcard-links"
                    aria-label={fmt(t.team.linksLabel, { n: linkCount })}
                    title={fmt(t.team.linksLabel, { n: linkCount })}
                  >
                    <span className="tcard-links-count">{linkCount}</span>
                    {LINK_SUMMARY_ICON}
                  </span>
                )}
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
            <CandidateCard
              candidate={active.candidate}
              note={active.explanation || undefined}
              noteLabel={t.team.explanationHeading}
            />
          </div>
        </div>
      )}
    </>
  );
}
