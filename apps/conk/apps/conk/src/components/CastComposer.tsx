import { useState, useRef } from 'react'
import { useSoundCast } from '../hooks/use402'
import type { CastMode } from '../store/store'
import { DURATION_OPTIONS } from '../utils/scrubber'

interface CastComposerProps {
  onClose: () => void
}

const MODE_OPTIONS: { id: CastMode; label: string; desc: string; icon: string }[] = [
  { id: 'open',      label: 'Open',      icon: '◎', desc: 'Anyone reads · $0.001 to read' },
  { id: 'sealed',    label: 'Sealed',    icon: '⬡', desc: 'Specific vessel only · encrypted' },
  { id: 'eyes_only', label: 'Eyes Only', icon: '👁', desc: 'Burns immediately on read' },
  { id: 'ghost',     label: 'Ghost',     icon: '◌', desc: 'Anyone · burns on first read' },
]

export function CastComposer({ onClose }: CastComposerProps) {
  const { sound, status } = useSoundCast()
  const [hook, setHook]       = useState('')
  const [body, setBody]       = useState('')
  const [mode, setMode]       = useState<CastMode>('open')
  const [duration, setDuration] = useState<'24h' | '48h' | '72h' | '7d'>('24h')
  const [error, setError]     = useState('')
  const overlayRef = useRef<HTMLDivElement>(null)

  const isPending = status === 'pending'
  const isDone    = status === 'success'

  const handleSubmit = async () => {
    setError('')
    if (!hook.trim()) { setError('A hook is required.'); return }
    if (!body.trim()) { setError('Body cannot be empty.'); return }

    const ok = await sound({ hook: hook.trim(), body: body.trim(), mode, duration })
    if (ok) {
      setTimeout(onClose, 300)
    } else {
      setError('Failed to sound cast. Check your Harbor balance.')
    }
  }

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose()
  }

  return (
    <div className="overlay" ref={overlayRef} onClick={handleOverlayClick}>
      <div className="drawer composer-drawer">
        <div className="drawer-handle" />

        <div className="composer-header">
          <h2 className="composer-title">Sound a Cast</h2>
          <button className="composer-close" onClick={onClose}>✕</button>
        </div>

        {/* Hook */}
        <div className="composer-field">
          <label className="composer-label">Hook <span className="cost-note">free · always visible</span></label>
          <input
            className="input"
            placeholder="The line that surfaces first..."
            value={hook}
            onChange={(e) => setHook(e.target.value)}
            maxLength={160}
          />
          <div className="char-count">{hook.length}/160</div>
        </div>

        {/* Body */}
        <div className="composer-field">
          <label className="composer-label">Body <span className="cost-note">$0.001 to read</span></label>
          <textarea
            className="input composer-body"
            placeholder="What the tide carries..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={5}
          />
        </div>

        {/* Mode */}
        <div className="composer-field">
          <label className="composer-label">Mode</label>
          <div className="mode-grid">
            {MODE_OPTIONS.map((m) => (
              <button
                key={m.id}
                className={`mode-chip ${mode === m.id ? 'selected' : ''}`}
                onClick={() => setMode(m.id)}
              >
                <span className="mode-icon">{m.icon}</span>
                <span className="mode-name">{m.label}</span>
                <span className="mode-desc">{m.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Duration */}
        <div className="composer-field">
          <label className="composer-label">Duration</label>
          <div className="duration-row">
            {DURATION_OPTIONS.map((d) => (
              <button
                key={d.value}
                className={`dur-chip ${duration === d.value ? 'selected' : ''}`}
                onClick={() => setDuration(d.value)}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Cost summary */}
        <div className="composer-cost">
          <span>Sound cost</span>
          <span className="cost-val">$0.001</span>
        </div>

        {error && <div className="composer-error">{error}</div>}

        <button
          className="btn btn-primary composer-submit"
          onClick={handleSubmit}
          disabled={isPending || isDone}
        >
          {isPending ? <><span className="spinner" />Sounding...</> : isDone ? '✓ Cast sounded' : 'Sound Cast →'}
        </button>
      </div>

      <style>{`
        .composer-drawer { max-height: 90dvh; overflow-y: auto; }
        .composer-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }
        .composer-title { font-size: 17px; font-weight: 600; }
        .composer-close {
          background: none; border: none;
          color: var(--text-dim); cursor: pointer;
          font-size: 16px; padding: 4px;
        }
        .composer-field {
          display: flex; flex-direction: column; gap: 6px;
          margin-bottom: 16px;
        }
        .composer-label {
          font-size: 11px; font-weight: 600;
          letter-spacing: 0.08em; text-transform: uppercase;
          color: var(--text-dim);
          display: flex; align-items: center; gap: 8px;
        }
        .cost-note {
          font-size: 10px; font-weight: 400;
          color: var(--teal); text-transform: none;
          letter-spacing: 0; font-family: var(--font-cast);
        }
        .char-count {
          font-size: 10px; color: var(--text-ghost);
          text-align: right; font-family: var(--font-cast);
        }
        .composer-body { min-height: 100px; }
        .mode-grid { display: flex; flex-direction: column; gap: 6px; }
        .mode-chip {
          display: grid;
          grid-template-columns: 20px 1fr;
          grid-template-rows: auto auto;
          column-gap: 8px;
          padding: 10px 12px;
          background: var(--surface2);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          cursor: pointer;
          text-align: left;
          transition: all 0.15s;
        }
        .mode-chip:hover { border-color: var(--border2); }
        .mode-chip.selected {
          border-color: var(--teal);
          background: var(--teal-dim);
        }
        .mode-icon { grid-row: 1 / 3; align-self: center; font-size: 16px; }
        .mode-name { font-size: 13px; font-weight: 600; color: var(--text); }
        .mode-desc { font-size: 11px; color: var(--text-dim); }
        .duration-row {
          display: flex; gap: 8px;
        }
        .dur-chip {
          flex: 1;
          padding: 8px 4px;
          background: var(--surface2);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          color: var(--text-dim);
          font-family: var(--font-cast);
          font-size: 12px;
          cursor: pointer;
          transition: all 0.15s;
          text-align: center;
        }
        .dur-chip:hover { border-color: var(--border2); color: var(--text); }
        .dur-chip.selected {
          border-color: var(--teal);
          color: var(--teal);
          background: var(--teal-dim);
        }
        .composer-cost {
          display: flex; justify-content: space-between;
          align-items: center;
          padding: 10px 12px;
          background: var(--surface2);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          margin-bottom: 14px;
          font-size: 13px;
          color: var(--text-dim);
        }
        .cost-val { color: var(--teal); font-family: var(--font-cast); font-weight: 600; }
        .composer-error {
          padding: 10px 12px;
          background: var(--burn-dim);
          border: 1px solid rgba(255,64,96,0.2);
          border-radius: var(--radius);
          color: var(--burn);
          font-size: 12px;
          margin-bottom: 12px;
        }
        .composer-submit { width: 100%; height: 48px; font-size: 15px; }
      `}</style>
    </div>
  )
}
