import { ReactNode, useEffect, useState, useRef, useCallback } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  maxWidth?: string;
}

const POS_STORAGE_KEY = 'modal_positions';

function loadPositions(): Record<string, { x: number; y: number }> {
  try {
    const raw = localStorage.getItem(POS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function savePosition(title: string, x: number, y: number) {
  try {
    const all = loadPositions();
    all[title] = { x, y };
    localStorage.setItem(POS_STORAGE_KEY, JSON.stringify(all));
  } catch { /* ignore */ }
}

function getSavedPosition(title: string): { x: number; y: number } {
  const all = loadPositions();
  return all[title] || { x: 0, y: 0 };
}

function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 768;
}

export default function Modal({ open, onClose, title, children, maxWidth = 'max-w-lg' }: ModalProps) {
  const [dragging, setDragging] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const dragStart = useRef({ x: 0, y: 0, posX: 0, posY: 0 });
  const modalRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(true);

  useEffect(() => {
    setIsMobile(isMobileDevice());
  }, []);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      const saved = getSavedPosition(title);
      setPos(saved);
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open, title]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (isMobile) return;
    const target = e.target as HTMLElement;
    if (target.closest('button, input, select, textarea')) return;
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, posX: pos.x, posY: pos.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [pos.x, pos.y, isMobile]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging || isMobile) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    const newX = dragStart.current.posX + dx;
    const newY = dragStart.current.posY + dy;
    setPos({ x: newX, y: newY });
  }, [dragging, isMobile]);

  const handlePointerUp = useCallback(() => {
    if (dragging) {
      savePosition(title, pos.x, pos.y);
    }
    setDragging(false);
  }, [dragging, title, pos.x, pos.y]);

  if (!open) return null;

  const canDrag = !isMobile;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-12 sm:pt-20 overflow-y-auto">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        ref={modalRef}
        className={`relative z-10 bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full ${maxWidth} max-h-[85vh] flex flex-col`}
        style={{
          transform: `translate(${pos.x}px, ${pos.y}px)`,
          transition: dragging ? 'none' : 'box-shadow 0.2s',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-t-xl shrink-0 ${canDrag ? 'cursor-grab' : ''} ${dragging ? 'cursor-grabbing' : ''}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{ userSelect: dragging ? 'none' : 'auto' }}
        >
          <h2 className="text-lg font-semibold pointer-events-none select-none">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}