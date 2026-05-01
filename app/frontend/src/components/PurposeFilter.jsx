import { useState } from 'react'

const OPTIONS = [
  { key: 'eat',   label: 'Eat'                },
  { key: 'drink', label: 'Drink (Cafe, Bar)'  },
]

// Single-select. `value` is one of OPTIONS.key; defaults to "eat" upstream.
// `vegetarian` is a boolean sub-filter that only applies when value === 'eat'.
export default function PurposeFilter({ value, onChange, vegetarian, onVegetarianChange }) {
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
      <div className="day-row" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
        {OPTIONS.map(({ key, label }) => (
          <button
            key={key}
            className={'day-chip' + (active === key ? ' active' : '')}
            onClick={() => onChange(key)}
            aria-pressed={active === key}
          >{label}</button>
        ))}
        {active === 'eat' && (
          <label className="veg-check">
            <input
              type="checkbox"
              checked={!!vegetarian}
              onChange={(e) => onVegetarianChange?.(e.target.checked)}
            />
            <span>Vegetarian friendly</span>
          </label>
        )}
      </div>
      {helpOpen && (
        <p className="mono-meta dietary-help">
          Restricts semantic search to a curated cluster set.
          &ldquo;Drink&rdquo; searches only cocktail/cafe/bar clusters;
          &ldquo;Eat&rdquo; searches every other cluster.
          When &ldquo;Vegetarian friendly&rdquo; is checked, the search is strictly
          limited to the cluster categorized as vegetarian by the review data.
        </p>
      )}
    </div>
  )
}
