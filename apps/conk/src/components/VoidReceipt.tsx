/**
 * CONK Void Receipt
 * Public, transparent record of every fee burned to the treasury.
 * No identity. No vessel ID. Just the economic fact.
 * Trust without exposure. The protocol proves itself healthy.
 *
 * TODO (STEP 6): Read from Sui event stream — treasury transactions
 */
import { useState, useEffect } from 'react'
import { useStore } from '../store/store'

interface VoidReceiptEntry {
  id:        string
  action:    string
  amount:    number    // cents
  timestamp: number
  // No vesselId. No Harbor. No identity. Just the fact.
}

// Mock receipts — STEP 6 reads from Sui treasury event stream
const MOCK_RECEIPTS: VoidReceiptEntry[] = [
  { id:'vr_001', action:'cast',        amount:10,  timestamp: Date.now()-120000   },
  { id:'vr_002', action:'read',        amount:10,  timestamp: Date.now()-300000   },
  { id:'vr_003', action:'dock.connect',amount:50,  timestamp: Date.now()-600000   },
  { id:'vr_004', action:'siren.post',  amount:3,   timestamp: Date.now()-1200000  },
  { id:'vr_005', action:'read',        amount:10,  timestamp: Date.now()-1800000  },
  { id:'vr_006', action:'cast',        amount:10,  timestamp: Date.now()-2400000  },
  { id:'vr_007', action:'vessel.launch',amount:1,  timestamp: Date.now()-3600000  },
  { id:'vr_008', action:'bounty.post', amount:500, timestamp: Date.now()-7200000  },
  { id:'vr_009', action:'read',        amount:10,  timestamp: Date.now()-10800000 },
  { id:'vr_010', action:'cast',        amount:10,  timestamp: Date.now()-14400000 },
]

function timeAgo(ts: number): string {
  const d = Date.now() - ts
  if (d < 60000) return 'just now'
  if (d < 3600000) return `${Math.floor(d/60000)}m ago`
  if (d < 86400000) return `${Math.floor(d/3600000)}h ago`
  return `${Math.floor(d/86400000)}d ago`
}

export function VoidReceipt() {
  const [receipts] = useState(MOCK_RECEIPTS)
  const total = receipts.reduce((sum, r) => sum + r.amount, 0)

  return (
    <div style={{padding:'14px',background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-xl)'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'12px'}}>
        <div>
          <div style={{fontFamily:'var(--font-mono)',fontSize:'10px',fontWeight:600,color:'var(--text)',marginBottom:'2px'}}>
            Void Receipts
          </div>
          <div style={{fontFamily:'var(--font-mono)',fontSize:'8px',color:'var(--text-off)'}}>
            protocol fees · treasury · no identity
          </div>
        </div>
        <div style={{textAlign:'right'}}>
          <div style={{fontFamily:'var(--font-mono)',fontSize:'12px',fontWeight:700,color:'var(--teal)'}}>
            ${(total/100).toFixed(2)}
          </div>
          <div style={{fontFamily:'var(--font-mono)',fontSize:'8px',color:'var(--text-off)'}}>shown</div>
        </div>
      </div>

      <div style={{display:'flex',flexDirection:'column',gap:'4px',maxHeight:'220px',overflowY:'auto',scrollbarWidth:'thin',scrollbarColor:'var(--border2) transparent'}}>
        {receipts.map(r => (
          <div key={r.id} style={{display:'flex',alignItems:'center',gap:'10px',padding:'5px 8px',background:'var(--surface2)',borderRadius:'var(--radius)'}}>
            <div style={{width:'5px',height:'5px',borderRadius:'50%',background:'var(--teal)',opacity:0.5,flexShrink:0}}/>
            <span style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-dim)',flex:1}}>
              {r.action}
            </span>
            <span style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--teal)',fontWeight:600,flexShrink:0}}>
              +${(r.amount/100).toFixed(2)}
            </span>
            <span style={{fontFamily:'var(--font-mono)',fontSize:'8px',color:'var(--text-off)',flexShrink:0}}>
              {timeAgo(r.timestamp)}
            </span>
          </div>
        ))}
      </div>

      <div style={{marginTop:'10px',paddingTop:'8px',borderTop:'1px solid var(--border)',fontFamily:'var(--font-mono)',fontSize:'8px',color:'var(--text-off)',lineHeight:1.7,textAlign:'center'}}>
        Fees route to the CONK treasury. Publicly verifiable on Sui.<br/>
        No identity attached. No vessel ID. Just the economic fact.
      </div>
    </div>
  )
}
