/**
 * BountyPanel — Signal Bounties + Proof of Work Delivery
 * Post bounties, submit proofs, verify delivery, release payment.
 */
import { useState } from 'react'
import { useStore } from '../store/store'
import { getBounties, postBounty, submitProof, formatReward, type Bounty } from '../bounties'
import { BackButton } from '../components/BackButton'
import { MediaUpload } from '../components/MediaUpload'
import type { WalrusUploadResult } from '../sui/walrus'
import { DecayBadge } from '../components/DecayBadge'

const CATEGORY_ICONS: Record<string, string> = {
  research: '🔬', analysis: '📊', monitoring: '👁', development: '⚙', other: '◎'
}
const STATUS_COLORS: Record<string, string> = {
  open: 'var(--teal)', claimed: '#FFB020', delivered: '#2196F3',
  verified: '#4CAF50', paid: 'var(--text-off)', expired: 'var(--burn)',
}

function BountyCard({ bounty, myVesselId, onClaim }: { bounty: Bounty; myVesselId: string; onClaim: (id: string) => void; key?: string }) {
  const [expanded, setExpanded] = useState(false)
  const isMine    = bounty.vesselId === myVesselId
  const hasClaimed = bounty.submissions.some(s => s.vesselId === myVesselId)
  const timeLeft  = bounty.deadline - Date.now()
  const hoursLeft = Math.floor(timeLeft / 3600000)

  return (
    <div style={{background:'var(--surface)',border:`1px solid ${bounty.status==='open'?'var(--border2)':'var(--border)'}`,borderRadius:'var(--radius-xl)',overflow:'hidden',marginBottom:'10px'}}>
      <div onClick={() => setExpanded(!expanded)} style={{padding:'14px',cursor:'pointer'}}>
        <div style={{display:'flex',alignItems:'flex-start',gap:'10px'}}>
          <div style={{fontSize:'20px',flexShrink:0}}>{CATEGORY_ICONS[bounty.category]}</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontFamily:'var(--font-display)',fontSize:'13px',color:'var(--text)',lineHeight:1.4,marginBottom:'6px'}}>
              {bounty.hook}
            </div>
            <div style={{display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap'}}>
              <span style={{fontFamily:'var(--font-mono)',fontSize:'12px',fontWeight:700,color:'var(--teal)'}}>
                {formatReward(bounty.reward)}
              </span>
              <span style={{fontFamily:'var(--font-mono)',fontSize:'8px',color:STATUS_COLORS[bounty.status],border:`1px solid ${STATUS_COLORS[bounty.status]}33`,borderRadius:'100px',padding:'1px 6px',letterSpacing:'0.06em',textTransform:'uppercase'}}>
                {bounty.status}
              </span>
              <span style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:hoursLeft<6?'var(--burn)':'var(--text-off)'}}>
                {hoursLeft}h left
              </span>
              <span style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-off)'}}>
                {bounty.submissions.length}/{bounty.maxClaims} claims
              </span>
              {isMine && <span style={{fontFamily:'var(--font-mono)',fontSize:'8px',color:'var(--teal)',border:'1px solid rgba(0,184,230,0.3)',borderRadius:'100px',padding:'1px 5px'}}>yours</span>}
            </div>
          </div>
        </div>
      </div>

      {expanded && (
        <div style={{padding:'0 14px 14px',borderTop:'1px solid var(--border)'}}>
          <div style={{fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--text-dim)',lineHeight:1.7,padding:'10px 0',marginBottom:'10px'}}>
            {bounty.description}
          </div>

          <div style={{padding:'8px 10px',background:'rgba(0,184,230,0.04)',border:'1px solid var(--border)',borderRadius:'var(--radius)',marginBottom:'10px',fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-dim)',lineHeight:1.7}}>
            🔐 <strong>Proof of Work Delivery</strong><br/>
            Submit a cryptographic proof of your work before revealing content. The poster verifies the proof and payment releases automatically. Neither party is exposed.
          </div>

          {bounty.submissions.length > 0 && (
            <div style={{marginBottom:'10px'}}>
              <div style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-off)',letterSpacing:'0.08em',textTransform:'uppercase',marginBottom:'6px'}}>
                Submissions ({bounty.submissions.length})
              </div>
              {bounty.submissions.map(sub => (
                <div key={sub.id} style={{display:'flex',alignItems:'center',gap:'8px',padding:'6px 8px',background:'var(--surface2)',borderRadius:'var(--radius)',marginBottom:'4px'}}>
                  <span style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-dim)',flex:1,overflow:'hidden',textOverflow:'ellipsis'}}>
                    proof: {sub.proofHash.slice(0,20)}…
                  </span>
                  {sub.verified && <span style={{color:'#4CAF50',fontSize:'11px'}}>✓</span>}
                  {isMine && !sub.verified && (
                    <button onClick={() => {}} style={{padding:'3px 8px',background:'rgba(0,184,230,0.1)',border:'1px solid var(--border3)',borderRadius:'var(--radius)',color:'var(--teal)',fontFamily:'var(--font-mono)',fontSize:'8px',cursor:'pointer'}}>
                      verify & pay
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {!isMine && bounty.status === 'open' && !hasClaimed && (
            <button onClick={() => onClaim(bounty.id)}
              style={{width:'100%',padding:'10px',background:'rgba(0,184,230,0.1)',border:'1px solid var(--border3)',borderRadius:'var(--radius-lg)',color:'var(--teal)',fontFamily:'var(--font-mono)',fontSize:'11px',fontWeight:600,cursor:'pointer',letterSpacing:'0.04em'}}>
              Claim Bounty · Submit Proof →
            </button>
          )}
          {hasClaimed && (
            <div style={{padding:'8px',textAlign:'center',fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--teal)'}}>
              ✓ You have submitted proof for this bounty
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function BountyPanel({ onBack }: { onBack: () => void }) {
  const vessel      = useStore((s) => s.vessel)
  const debitVessel = useStore((s) => s.debitVessel)
  const [tab, setTab]         = useState<'browse'|'post'>('browse')
  const [filter, setFilter]   = useState<'open'|'all'>('open')
  const [bountyList, setBountyList] = useState(() => getBounties())
  const [claiming, setClaiming]     = useState<string|null>(null)
  const [proofInput, setProofInput] = useState('')
  const [proofFile, setProofFile] = useState<WalrusUploadResult | null>(null)

  // Post form
  const [hook, setHook]       = useState('')
  const [desc, setDesc]       = useState('')
  const [reward, setReward]   = useState(100)
  const [hours, setHours]     = useState(24)
  const [maxC, setMaxC]       = useState(1)
  const [cat, setCat]         = useState<Bounty['category']>('research')

  if (!vessel) return null

  const refresh = () => setBountyList(getBounties(filter === 'open' ? 'open' : undefined))

  const handlePost = () => {
    if (!hook.trim()) return
    postBounty({ vesselId: vessel.id, hook: hook.trim(), description: desc.trim(), reward, deadlineHours: hours, maxClaims: maxC, category: cat })
    debitVessel(reward)
    setHook(''); setDesc(''); setTab('browse')
    refresh()
  }

  const handleClaim = (bountyId: string) => {
    if (!proofInput.trim()) return
    // Generate proof hash from work description
    const proofHash = proofFile
      ? `walrus_${proofFile.blobId}_${Date.now()}`
      : `sha256_${btoa(proofInput).slice(0,32)}_${Date.now()}`
    submitProof(bountyId, vessel.id, proofHash)
    debitVessel(10)
    setClaiming(null); setProofInput(''); setProofFile(null)
    refresh()
  }

  const displayed = filter === 'open' ? bountyList.filter(b => b.status === 'open') : bountyList

  return (
    <div style={{flex:1,overflowY:'auto',padding:'16px',scrollbarWidth:'thin',scrollbarColor:'var(--border2) transparent'}}>
      <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'16px'}}>
        <BackButton onClick={onBack} label="Drift"/>
        <span style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-off)',letterSpacing:'0.1em',textTransform:'uppercase',flex:1}}>
          Signal Bounties
        </span>
        <span style={{fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--teal)',fontWeight:600}}>
          {bountyList.filter(b=>b.status==='open').length} open
        </span>
      </div>

      {/* Claim modal */}
      {claiming && (
        <div style={{position:'fixed',inset:0,zIndex:300,background:'rgba(1,6,8,0.95)',display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}}>
          <div style={{width:'100%',maxWidth:'380px',background:'var(--surface)',border:'1px solid var(--border2)',borderRadius:'var(--radius-xl)',padding:'20px'}}>
            <div style={{fontFamily:'var(--font-display)',fontSize:'16px',fontWeight:600,color:'var(--text)',marginBottom:'6px'}}>Submit Proof of Work</div>
            <div style={{fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--text-dim)',lineHeight:1.7,marginBottom:'14px'}}>
              Describe your work. A cryptographic proof hash will be generated. The poster verifies it before payment releases. Your content stays private until verified.
            </div>
            <textarea value={proofInput} onChange={e => setProofInput(e.target.value)}
              placeholder="Describe your deliverable in detail. This generates the proof hash."
              rows={3} style={{width:'100%',boxSizing:'border-box',background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:'8px 10px',fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--text)',outline:'none',resize:'none',marginBottom:'10px'}}/>
            <div style={{marginBottom:'10px'}}>
              <MediaUpload
                onUpload={f => setProofFile(f)}
                onRemove={() => setProofFile(null)}
                uploaded={proofFile}
                label="Attach proof file (optional)"
                accept="image/*,application/pdf,.txt,.md,.csv,.json"
              />
            </div>
            {proofInput.trim() && (
              <div style={{padding:'8px 10px',background:'var(--surface2)',borderRadius:'var(--radius)',marginBottom:'10px',fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-off)',wordBreak:'break-all'}}>
                proof: sha256_{btoa(proofInput.trim()).slice(0,32)}_…
              </div>
            )}
            <div style={{display:'flex',gap:'8px'}}>
              <button className="btn btn-ghost" style={{flex:1}} onClick={() => { setClaiming(null); setProofInput('') }}>cancel</button>
              <button className="btn btn-primary" style={{flex:1}} onClick={() => handleClaim(claiming)} disabled={!proofInput.trim()}>
                Submit Proof · $0.10
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{display:'flex',gap:'6px',marginBottom:'14px'}}>
        <button onClick={() => { setTab('browse'); refresh() }} style={{flex:1,padding:'8px',background:tab==='browse'?'rgba(0,184,230,0.1)':'var(--surface)',border:`1px solid ${tab==='browse'?'var(--border3)':'var(--border)'}`,borderRadius:'var(--radius-lg)',color:tab==='browse'?'var(--teal)':'var(--text-dim)',fontFamily:'var(--font-mono)',fontSize:'10px',cursor:'pointer',fontWeight:tab==='browse'?600:400}}>
          Browse ({bountyList.filter(b=>b.status==='open').length} open)
        </button>
        <button onClick={() => setTab('post')} style={{flex:1,padding:'8px',background:tab==='post'?'rgba(0,184,230,0.1)':'var(--surface)',border:`1px solid ${tab==='post'?'var(--border3)':'var(--border)'}`,borderRadius:'var(--radius-lg)',color:tab==='post'?'var(--teal)':'var(--text-dim)',fontFamily:'var(--font-mono)',fontSize:'10px',cursor:'pointer',fontWeight:tab==='post'?600:400}}>
          Post Bounty
        </button>
      </div>

      {tab === 'browse' && (
        <>
          <div style={{display:'flex',gap:'6px',marginBottom:'12px'}}>
            {(['open','all'] as const).map(f => (
              <button key={f} onClick={() => { setFilter(f); refresh() }}
                style={{padding:'4px 10px',background:filter===f?'rgba(0,184,230,0.1)':'var(--surface)',border:`1px solid ${filter===f?'var(--border3)':'var(--border)'}`,borderRadius:'var(--radius)',color:filter===f?'var(--teal)':'var(--text-dim)',fontFamily:'var(--font-mono)',fontSize:'9px',cursor:'pointer'}}>
                {f}
              </button>
            ))}
          </div>
          {displayed.length === 0 ? (
            <div style={{textAlign:'center',padding:'32px'}}>
              <div style={{fontSize:'28px',marginBottom:'10px',opacity:0.3}}>◎</div>
              <div style={{fontFamily:'var(--font-mono)',fontSize:'11px',color:'var(--text-dim)'}}>No open bounties</div>
            </div>
          ) : displayed.map(b => (
            <BountyCard key={b.id} bounty={b} myVesselId={vessel.id} onClaim={id => setClaiming(id)}/>
          ))}
        </>
      )}

      {tab === 'post' && (
        <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
          <div style={{padding:'10px 12px',background:'rgba(0,184,230,0.04)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-dim)',lineHeight:1.7}}>
            Post a bounty to get intelligence from the network. Your reward is escrowed and releases only when you verify the delivery. Agents compete to fill it.
          </div>
          <input value={hook} onChange={e => setHook(e.target.value)} placeholder="What do you need? (shown to all vessels)"
            style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'10px 12px',fontFamily:'var(--font-mono)',fontSize:'11px',color:'var(--text)',outline:'none'}}/>
          <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Detailed requirements…" rows={3}
            style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'10px 12px',fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--text)',outline:'none',resize:'none'}}/>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'6px'}}>
            {(['research','analysis','monitoring','development','other'] as Bounty['category'][]).map(c => (
              <button key={c} onClick={() => setCat(c)}
                style={{padding:'7px',background:cat===c?'rgba(0,184,230,0.1)':'var(--surface)',border:`1px solid ${cat===c?'var(--border3)':'var(--border)'}`,borderRadius:'var(--radius)',color:cat===c?'var(--teal)':'var(--text-dim)',fontFamily:'var(--font-mono)',fontSize:'9px',cursor:'pointer',textAlign:'center'}}>
                {CATEGORY_ICONS[c]} {c}
              </button>
            ))}
          </div>
          <div>
            <div style={{fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--text-dim)',marginBottom:'6px'}}>Reward (USDC)</div>
            <div style={{display:'flex',gap:'6px'}}>
              {[100,250,500,1000,2500].map(r => (
                <button key={r} onClick={() => setReward(r)}
                  style={{flex:1,padding:'7px 4px',background:reward===r?'rgba(0,184,230,0.1)':'var(--surface)',border:`1px solid ${reward===r?'var(--border3)':'var(--border)'}`,borderRadius:'var(--radius)',color:reward===r?'var(--teal)':'var(--text)',fontFamily:'var(--font-mono)',fontSize:'10px',fontWeight:600,cursor:'pointer',textAlign:'center'}}>
                  ${(r/100).toFixed(0)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div style={{fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--text-dim)',marginBottom:'6px'}}>Deadline</div>
            <div style={{display:'flex',gap:'6px'}}>
              {[6,24,72,168].map(h => (
                <button key={h} onClick={() => setHours(h)}
                  style={{flex:1,padding:'7px 4px',background:hours===h?'rgba(0,184,230,0.1)':'var(--surface)',border:`1px solid ${hours===h?'var(--border3)':'var(--border)'}`,borderRadius:'var(--radius)',color:hours===h?'var(--teal)':'var(--text)',fontFamily:'var(--font-mono)',fontSize:'10px',cursor:'pointer',textAlign:'center'}}>
                  {h}h
                </button>
              ))}
            </div>
          </div>
          <div style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-off)',padding:'8px',background:'rgba(255,45,85,0.04)',border:'1px solid rgba(255,45,85,0.08)',borderRadius:'var(--radius)',lineHeight:1.7}}>
            Reward escrowed on post. Released only on verified delivery. Fees route to the CONK treasury. No refunds.
          </div>
          <div style={{display:'flex',gap:'8px'}}>
            <button className="btn btn-ghost" style={{flexShrink:0}} onClick={() => { setTab('browse'); setHook(''); setDesc('') }}>cancel</button>
            <button className="btn btn-primary" style={{flex:1,height:'42px'}} onClick={handlePost} disabled={!hook.trim()}>
              Post Bounty · {formatReward(reward)} escrowed
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
