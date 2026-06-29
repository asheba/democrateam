import { type Candidate, LINK_ORDER } from '../lib/candidates';
import { t } from '../i18n';
import { LINK_ICONS } from './icons';
import './CandidateCard.css';

interface Props {
  candidate: Candidate;
  /** When true the card body acts as a selection toggle. */
  selectable?: boolean;
  selected?: boolean;
  onToggle?: (id: string) => void;
  /** Optional note shown via an info tooltip on the photo (e.g. why chosen). CSS-only, no JS. */
  note?: string;
  noteLabel?: string;
}

export default function CandidateCard({
  candidate,
  selectable,
  selected,
  onToggle,
  note,
  noteLabel,
}: Props) {
  const links = LINK_ORDER.filter((key) => candidate.links[key]);

  const toggle = () => {
    if (selectable) onToggle?.(candidate.id);
  };

  return (
    <article
      className={`cand-card${selectable ? ' is-selectable' : ''}${selected ? ' is-selected' : ''}`}
      data-id={candidate.id}
      onClick={selectable ? toggle : undefined}
      role={selectable ? 'button' : undefined}
      aria-pressed={selectable ? selected : undefined}
      aria-label={selectable ? `${t.selection.selectAria}: ${candidate.name}` : undefined}
      tabIndex={selectable ? 0 : undefined}
      onKeyDown={
        selectable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggle();
              }
            }
          : undefined
      }
    >
      {selected && <span className="cand-badge">{t.selection.selectedBadge}</span>}

      <div className="cand-photo-wrap">
        <img
          className="cand-photo"
          src={candidate.photo}
          alt={candidate.name}
          loading="lazy"
          decoding="async"
          width={400}
          height={400}
        />
        {note ? (
          <span className="cand-note">
            <button
              type="button"
              className="cand-note-btn"
              aria-label={noteLabel ?? note}
              onClick={(e) => e.stopPropagation()}
            >
              i
            </button>
            <span className="cand-note-pop" role="tooltip">
              {noteLabel ? <strong>{noteLabel}</strong> : null}
              <span>{note}</span>
            </span>
          </span>
        ) : null}
      </div>

      <div className="cand-body">
        <h3 className="cand-name">
          {candidate.title ? <span className="cand-title">{candidate.title} </span> : null}
          {candidate.name}
        </h3>
        <p className="cand-bio">{candidate.bio}</p>

        {links.length > 0 && (
          <div className="cand-links">
            {links.map((key) => (
              <a
                key={key}
                className={`cand-link cand-link--${key}`}
                href={candidate.links[key]}
                target="_blank"
                rel="noopener noreferrer"
                title={t.links[key]}
                aria-label={t.links[key]}
                onClick={(e) => e.stopPropagation()}
              >
                {LINK_ICONS[key]}
              </a>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
