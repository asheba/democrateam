// Amplitude Browser SDK bootstrap. Loaded once, on idle, from the shared Base
// layout. Interactions are captured automatically via autocapture (sessions +
// element/click + page views etc.). On top of that, once we know who the
// visitor is, we identify them to Amplitude with their Better Auth user id,
// email, and team id — so anonymous device activity gets tied to a real user.
import * as amplitude from '@amplitude/analytics-browser';
import { sessionReplayPlugin } from '@amplitude/plugin-session-replay-browser';
import { authClient } from '../lib/auth-client';

const apiKey = import.meta.env.PUBLIC_AMPLITUDE_API_KEY;

// Fraction of sessions to record for replay (0–1). Configurable via env so we
// can record 100% in preview and sample down in prod. Defaults to 1 if unset
// or malformed; out-of-range values are clamped to [0, 1].
const rawSampleRate = import.meta.env.PUBLIC_AMPLITUDE_REPLAY_SAMPLE_RATE;
const parsedSampleRate = Number(rawSampleRate);
const sampleRate =
  rawSampleRate == null || rawSampleRate === '' || Number.isNaN(parsedSampleRate)
    ? 1
    : Math.min(1, Math.max(0, parsedSampleRate));

if (apiKey) {
  // Register Session Replay before init() so it hooks the session lifecycle.
  amplitude.add(sessionReplayPlugin({ sampleRate }));

  amplitude.init(apiKey, {
    autocapture: {
      attribution: true,
      fileDownloads: true,
      formInteractions: true,
      pageViews: true,
      sessions: true,
      elementInteractions: true,
    },
  });

  // Fire-and-forget: identification is best-effort and never blocks tracking.
  void identifyUser();
}

/**
 * Resolve the logged-in user's own team uuid via the teams API. Cached in
 * sessionStorage (positive results only) so we hit the endpoint at most once
 * per session — and still pick it up if the user creates a team mid-session.
 */
async function resolveTeamId(): Promise<string | null> {
  try {
    const cached = sessionStorage.getItem('amp_team_id');
    if (cached) return cached;
    const res = await fetch('/api/teams');
    if (!res.ok) return null; // 404 = no team yet, 401/500 = skip
    const team = (await res.json()) as { uuid?: string };
    const uuid = team.uuid ?? null;
    if (uuid) sessionStorage.setItem('amp_team_id', uuid);
    return uuid;
  } catch {
    return null;
  }
}

async function identifyUser(): Promise<void> {
  try {
    const { data } = await authClient.getSession();
    const user = data?.user;
    if (!user) return; // anonymous visitor — leave device-only tracking as is

    amplitude.setUserId(user.id);

    const identify = new amplitude.Identify();
    if (user.email) identify.set('email', user.email);
    const teamId = await resolveTeamId();
    if (teamId) identify.set('team_id', teamId);
    amplitude.identify(identify);
  } catch {
    // Identification is best-effort; failures must not affect the app.
  }
}
