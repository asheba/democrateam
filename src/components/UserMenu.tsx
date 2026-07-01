import { useEffect, useRef, useState } from 'react';
import { signOut, useSession } from '../lib/auth-client';
import { t } from '../i18n';
import './UserMenu.css';

/**
 * Top-bar account control. Renders nothing when logged out; when logged in shows
 * a round avatar that opens a small dropdown with the user's name and a
 * disconnect (logout) action.
 */
export default function UserMenu() {
  const { data: session, isPending } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  if (isPending || !session) return null;

  const { name, image } = session.user;

  async function handleLogout() {
    await signOut();
    window.location.reload();
  }

  return (
    <div className="user-menu" ref={ref}>
      <button
        type="button"
        className="user-menu-avatar"
        aria-label={t.header.avatarAlt}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {image ? (
          <img src={image} alt={name} referrerPolicy="no-referrer" />
        ) : (
          <span aria-hidden="true">{(name || '?').charAt(0)}</span>
        )}
      </button>

      {open && (
        <div className="user-menu-dropdown" role="menu">
          <span className="user-menu-name">{name}</span>
          <button type="button" className="user-menu-logout" onClick={handleLogout} role="menuitem">
            {t.header.logout}
          </button>
        </div>
      )}
    </div>
  );
}
