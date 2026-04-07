/**
 * CONK Legal — Terms of Service + Privacy Policy
 * Minimal, honest, plain language.
 */
import { useState } from 'react'

export function Legal({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<'terms'|'privacy'>('terms')

  return (
    <div style={{position:'fixed',inset:0,zIndex:500,background:'rgba(1,6,8,0.97)',overflowY:'auto',padding:'24px'}}>
      <div style={{maxWidth:'600px',margin:'0 auto'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'24px'}}>
          <div style={{fontFamily:'var(--font-mono)',fontSize:'11px',color:'var(--text-off)',letterSpacing:'0.08em',textTransform:'uppercase'}}>
            Axiom Tide LLC
          </div>
          <button onClick={onClose} style={{background:'none',border:'none',color:'var(--text-off)',cursor:'pointer',fontFamily:'var(--font-mono)',fontSize:'12px'}}>
            × close
          </button>
        </div>

        <div style={{display:'flex',gap:'8px',marginBottom:'24px'}}>
          {(['terms','privacy'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{flex:1,padding:'10px',background:tab===t?'var(--surface)':'none',border:`1px solid ${tab===t?'var(--border2)':'var(--border)'}`,borderRadius:'var(--radius-lg)',color:tab===t?'var(--text)':'var(--text-dim)',fontFamily:'var(--font-mono)',fontSize:'10px',cursor:'pointer',fontWeight:tab===t?600:400}}>
              {t === 'terms' ? 'Terms of Service' : 'Privacy Policy'}
            </button>
          ))}
        </div>

        {tab === 'terms' && (
          <div style={{fontFamily:'var(--font-mono)',fontSize:'11px',color:'var(--text-dim)',lineHeight:1.9}}>
            <div style={{fontFamily:'var(--font-display)',fontSize:'20px',fontWeight:600,color:'var(--text)',marginBottom:'16px'}}>Terms of Service</div>
            <div style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-off)',marginBottom:'24px'}}>Last updated: March 2026 · Axiom Tide LLC · Casper, Wyoming</div>

            {[
              ['1. Protocol in Development', 'CONK is currently a demonstration protocol. All transactions are simulated. No real USDC or cryptocurrency is transferred. Real Sui blockchain integration is in development and will be announced separately.'],
              ['2. Acceptance of Terms', 'By using CONK you agree to these terms. If you disagree, do not use the protocol.'],
              ['3. Permitted Use', 'You may use CONK for lawful communication, agent coordination, and protocol exploration. You may not use CONK to transmit illegal content, coordinate illegal activity, violate the rights of others, or attempt to compromise the security of the protocol.'],
              ['4. Anonymous Communication', 'CONK is designed for anonymous communication. We do not require identity verification. You are responsible for your own compliance with applicable laws in your jurisdiction.'],
              ['5. No Warranties', 'CONK is provided as-is. Axiom Tide LLC makes no warranties about uptime, functionality, or fitness for any particular purpose. Use at your own risk.'],
              ['6. Limitation of Liability', 'Axiom Tide LLC is not liable for any damages arising from your use of CONK, including but not limited to data loss, financial loss, or harm caused by content posted by other users.'],
              ['7. Content', 'You are responsible for content you post. Axiom Tide LLC does not pre-screen content. We may remove content that violates these terms or applicable law.'],
              ['8. Fees', 'Protocol fees, when implemented, route to the CONK treasury operated by Axiom Tide LLC. No refunds. No recovery. Fees are clearly displayed before any transaction.'],
              ['9. Changes', 'We may update these terms. Continued use after changes constitutes acceptance.'],
              ['10. Contact', 'hello@axiomtide.com · Axiom Tide LLC · Casper, Wyoming'],
            ].map(([title, text]) => (
              <div key={title as string} style={{marginBottom:'20px'}}>
                <div style={{color:'var(--text)',fontWeight:600,marginBottom:'6px'}}>{title}</div>
                <div>{text}</div>
              </div>
            ))}
          </div>
        )}

        {tab === 'privacy' && (
          <div style={{fontFamily:'var(--font-mono)',fontSize:'11px',color:'var(--text-dim)',lineHeight:1.9}}>
            <div style={{fontFamily:'var(--font-display)',fontSize:'20px',fontWeight:600,color:'var(--text)',marginBottom:'16px'}}>Privacy Policy</div>
            <div style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text-off)',marginBottom:'24px'}}>Last updated: March 2026 · Axiom Tide LLC · Casper, Wyoming</div>

            {[
              ['Our core privacy commitment', 'CONK is architecturally designed to minimize data collection. The protocol separates payment identity (Harbor) from communication identity (Vessel) at the structural level. This separation is not a policy — it is the design.'],
              ['What we collect', 'In the current demo version: nothing. No accounts. No emails. No phone numbers. No IP logging. Session data is stored locally in your browser only.'],
              ['What we never collect', 'Content of your casts, messages, or channel communications. The link between your Harbor and your Vessel. Your real identity.'],
              ['When real blockchain integration launches', 'On-chain transactions are public by nature of the Sui blockchain. Harbor addresses and Vessel addresses will be pseudonymous identifiers on-chain. We recommend using dedicated wallets for Harbor and Vessel operations, not wallets linked to your real identity.'],
              ['Cookies and tracking', 'We do not use tracking cookies, analytics, or advertising technology. Axiom Tide LLC products are ad-free.'],
              ['Data retention', 'Local browser storage only. You can clear all data at any time by clearing your browser localStorage. There is no server-side storage of your data .'],
              ['Third-party services', 'Vercel hosts the application. Their privacy policy applies to infrastructure. We do not share your data with any third party.'],
              ['Changes to this policy', 'We will notify users of material changes. Continued use constitutes acceptance.'],
              ['Contact', 'Privacy questions: hello@axiomtide.com · Axiom Tide LLC · Casper, Wyoming'],
            ].map(([title, text]) => (
              <div key={title as string} style={{marginBottom:'20px'}}>
                <div style={{color:'var(--text)',fontWeight:600,marginBottom:'6px'}}>{title}</div>
                <div>{text}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
