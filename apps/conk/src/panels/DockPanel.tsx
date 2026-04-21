/**
 * DockPanel — Private conversations between vessels.
 *
 * Docks will evolve into true two-party conversation threads
 * once the Cast struct tracks recipient vessels (Move v5 sprint).
 *
 * For now, private casts (Flares) live in the Stored tab where
 * both sent and received casts are tracked per-vessel, and
 * earnings are surfaced alongside them.
 */

import React from 'react'
import { IconDock } from '../components/Icons'

interface Props {
  onViewStored?: () => void
}

export function DockPanel({ onViewStored }: Props) {
  return (
    <div data-testid="dock-panel" style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px 24px',
      textAlign: 'center',
      gap: '16px',
    }}>
      <div style={{
        width: 48, height: 48,
        borderRadius: '50%',
        background: 'rgba(0,184,230,0.06)',
        border: '1px solid var(--border2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <IconDock size={22} color="var(--teal)" />
      </div>

      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: '16px',
        color: 'var(--text)',
        fontWeight: 600,
      }}>
        Docks coming soon
      </div>

      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '11px',
        color: 'var(--text-dim)',
        maxWidth: '320px',
        lineHeight: 1.6,
      }}>
        Private conversations between vessels are being built.
        For now, your Flares — private casts sent to specific
        recipients — are tracked in the Stored tab alongside
        your earnings.
      </div>

      {onViewStored && (
        <button onClick={onViewStored} style={{
          marginTop: '8px',
          padding: '8px 16px',
          background: 'rgba(0,184,230,0.08)',
          border: '1px solid var(--border2)',
          borderRadius: 'var(--radius)',
          color: 'var(--teal)',
          fontFamily: 'var(--font-mono)',
          fontSize: '10px',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          cursor: 'pointer',
        }}>
          Go to Stored
        </button>
      )}
    </div>
  )
}
