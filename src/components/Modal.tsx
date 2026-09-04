import { ReactNode, useEffect, useState, useRef, useCallback } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  maxWidth?: string;
}

export default function Modal({ open, onClose, title, children, maxWidth = 'max-w-lg' }: ModalProps) {
  const [dragging, setDragging] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const dragStart = useRef({ x: 0, y: 0, posX: 0, posY: 0 });
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      setPos({ x: 0, y: 0 });
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('select') || target.closest('textarea')) return;
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, posX: pos.x, posY: pos.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [pos.x, pos.y]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setPos({ x: dragStart.current.posX + dx, y: dragStart.current.posY + dy });
  }, [dragging]);

  const handlePointerUp = useCallback(() => {
    setDragging(false);
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-12 sm:pt-20 overflow-y-auto">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        ref={modalRef}
        className={`relative z-10 bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full ${maxWidth} max-h-[85vh] flex flex-col`}
        style={{ transform: `translate(${pos.x}px, ${pos.y}px)`, transition: dragging ? 'none' : 'box-shadow 0.2s' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-t-xl shrink-0 ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{ userSelect: dragging ? 'none' : 'auto' }}
        >
          <h2 className="text-lg font-semibold pointer-events-none">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
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