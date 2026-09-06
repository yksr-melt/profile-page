import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { IconComponent } from './BrandIcons'

export function LinkIconButton({
  href,
  color,
  name,
  handle,
  Icon,
}: {
  href: string
  color: string
  name: string
  handle: string
  Icon: IconComponent
}) {
  const ref = useRef<HTMLAnchorElement>(null)
  const [rect, setRect] = useState<DOMRect | null>(null)

  const show = () => setRect(ref.current?.getBoundingClientRect() ?? null)
  const hide = () => setRect(null)

  return (
    <>
      <a
        ref={ref}
        href={href}
        target="_blank"
        rel="noreferrer"
        onMouseEnter={show}
        onMouseLeave={hide}
        onTouchStart={show}
        onTouchEnd={hide}
        className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${color} text-white shadow-softer transition active:scale-95 hover:scale-105`}
      >
        <Icon size={22} />
      </a>
      {rect &&
        createPortal(
          <div
            className="pointer-events-none fixed z-50 animate-tooltip-in whitespace-nowrap rounded-xl bg-ink-900 px-3 py-1.5 text-center shadow-soft"
            style={{ left: rect.left + rect.width / 2, top: rect.bottom + 8 }}
          >
            <p className="text-xs font-bold text-white">{name}</p>
            <p className="text-[10px] text-ink-300">{handle}</p>
          </div>,
          document.body,
        )}
    </>
  )
}
