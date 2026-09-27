import { useEffect, useState } from 'react';

export function NewResultBadge({ timestamp }) {
  const expiresAt = timestamp + 120000;
  const [visible, setVisible] = useState(() => Date.now() < expiresAt);
  useEffect(() => {
    const update = () => setVisible(Date.now() < expiresAt);
    const timeout = setTimeout(update, Math.max(0, expiresAt - Date.now()));
    document.addEventListener('visibilitychange', update);
    return () => { clearTimeout(timeout); document.removeEventListener('visibilitychange', update); };
  }, [expiresAt]);
  return visible ? <span className="new-result-badge" aria-label="最新のフィニッシュ">New</span> : null;
}
