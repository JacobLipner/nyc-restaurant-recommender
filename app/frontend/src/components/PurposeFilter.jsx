import { useState } from 'react'

const OPTIONS = [
  { key: 'eat',   label: 'Eat'                },
  { key: 'drink', label: 'Drink (Cafe, Bar)'  },
]

// Single-select. `value` is one of OPTIONS.key; defaults to "eat" upstream.
export default function PurposeFilter({ value, onChange }) {
  const [helpOpen, setHelpOpen] = useState(false)
  const active = value || 'eat'

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <span className="mono-label sublabel" style={{ marginBottom: 0 }}>Purpose of visit</span>
        <button
          type="button"
          className="info-btn"
          onClick={() => setHelpOpen(o => !o)}
          aria-label="What does this filter do?"
          title="What does this filter do?"
        >?</button>
      </div>
      <div className="day-row">
        {OPTIONS.map(({ key, label }) => (
          <button
            key={key}
            className={'day-chip' + (active === key ? ' active' : '')}
            onClick={() => onChange(key)}
            aria-pressed={active === key}
          >{label}</button>
        ))}
      </div>
      {helpOpen && (
        <p className="mono-meta dietary-help">
          Restricts semantic search to a curated cluster set.
          &ldquo;Drink&rdquo; searches only cocktail/cafe/bar clusters;
          &ldquo;Eat&rdquo; searches every other cluster.
        </p>
      )}
    </div>
  )
}
