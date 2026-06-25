import { IconGithub } from './Icons.jsx'

const GITHUB_URL = 'https://github.com/JacobLipner/nyc-restaurant-recommender'

export default function AboutModal({ open, onClose }) {
  if (!open) return null
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="content">
          <h2>Team</h2>
          <p>Jacob Lipner · Ashley Ying · Langyue Zhao · Yiduo Lu · Yoonjae Andrew Joung</p>
          <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
            
              className="btn outline"
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              style={{ gap: 8 }}
            >
              <IconGithub size={16} />
              View on GitHub
            </a>
            <button className="btn primary" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </div>
  )
}
