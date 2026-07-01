import { useEffect, useMemo, useRef, useState } from 'react';
import { type Candidate } from '../lib/candidates';
import {
  MAX_SELECTION,
  isValidCount,
  loadSelection,
  saveSelection,
  loadTeamCredentials,
  clearTeamCredentials,
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
  const [query, setQuery] = useState('');
  const [showWomen, setShowWomen] = useState(true);
  const [showMen, setShowMen] = useState(true);
  const [isLoadingServer, setIsLoadingServer] = useState(false);
  const [serverLoaded, setServerLoaded] = useState(false);
  const didHydrate = useRef(false);

  useEffect(() => {
    const creds = loadTeamCredentials();
    if (creds) {
      setIsLoadingServer(true);
      fetch(
        `/api/teams?uuid=${encodeURIComponent(creds.uuid)}&password=${encodeURIComponent(creds.password)}`,
      )
        .then(async (r) => {
          if (r.status === 401) {
            clearTeamCredentials();
            return null;
          }
          if (!r.ok) return null;
          return r.json() as Promise<{ selections: Array<{ candidateId: string }> }>;
        })
        .catch(() => null)
        .then((team) => {
          didHydrate.current = true;
          if (team) {
            const ids = team.selections
              .map((s) => s.candidateId)
              .filter((id) => byId.has(id));
            setSelected(ids);
            saveSelection(ids);
            setServerLoaded(true);
            setTimeout(() => setServerLoaded(false), 3000);
          } else {
            setSelected(loadSelection().filter((id) => byId.has(id)));
          }
          setIsLoadingServer(false);
        });
    } else {
      didHydrate.current = true;
      setSelected(loadSelection().filter((id) => byId.has(id)));
    }
  }, [byId]);

  // Persist on every change — guard prevents writing empty state before hydration.
  useEffect(() => {
    if (!didHydrate.current) return;
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
        return prev;
      }
      setWarnTooMany(false);
      return [...prev, id];
    });
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return candidates.filter((c) => {
      const isFemale = c.female === 'true';
      if (isFemale && !showWomen) return false;
      if (!isFemale && !showMen) return false;
      if (q && !(`${c.name} ${c.title} ${c.bio}`.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [candidates, query, showWomen, showMen]);

  const count = selected.length;
  const canShare = isValidCount(count);
  const selectedCandidates = selected
    .map((id) => byId.get(id))
    .filter((c): c is Candidate => Boolean(c));

  return (
    <>
      {isLoadingServer && (
        <p className="grid-status" role="status" aria-live="polite">
          {t.home.loading}
        </p>
      )}
      {serverLoaded && (
        <p className="grid-status grid-status--ok" role="status" aria-live="polite">
          {t.home.selectionLoaded}
        </p>
      )}

      <div className="cand-search" role="search">
        <input
          type="search"
          className="cand-search-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.home.searchPlaceholder}
          aria-label={t.home.searchLabel}
        />
        <label className="cand-search-check">
          <input
            type="checkbox"
            checked={showWomen}
            onChange={(e) => setShowWomen(e.target.checked)}
          />
          {t.home.filterWomen}
        </label>
        <label className="cand-search-check">
          <input
            type="checkbox"
            checked={showMen}
            onChange={(e) => setShowMen(e.target.checked)}
          />
          {t.home.filterMen}
        </label>
      </div>

      {filtered.length === 0 ? (
        <p className="grid-status">{t.home.noResults}</p>
      ) : (
        <div className="cand-grid">
          {filtered.map((c) => (
            <CandidateCard
              key={c.id}
              candidate={c}
              selectable
              selected={selectedSet.has(c.id)}
              onToggle={toggle}
            />
          ))}
        </div>
      )}

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
