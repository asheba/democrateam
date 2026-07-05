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
  /** When provided, a "more" button opens the full-profile modal for this id. */
  onMore?: (id: string) => void;
}

export default function CandidateCard({
  candidate,
  selectable,
  selected,
  onToggle,
  onMore,
}: Props) {
  // On the main grid (where `onMore` is provided) the website is lifted into its
  // own row beside "more" so the compact card's social-icon row can't overflow.
  // Everywhere else — notably the profile popup — it stays inline in the
  // social-icon row, matching the design of the other buttons.
  const liftWebsite = Boolean(onMore);
  const website = liftWebsite ? candidate.links.website : undefined;
  const links = LINK_ORDER.filter(
    (key) => candidate.links[key] && !(liftWebsite && key === 'website'),
  );

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
      </div>

      <div className="cand-body">
        <h3 className="cand-name">
          {candidate.title ? <span className="cand-title">{candidate.title} </span> : null}
          {candidate.name}
        </h3>
        <p className="cand-bio">{candidate.bio}</p>

        {(website || onMore) && (
          <div className="cand-meta">
            {website && (
              <a
                className="cand-website"
                href={website}
                target="_blank"
                rel="noopener noreferrer"
                title={t.links.website}
                aria-label={t.links.website}
                onClick={(e) => e.stopPropagation()}
              >
                {LINK_ICONS.website}
              </a>
            )}
            {onMore && (
              <button
                type="button"
                className="cand-more"
                onClick={(e) => {
                  e.stopPropagation();
                  onMore(candidate.id);
                }}
              >
                {t.home.more}
              </button>
            )}
          </div>
        )}

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
