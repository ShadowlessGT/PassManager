import { useLayoutEffect, useRef } from 'react';
import type { ReactNode } from 'react';

/** Native modal top layer makes everything outside the dialog inert, including
 * keyboard focus. The root dialog also freezes the underlying page at its
 * current scroll position, independently of Android WebView scroll chaining. */
export default function VaultModal({ children, label, className, onClose, freezePage = false }: {
  children: ReactNode; label: string; className: string; onClose: () => void; freezePage?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useLayoutEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const html = document.documentElement;
    const body = document.body;
    const x = window.scrollX, y = window.scrollY;
    const saved = {
      htmlOverflow: html.style.overflow, htmlOverscroll: html.style.overscrollBehavior,
      position: body.style.position, top: body.style.top, left: body.style.left,
      width: body.style.width, overflow: body.style.overflow
    };
    if (freezePage) {
      html.style.overflow = 'hidden';
      html.style.overscrollBehavior = 'none';
      body.style.position = 'fixed';
      body.style.top = '-' + y + 'px';
      body.style.left = '-' + x + 'px';
      body.style.width = '100%';
      body.style.overflow = 'hidden';
    }
    dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
      if (freezePage) {
        html.style.overflow = saved.htmlOverflow;
        html.style.overscrollBehavior = saved.htmlOverscroll;
        body.style.position = saved.position;
        body.style.top = saved.top;
        body.style.left = saved.left;
        body.style.width = saved.width;
        body.style.overflow = saved.overflow;
        window.scrollTo(x, y);
      }
    };
  }, [freezePage]);
  return <dialog ref={ref} className={'vault-modal '+className} aria-label={label}
    onCancel={event => { event.preventDefault(); onClose(); }}>
    {children}
  </dialog>;
}
