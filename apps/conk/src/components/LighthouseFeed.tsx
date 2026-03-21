import { useStore } from '../store/store'
import { IconLighthouse, IconBack } from './Icons'
import { DecayBadge } from './DecayBadge'

export function LighthouseFeed({ onOpen, onBack }: { onOpen:(id:string)=>void; onBack:()=>void }) {
  const lighthouses = useStore((s) => s.lighthouses)

  return (
    <div className="drift-col">
      <div className="drift-filter-bar" style={{gap:'8px'}}>
        <button onClick={onBack} style={{display:'flex',alignItems:'center',gap:'5px',background:'none',border:'none',color:'var(--teal)',fontFamily:'var(--font-mono)',fontSize:'10px',cursor:'pointer',padding:0}}>
          <IconBack size={12} color="var(--teal)"/> back
        </button>
        <span style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-off)',letterSpacing:'0.12em',textTransform:'uppercase',marginLeft:'4px'}}>LIGHTHOUSES</span>
        <div style={{marginLeft:'auto',fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-off)'}}>
          earned by the tide · not purchased
        </div>
      </div>

      <div className="drift-feed">
        {lighthouses.map((lh, i) => (
          <div key={lh.id} className="cast-row"
            style={{animationDelay:`${i*50}ms`, cursor:'pointer', flexDirection:'column', padding:0}}
            onClick={() => onOpen(lh.id)}>
            <div style={{display:'flex',gap:'12px',padding:'14px 16px'}}>
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'4px',flexShrink:0,paddingTop:'2px'}}>
                <div style={{width:'20px',height:'20px',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--teal)',filter:'drop-shadow(0 0 6px rgba(0,184,230,0.6))'}}>
                  <IconLighthouse size={16} color="var(--teal)"/>
                </div>
                <div className="cast-thread-line"/>
              </div>
              <div className="cast-content">
                <div className="cast-badges">
                  {lh.isGenesis && (
                    <span className="badge" style={{color:'var(--teal)',borderColor:'rgba(0,184,230,0.25)',background:'rgba(0,184,230,0.07)',letterSpacing:'0.06em'}}>✦ genesis</span>
                  )}
                  <span className="badge badge-time">
                    {new Date(lh.createdAt).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}
                  </span>
                  <span className="cast-tide">{lh.tideCount.toLocaleString()} reads</span>
                  <DecayBadge expiresAt={lh.expiresAt}/>
                </div>
                <div className="cast-hook">{lh.hook}</div>
                <div style={{fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--text-off)',marginTop:'2px'}}>
                  {lh.isGenesis ? 'free to read · permanent · unkillable' : 'click to read · $0.001 · resets 100yr clock'}
                </div>
              </div>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-off)" strokeWidth="1.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
            </div>
          </div>
        ))}

        {lighthouses.length === 0 && (
          <div className="empty-state">
            <IconLighthouse size={32} color="var(--text-off)"/>
            <div>no lighthouses yet</div>
            <div style={{color:'var(--text-off)',fontSize:'10px'}}>earned by the tide — not purchased</div>
          </div>
        )}

        <div style={{padding:'20px 14px',fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-off)',textAlign:'center',lineHeight:1.8,borderTop:'1px solid var(--border)'}}>
          1,000,000 reads in 24h → instant lighthouse<br/>
          500,000 reads × 3 tides → earned lighthouse<br/>
          only open public casts are eligible
        </div>
      </div>
    </div>
  )
}
