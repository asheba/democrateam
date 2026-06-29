import { useEffect, useMemo, useState } from 'react';
import { type Candidate } from '../lib/candidates';
import {
  MAX_SELECTION,
  MIN_SELECTION,
  isValidCount,
  loadSelection,
  clearSelection,
} from '../lib/selection';
import { MAX_EXPLANATION, MAX_SUMMARY, MAX_VOTER_NAME } from '../lib/limits';
import { t, fmt } from '../i18n';
import CandidateCard from './CandidateCard';
import './ShareForm.css';

interface Props {
  candidates: Candidate[];
}

export default function ShareForm({ candidates }: Props) {
  const byId = useMemo(() => new Map(candidates.map((c) => [c.id, c])), [candidates]);

  const [ready, setReady] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [voterName, setVoterName] = useState('');
  const [voterImage, setVoterImage] = useState('');
  const [summary, setSummary] = useState('');
  const [explanations, setExplanations] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalId, setModalId] = useState<string | null>(null);
  const [openExplainId, setOpenExplainId] = useState<string | null>(null);

  useEffect(() => {
    setSelectedIds(loadSelection().filter((id) => byId.has(id)));
    setReady(true);
  }, [byId]);

  const selected = selectedIds
    .map((id) => byId.get(id))
    .filter((c): c is Candidate => Boolean(c));

  const countOk = isValidCount(selected.length);
  const nameOk = voterName.trim().length > 0;
  const canSubmit = ready && countOk && nameOk && !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voterName: voterName.trim(),
          voterImage: voterImage.trim() || null,
          summary: summary.trim() || null,
          selections: selected.map((c) => ({
            candidateId: c.id,
            explanation: (explanations[c.id] ?? '').trim(),
          })),
        }),
      });
      if (!res.ok) {
        setError(res.status === 400 ? t.share.errorRange : t.share.errorGeneric);
        setSubmitting(false);
        return;
      }
      const data = (await res.json()) as { uuid: string };
      clearSelection();
      window.location.href = `/team/${data.uuid}`;
    } catch {
      setError(t.share.errorGeneric);
      setSubmitting(false);
    }
  }

  if (ready && selected.length === 0) {
    return (
      <div className="share-empty">
        <p>{t.share.noSelection}</p>
        <a className="btn" href="/">{t.share.backHome}</a>
      </div>
    );
  }

  return (
    <form className="share-form" onSubmit={handleSubmit}>
      <div className="share-meta">
        <div className="share-meta-top">
          <label className="field">
            <span className="field-label">
              {t.share.voterNameLabel} <span className="req">*</span>
            </span>
            <input
              type="text"
              value={voterName}
              maxLength={MAX_VOTER_NAME}
              placeholder={t.share.voterNamePlaceholder}
              onChange={(e) => setVoterName(e.target.value)}
              required
            />
          </label>

          <label className="field">
            <span className="field-label">{t.share.voterImageLabel}</span>
            <input
              type="url"
              value={voterImage}
              placeholder={t.share.voterImagePlaceholder}
              onChange={(e) => setVoterImage(e.target.value)}
            />
          </label>
        </div>

        <label className="field">
          <span className="field-label">{t.share.summaryLabel}</span>
          <textarea
            value={summary}
            maxLength={MAX_SUMMARY}
            placeholder={t.share.summaryPlaceholder}
            rows={3}
            onChange={(e) => setSummary(e.target.value)}
          />
          <span className="counter">
            {fmt(t.share.charsLeft, { n: MAX_SUMMARY - summary.length })}
          </span>
        </label>
      </div>

      <div className="mini-cards-grid">
        {selected.map((c) => {
          const val = explanations[c.id] ?? '';
          const explainOpen = openExplainId === c.id;
          return (
            <div className="mini-card" key={c.id}>
              <div className="mini-card-top">
                <div className="mini-card-thumb">
                  <img
                    src={c.photo}
                    alt={c.name}
                    width={90}
                    height={90}
                    className="mini-card-photo"
                  />
                  <button
                    type="button"
                    className="mini-card-info-btn"
                    aria-label={t.share.candidateProfile}
                    onClick={() => setModalId(c.id)}
                  >
                    i
                  </button>
                </div>
                <div className="mini-card-main">
                  <span className="mini-card-name">
                    {c.title ? <span className="cand-title">{c.title} </span> : null}
                    {c.name}
                  </span>
                  <button
                    type="button"
                    className="btn-explain-link"
                    onClick={() => setOpenExplainId(explainOpen ? null : c.id)}
                  >
                    {t.share.explainChoice}
                  </button>
                </div>
              </div>
              {explainOpen && (
                <label className="field mini-card-explain">
                  <textarea
                    value={val}
                    maxLength={MAX_EXPLANATION}
                    placeholder={fmt(t.share.explanationPlaceholder, { name: c.name })}
                    rows={3}
                    onChange={(e) =>
                      setExplanations((prev) => ({ ...prev, [c.id]: e.target.value }))
                    }
                  />
                  {MAX_EXPLANATION - val.length <= 50 && (
                    <span className="counter">
                      {fmt(t.share.charsLeft, { n: MAX_EXPLANATION - val.length })}
                    </span>
                  )}
                </label>
              )}
            </div>
          );
        })}
      </div>

      {error && <p className="share-error">{error}</p>}

      {modalId && (() => {
        const mc = byId.get(modalId);
        return mc ? (
          <div
            className="cand-modal-backdrop"
            onClick={() => setModalId(null)}
            role="dialog"
            aria-modal="true"
          >
            <div className="cand-modal-inner" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="cand-modal-close"
                aria-label={t.share.close}
                onClick={() => setModalId(null)}
              >
                ×
              </button>
              <CandidateCard candidate={mc} />
            </div>
          </div>
        ) : null;
      })()}

      <div className="share-submit">
        <button type="submit" className="btn" disabled={!canSubmit}>
          {submitting ? t.share.submitting : t.share.submit}
        </button>
      </div>
    </form>
  );
}
