import { useEffect, useId, useRef, useState } from 'react';
import { Check, Home, Menu, X } from 'lucide-react';

export function ModeMenu({ modes, role, onSelect }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const container = useRef(null);
  const trigger = useRef(null);

  useEffect(() => {
    if (!open) return;
    const closeOutside = event => {
      if (!container.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, [open]);

  const select = nextRole => {
    setOpen(false);
    onSelect(nextRole);
    trigger.current?.focus();
  };

  return (
    <div className="mode-menu" ref={container}
      onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}
      onKeyDown={event => {
        if (event.key === 'Escape' && open) {
          event.preventDefault();
          setOpen(false);
          trigger.current?.focus();
        }
      }}>
      <button className="home-button" ref={trigger} aria-label="モードメニュー" aria-expanded={open} aria-controls={id} onClick={() => setOpen(value => !value)}>
        {open ? <X size={20} /> : <Menu size={20} />}<span>メニュー</span>
      </button>
      <nav className="mode-menu-panel" id={id} aria-label="モードメニュー" hidden={!open}>
        <p className="eyebrow">SELECT MODE</p>
        {modes.map(mode => {
          const Icon = mode.icon;
          return <button key={mode.id} aria-current={role === mode.id ? 'page' : undefined} onClick={() => select(mode.id)}>
            <Icon size={20} /><span>{mode.title}</span>{role === mode.id && <Check size={17} />}
          </button>;
        })}
        <button className="menu-home" aria-current={!role ? 'page' : undefined} onClick={() => select(null)}><Home size={20} /><span>トップに戻る</span></button>
      </nav>
    </div>
  );
}
