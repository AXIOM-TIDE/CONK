// CONK — Main App
// Harbor · Drift · Siren · Dock
// conk.app · July 4 2026

import { useState } from 'react'
import { useConkStore } from './lib/store'
import './app.css'

type Tab = 'harbor' | 'drift' | 'siren' | 'dock'

function ConkApp() {
  const { harbor, activeVessel } = useConkStore()
  const [tab, setTab] = useState<Tab>('drift')

  if (!harbor || !activeVessel) {
    return <Onboarding />
  }

  return (
    <div className="app">
      <div className="app-content">
        {tab === 'harbor' && <div className="page-placeholder"><span>Harbor</span><p>Week 3</p></div>}
        {tab === 'drift'  && <div className="page-placeholder"><span>Drift</span><p>Week 2</p></div>}
        {tab === 'siren'  && <div className="page-placeholder"><span>Siren</span><p>Week 3</p></div>}
        {tab === 'dock'   && <Dock />}
      </div>
      <nav className="tab-bar">
        <TabBtn active={tab === 'harbor'} onClick={() => setTab('harbor')} label="Harbor" icon="⬡" />
        <TabBtn active={tab === 'drift'}  onClick={() => setTab('drift')}  label="Drift"  icon="≋" />
        <TabBtn active={tab === 'siren'}  onClick={() => setTab('siren')}  label="Siren"  icon="◎" />
        <TabBtn active={tab === 'dock'}   onClick={() => setTab('dock')}   label="Dock"   icon="⬒" />
      </nav>
    </div>
  )
}

function TabBtn({ active, onClick, label, icon }: {
  active: boolean, onClick: () => void, label: string, icon: string
}) {
  return (
    <button className={`tab-btn ${active ? 'tab-btn--on' : ''}`} onClick={onClick}>
      <span className="tab-icon">{icon}</span>
      <span className="tab-label">{label}</span>
    </button>
  )
}

function Onboarding() {
  const { setHarbor, addVessel, setActiveVessel } = useConkStore()
  const [step, setStep]             = useState(0)
  const [vesselType, setVesselType] = useState<'ghost'|'shadow'|'open'>('shadow')

  const createHarbor = () => {
    const now = Date.now()
    setHarbor({
      address:     '0x' + Math.random().toString(16).slice(2),
      createdAt:   now,
      lastActive:  now,
      expiresAt:   now + 365 * 24 * 60 * 60 * 1000,
      vesselCount: 0,
      dockCount:   0,
    })
    setStep(2)
  }

  const createVessel = () => {
    const now = Date.now()
    const v = {
      id:          '0x' + Math.random().toString(16).slice(2),
      type:        vesselType,
      createdAt:   now,
      lastActive:  now,
      expiresAt:   now + 365 * 24 * 60 * 60 * 1000,
      currentDock: null,
    }
    addVessel(v)
    setActiveVessel(v)
  }

  return (
    <div className="onboard">
      <div className="onboard-card">
        <div className="onboard-logo">
          <span className="onboard-shell">≋</span>
          <span className="onboard-wordmark">CONK</span>
        </div>

        {step === 0 && (
          <div className="onboard-step">
            <div className="onboard-tagline">Leave your identity on the shore.</div>
            <p className="onboard-desc">A private communications network for all types of vessels. No name. No face. No trace.</p>
            <div className="onboard-free-note">Free to browse · $0.05 to participate</div>
            <button className="btn-primary" onClick={() => setStep(1)}>Enter the network →</button>
          </div>
        )}

        {step === 1 && (
          <div className="onboard-step">
            <div className="onboard-step-title">Create your Harbor</div>
            <p className="onboard-desc">Your master wallet on CONK. Holds your USDC. Funds everything you do here. One time. $0.05.</p>
            <div className="onboard-fee-pill">$0.05 · one time · to the Abyss</div>
            <button className="btn-primary" onClick={createHarbor}>Create Harbor · $0.05 →</button>
          </div>
        )}

        {step === 2 && (
          <div className="onboard-step">
            <div className="onboard-step-title">Launch your vessel</div>
            <p className="onboard-desc">Choose your type. Fixed at creation. Human or agent — same vessel, same cost.</p>
            <div className="vessel-type-grid">
              {(['ghost','shadow','open'] as const).map((t) => (
                <button key={t} className={`vessel-type-btn ${vesselType === t ? 'vessel-type-btn--on' : ''}`} onClick={() => setVesselType(t)}>
                  <div className="vt-icon">{t === 'ghost' ? '◌' : t === 'shadow' ? '◎' : '◉'}</div>
                  <div className="vt-label">{t.charAt(0).toUpperCase() + t.slice(1)}</div>
                  <div className="vt-desc">{
                    t === 'ghost'  ? 'Everything shielded. No trace.' :
                    t === 'shadow' ? 'Selective visibility. You choose.' :
                    'Signal record visible. Still anonymous.'
                  }</div>
                </button>
              ))}
            </div>
            <div className="onboard-fee-pill">$0.01 · one time · to the Abyss</div>
            <button className="btn-primary" onClick={createVessel}>Launch vessel · $0.01 →</button>
          </div>
        )}

        <div className="onboard-steps">
          {[0,1,2].map((s) => (
            <div key={s} className={`step-dot ${step === s ? 'step-dot--on' : ''}`} />
          ))}
        </div>
      </div>
    </div>
  )
}

function Dock() {
  const { quickPass, realTime, setRealTime } = useConkStore()
  const { payMessage, isLow }               = use402()
  const [messages, setMessages]             = useState<any[]>([])
  const [input, setInput]                   = useState('')
  const [burnNext, setBurnNext]             = useState(false)
  const [wreckOpen, setWreckOpen]           = useState(false)
  const [wreckHeld, setWreckHeld]           = useState(false)
  const [typing, setTyping]                 = useState(false)
  const [burnCD, setBurnCD]                 = useState<{id:string,count:number}|null>(null)

  const send = () => {
    const text = input.trim()
    if (!text) return
    setInput('')
    const id  = crypto.randomUUID()
    setMessages((p) => [...p, { id, sender:'me', text, burn:burnNext, burned:false, cost:'$0.001' }])
    payMessage(burnNext, false)
    if (burnNext) startBurn(id)
    if (realTime) {
      setTyping(true)
      setTimeout(() => {
        setTyping(false)
        setMessages((p) => [...p, {
          id: crypto.randomUUID(), sender:'them',
          text: ['Understood.','Done.','Sealed.','Confirmed.'][Math.floor(Math.random()*4)],
          burn:false, burned:false, cost:'$0.001'
        }])
      }, 800 + Math.random() * 600)
    }
  }

  const startBurn = (id: string) => {
    let c = 5
    setBurnCD({ id, count: c })
    const iv = setInterval(() => {
      c--
      if (c <= 0) {
        clearInterval(iv)
        setBurnCD(null)
        setMessages((p) => p.map((m) => m.id === id ? { ...m, burned:true } : m))
      } else {
        setBurnCD({ id, count: c })
      }
    }, 1000)
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  let wreckTimer: any = null
  const startWreck = () => {
    setWreckHeld(true)
    wreckTimer = setTimeout(() => {
      setWreckOpen(false)
      setMessages([{ id:'w', sender:'me', text:'Dock wrecked. The void received everything.', burn:false, burned:false, cost:'' }])
    }, 3000)
  }
  const cancelWreck = () => {
    setWreckHeld(false)
    clearTimeout(wreckTimer)
  }

  return (
    <div className="dock-page">
      <div className="dock-hdr">
        <div className="dock-hdr-top">
          <div className="dock-hdr-info">
            <div className={`dock-pulse ${realTime ? 'dock-pulse--rt' : 'dock-pulse--on'}`} />
            <div>
              <div className="dock-title">Dock 01 · 0x7f3a...d92e</div>
              <div className="dock-sub">siren mode · 2 vessels</div>
            </div>
          </div>
          <div className="dock-hdr-right">
            <span className="dock-timer timer--green">27d 3h</span>
            <button className="btn-wreck-sm" onClick={() => setWreckOpen(true)}>Wreck</button>
          </div>
        </div>
        <div className="qp-bar">
          <span className="qp-label">Quick Pass</span>
          <div className="qp-track">
            <div className={`qp-fill ${isLow ? 'qp-fill--low' : ''}`}
              style={{ width: `${Math.round((quickPass.remaining / quickPass.limit) * 100)}%` }} />
          </div>
          <span className={`qp-val ${isLow ? 'qp-val--low' : ''}`}>
            ${quickPass.spent.toFixed(3)} / ${quickPass.limit.toFixed(2)}
          </span>
        </div>
        <div className="rt-selector">
          <button className={`rt-btn ${!realTime ? 'rt-btn--on' : ''}`} onClick={() => setRealTime(false)}>■ Standard</button>
          <button className={`rt-btn ${realTime ? 'rt-btn--rt' : ''}`}  onClick={() => setRealTime(true)}>● Real Time</button>
        </div>
      </div>

      <div className="dock-msgs">
        {messages.map((m) => (
          <div key={m.id} className={`msg msg--${m.sender} ${m.burned ? 'msg--burned' : ''} ${m.burn && !m.burned ? 'msg--burn' : ''}`}>
            {burnCD?.id === m.id && <div className="burn-countdown"><span className="burn-num">{burnCD.count}</span></div>}
            {m.burned
              ? <span className="msg-burned-label">signal burned · gone to the void</span>
              : <div className="msg-text">{m.text}</div>
            }
            {m.cost && <div className="msg-meta"><span>{m.cost}</span>{m.burn && !m.burned && <span className="msg-burn-badge">burns on read</span>}</div>}
          </div>
        ))}
        {typing && (
          <div className="msg msg--them msg--typing">
            <span className="typing-dot"/><span className="typing-dot"/><span className="typing-dot"/>
          </div>
        )}
      </div>

      <div className="dock-compose">
        <div className="compose-row">
          <textarea className="compose-input" placeholder={realTime ? 'Real time · Enter to send...' : 'Message...'}
            value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKey} rows={1} />
          <button className={`send-btn ${realTime ? 'send-btn--rt' : ''}`} onClick={send} disabled={!input.trim()}>→</button>
        </div>
        <div className="compose-footer">
          <button className={`burn-toggle ${burnNext ? 'burn-toggle--on' : ''}`} onClick={() => setBurnNext(!burnNext)}>
            {burnNext ? '● Burn after read' : '○ Burn after read'}
          </button>
          <span className="compose-cost">$0.001 · Quick Pass</span>
        </div>
      </div>

      {wreckOpen && (
        <div className="wreck-overlay">
          <div className="wreck-modal">
            <div className="wreck-icon">△</div>
            <div className="wreck-title">Wreck this Dock</div>
            <div className="wreck-body">Permanent. All messages disappear.<br/>The void receives everything.</div>
            <button className="wreck-hold-btn" onMouseDown={startWreck} onMouseUp={cancelWreck} onTouchStart={startWreck} onTouchEnd={cancelWreck}>
              <div className={`wreck-fill ${wreckHeld ? 'wreck-fill--active' : ''}`} />
              <span>Hold to wreck</span>
            </button>
            <button className="wreck-cancel" onClick={() => setWreckOpen(false)}>cancel · keep the Dock</button>
          </div>
        </div>
      )}
    </div>
  )
}

import { use402 } from './hooks/use402'
export default ConkApp
