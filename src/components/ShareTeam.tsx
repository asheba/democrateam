import { useState } from 'react';
import { t, fmt } from '../i18n';
import './ShareTeam.css';

interface ShareCandidate {
  name: string;
  title: string;
  photo: string;
}

interface Props {
  voterName: string;
  voterImage: string | null;
  verified: boolean;
  summary: string | null;
  candidates: ShareCandidate[];
  shareUrl: string;
}

const FONT = '"Noto Sans Hebrew", "Segoe UI", system-ui, sans-serif';

/** Build the plain-text version: sharer's name, their summary, the picks, then
 * the CTA + URL (mirrors the image footer). */
function buildText({ voterName, summary, candidates, shareUrl }: Props): string {
  const lines: string[] = [fmt(t.team.share.textTitle, { name: voterName })];
  if (summary?.trim()) lines.push('', summary.trim());
  lines.push('');
  candidates.forEach((c, i) => lines.push(`${i + 1}. ${c.name}`));
  lines.push('', `${t.team.share.textCta} ${shareUrl}`);
  return lines.join('\n');
}

/* ── Canvas helpers ─────────────────────────────────────────────────────── */

function loadImage(src: string, crossOrigin = false): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    if (crossOrigin) img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** Draw an image object-fit:cover into a rounded box (clipped). */
function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.save();
  roundRectPath(ctx, x, y, w, h, r);
  ctx.clip();
  const ar = img.width / img.height;
  let dw = w;
  let dh = w / ar;
  if (dh < h) {
    dh = h;
    dw = h * ar;
  }
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  ctx.restore();
}

function ellipsize(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let s = text;
  while (s.length > 1 && ctx.measureText(s + '…').width > maxWidth) s = s.slice(0, -1);
  return s + '…';
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const out: string[] = [];
  for (const paragraph of text.split('\n')) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    let line = '';
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width > maxWidth && line) {
        out.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    out.push(line);
  }
  return out;
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => Array.from(w)[0] ?? '')
    .join('');
}

/**
 * Render the whole team into a shareable JPEG on the client. Layout is a brand
 * header, the voter's avatar + name, a compact photo grid of the picks (photo +
 * name only — no bios), an optional summary card, and a footer with the share
 * URL. JPEG (not PNG) keeps the photo-heavy image well under ~500KB. Everything
 * is same-origin except the (optional) Google avatar, which is loaded
 * CORS-enabled and falls back to initials if it can't be drawn without tainting.
 */
async function renderImage(props: Props): Promise<Blob | null> {
  const { voterName, voterImage, verified, summary, candidates, shareUrl } = props;

  if (document.fonts) {
    await Promise.all([
      document.fonts.load('800 40px "Noto Sans Hebrew"'),
      document.fonts.load('700 24px "Noto Sans Hebrew"'),
      document.fonts.load('500 24px "Noto Sans Hebrew"'),
    ]).catch(() => {});
    await document.fonts.ready;
  }

  const [avatar, ...photos] = await Promise.all([
    voterImage ? loadImage(voterImage, true) : Promise.resolve(null),
    ...candidates.map((c) => loadImage(c.photo)),
  ]);

  const W = 960;
  const pad = 48;
  const scale = 1.75; // output resolution multiplier (crisp but compact)
  const cols = Math.min(4, candidates.length); // 6–8 picks → 4 columns, 2 rows
  const rows = Math.ceil(candidates.length / cols);
  const gap = 20;
  const cellW = (W - pad * 2 - gap * (cols - 1)) / cols;
  const nameH = 40;
  const rowH = cellW + nameH;

  // Measuring pass (summary wrapping needs a live 2D context).
  const measure = document.createElement('canvas').getContext('2d')!;
  const summaryText = summary?.trim() || '';
  measure.font = `500 24px ${FONT}`;
  const summaryLineH = 34;
  const summaryPad = 20;
  const summaryLines = summaryText ? wrapText(measure, summaryText, W - pad * 2 - 44) : [];
  const summaryCardH = summaryLines.length ? summaryLines.length * summaryLineH + summaryPad * 2 : 0;

  const headerH = 150;
  const avSize = 76;
  const avatarBlock = avSize + 12 + 36; // avatar + gap + name line
  const footerH = 110;
  const gridTop = headerH + 30 + avatarBlock + 8;
  const gridH = rows * rowH + (rows - 1) * gap;
  let contentBottom = gridTop + gridH;
  if (summaryLines.length) contentBottom += 32 + summaryCardH;
  const H = Math.round(contentBottom + 32 + footerH);

  const canvas = document.createElement('canvas');
  canvas.width = W * scale;
  canvas.height = H * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(scale, scale);
  ctx.textBaseline = 'top';
  ctx.direction = 'rtl';

  // Background.
  ctx.fillStyle = '#f4f5fd';
  ctx.fillRect(0, 0, W, H);

  // Header band.
  ctx.fillStyle = '#2531d1';
  ctx.fillRect(0, 0, W, headerH);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffdd55';
  ctx.font = `700 22px ${FONT}`;
  ctx.fillText(t.team.share.imageKicker, W / 2, 40);
  ctx.fillStyle = '#ffffff';
  ctx.font = `800 40px ${FONT}`;
  ctx.fillText(ellipsize(ctx, t.team.share.imageTitle, W - pad * 2), W / 2, 76);

  // Voter avatar + name.
  const avCx = W / 2;
  const avCy = headerH + 30 + avSize / 2;
  ctx.save();
  ctx.beginPath();
  ctx.arc(avCx, avCy, avSize / 2, 0, Math.PI * 2);
  ctx.clip();
  if (avatar) {
    drawCover(ctx, avatar, avCx - avSize / 2, avCy - avSize / 2, avSize, avSize, avSize / 2);
  } else {
    ctx.fillStyle = '#0048fe';
    ctx.fillRect(avCx - avSize / 2, avCy - avSize / 2, avSize, avSize);
    ctx.fillStyle = '#ffffff';
    ctx.font = `800 30px ${FONT}`;
    ctx.textBaseline = 'middle';
    ctx.fillText(initials(voterName), avCx, avCy + 2);
    ctx.textBaseline = 'top';
  }
  ctx.restore();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#0048fe';
  ctx.beginPath();
  ctx.arc(avCx, avCy, avSize / 2, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#1c2024';
  ctx.font = `800 30px ${FONT}`;
  const nameLabel = verified ? `${voterName}  ✓` : voterName;
  ctx.fillText(ellipsize(ctx, nameLabel, W - pad * 2), avCx, avCy + avSize / 2 + 12);

  // Candidate grid — photo + name only.
  ctx.textAlign = 'center';
  candidates.forEach((c, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    // RTL: first pick sits at the right.
    const x = W - pad - cellW - col * (cellW + gap);
    const y = gridTop + row * (rowH + gap);
    const photo = photos[i];
    if (photo) {
      drawCover(ctx, photo, x, y, cellW, cellW, 14);
    } else {
      ctx.fillStyle = '#e9ebf6';
      roundRectPath(ctx, x, y, cellW, cellW, 14);
      ctx.fill();
    }
    ctx.fillStyle = '#1c2024';
    ctx.font = `700 22px ${FONT}`;
    ctx.fillText(ellipsize(ctx, c.name, cellW), x + cellW / 2, y + cellW + 10);
  });

  // Summary card.
  if (summaryLines.length) {
    const cardY = gridTop + gridH + 32;
    ctx.fillStyle = '#ffffff';
    roundRectPath(ctx, pad, cardY, W - pad * 2, summaryCardH, 12);
    ctx.fill();
    ctx.fillStyle = '#0048fe';
    ctx.fillRect(W - pad - 4, cardY, 4, summaryCardH); // start-edge accent (RTL → right)
    ctx.fillStyle = '#1c2024';
    ctx.font = `500 24px ${FONT}`;
    ctx.textAlign = 'right';
    summaryLines.forEach((line, i) => {
      ctx.fillText(line, W - pad - 22, cardY + summaryPad + i * summaryLineH);
    });
  }

  // Footer.
  ctx.textAlign = 'center';
  ctx.fillStyle = '#0048fe';
  ctx.font = `700 25px ${FONT}`;
  ctx.fillText(t.team.share.textCta, W / 2, H - footerH + 22);
  ctx.fillStyle = '#5a6473';
  ctx.font = `500 22px ${FONT}`;
  ctx.fillText(shareUrl.replace(/^https?:\/\//, ''), W / 2, H - footerH + 60);

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.82));
}

/* ── Component ──────────────────────────────────────────────────────────── */

export default function ShareTeam(props: Props) {
  const { voterName } = props;
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [imgError, setImgError] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(buildText(props));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable — no-op */
    }
  };

  const downloadImage = async () => {
    setBusy(true);
    setImgError(false);
    try {
      const blob = await renderImage(props);
      if (!blob) throw new Error('render failed');
      const file = new File([blob], `democrateam-${voterName}.jpg`, { type: 'image/jpeg' });

      // Prefer the native share sheet (with the file) where supported — great on
      // mobile for sending the image straight to WhatsApp/X. Fall back to download.
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], text: t.team.share.imageTitle });
          return;
        } catch {
          /* user cancelled or share failed — fall through to download */
        }
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setImgError(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="share-team" aria-label={t.team.share.sectionTitle}>
      <h2 className="share-team-title">{t.team.share.sectionTitle}</h2>
      <div className="share-team-actions">
        <button type="button" className="btn btn-sm share-btn" onClick={copy} disabled={copied}>
          {copied ? t.team.share.copied : t.team.share.copyText}
        </button>
        <button
          type="button"
          className="btn btn-sm btn-ghost share-btn"
          onClick={downloadImage}
          disabled={busy}
        >
          {busy ? t.team.share.generating : t.team.share.downloadImage}
        </button>
      </div>
      {imgError ? <p className="share-team-error">{t.team.share.imageError}</p> : null}
    </section>
  );
}
