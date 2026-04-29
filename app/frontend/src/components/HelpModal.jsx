import { useState, useEffect } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import { MS } from './Icons'

function TeX({ math, block = false }) {
  const html = katex.renderToString(math, { displayMode: block, throwOnError: false })
  const Tag = block ? 'div' : 'span'
  return <Tag className={block ? 'tex-block' : 'tex-inline'} dangerouslySetInnerHTML={{ __html: html }} />
}

const CLUSTER_EXAMPLES = [
  { id: 0, name: 'BBQ & Soul Food', keywords: 'chicken, bbq, order, friendly, rice' },
  { id: 1, name: 'Italian Fine Dining', keywords: 'pasta, italian, wine, menu, atmosphere' },
  { id: 12, name: 'Thai & Asian', keywords: 'thai, pad, curry, rice, chicken' },
  { id: 38, name: 'Fast Casual Mexican', keywords: 'chipotle, burrito, clean, location, fresh' },
  { id: 49, name: 'Intimate Bistros', keywords: 'italian, pasta, atmosphere, wine, dinner' },
]

// ───────────────────────────────────────────────────────────────────────
// Pipeline diagram (slide 3): colored boxes + SVG arrows on dotted board.
// Mirrors Gemini_Generated_Image_6lvyde6lvyde6lvy.png — same colors, same
// connections, same swimlane layout.
// ───────────────────────────────────────────────────────────────────────
const PIPELINE_BOXES = [
  { cls: 'pl-step-1', n: 1, title: 'Data Collection',     body: ['(download, preprocessing)', '19,532 restaurants', '2.1M Google reviews', 'Top 500 reviews / location'] },
  { cls: 'pl-step-2', n: 2, title: 'Embedding',           body: ['nomic-embed-text-v1.5', '768-dim vectors', '2 files: metadata + reviews'] },
  // PCA stays in the col-3 row-1 cell (CSS class pl-step-4), but is now
  // labeled Step 3 — and TF-IDF stays in col-2 row-2 (cls pl-step-3) but is
  // labeled Step 4. Cell positions unchanged; only the displayed numbers swap.
  { cls: 'pl-step-4', n: 3, title: 'PCA',                 body: ['768-dim → 128-dim', '75.8% variance kept', '99× faster retrieval'] },
  { cls: 'pl-step-3', n: 4, title: 'TF-IDF',              body: ['Generate 500-word list vector', 'n-gram (1, 2)', 'Text corpus processing'] },
  { cls: 'pl-step-5', n: 5, title: 'K-means Clustering',  body: ['50 semantic groups', 'Both meta embedding + TF-IDF', "Score centroids' meta embedding"] },
  { cls: 'pl-step-6', n: 6, title: 'Semantic Search',     body: ['Search top-3 clusters', 'Cosine similarity (centroid vs query)', 'Top 200 with > 30% score'] },
  { cls: 'pl-step-7', n: 7, title: 'ABSA (NBSN)',         body: ['Food · service · price · wait', 'VADER + Bayesian smoothing', 'Query-aware weights'] },
  { cls: 'pl-step-8', n: 8, title: 'Overall Ranking',     body: ['Personalized · sub-second · location-aware', 'α·rating + β·aspects + γ·log linear combo'] },
  { cls: 'pl-step-9', n: 9, title: 'Filtering',           body: ['Restaurant type (eat, drink) filter', 'Radius · viewport · polygon', 'Time-aware filtering'] },
]

// Each arrow draws after its source box is visible. `src` is the source box
// number; the line and head animation delays are derived from it so the flow
// reads: box → arrow → next box → arrow → ... .
// `src` is the source box's STEP NUMBER (used for animation timing — arrow
// fires `(src-1)*90 + 250` ms after open, i.e. just after the source box
// appears). Comments reflect the step numbering: PCA is step 3, TF-IDF is
// step 4. Box positions in the grid are unchanged.
const PIPELINE_ARROWS = [
  // 1 → 2 (right, row 1)
  { line: 'M 20 9.5 H 26.5',                     head: 'M 25.5 8.85 L 26.5 9.5 L 25.5 10.15 z',   src: 1 },
  // 2 → 3 PCA (right, row 1)
  { line: 'M 46.5 9.5 H 53',                     head: 'M 52 8.85 L 53 9.5 L 52 10.15 z',          src: 2 },
  // 3 PCA → 6 (right, row 1)
  { line: 'M 73 9.5 H 79.5',                     head: 'M 78.5 8.85 L 79.5 9.5 L 78.5 10.15 z',    src: 3 },
  // 1 → 4 TF-IDF (down trunk + right branch into row 2)
  { line: 'M 10 18.5 V 36 H 26.5',               head: 'M 25.5 35.35 L 26.5 36 L 25.5 36.65 z',    src: 1 },
  // 1 → 7 (continues trunk + right branch into row 3)
  { line: 'M 10 36 V 63.5 H 26.5',               head: 'M 25.5 62.85 L 26.5 63.5 L 25.5 64.15 z',  src: 1 },
  // 2 → 5 (skirts TF-IDF box via col 2/3 gap)
  { line: 'M 36.5 18.5 V 22.5 H 49.75 V 36 H 53', head: 'M 52 35.35 L 53 36 L 52 36.65 z',         src: 2 },
  // 4 TF-IDF → 5 (right, row 2)
  { line: 'M 46.5 36 H 53',                      head: 'M 52 35.35 L 53 36 L 52 36.65 z',          src: 4 },
  // 5 → 6 (skirts PCA box via col 3/4 gap)
  { line: 'M 73 36 H 76.25 V 9.5 H 79.5',         head: 'M 78.5 8.85 L 79.5 9.5 L 78.5 10.15 z',   src: 5 },
  // 6 → 8 (down)
  { line: 'M 89.75 18.5 V 54',                   head: 'M 89.5 51.4 L 89.75 54 L 90 51.4 z',       src: 6 },
  // 7 → 8 (long right, row 3)
  { line: 'M 46.5 63.5 H 79.5',                  head: 'M 78.5 62.85 L 79.5 63.5 L 78.5 64.15 z',  src: 7 },
  // 8 → 9 (down)
  { line: 'M 89.75 72.5 V 81',                   head: 'M 89.5 78.4 L 89.75 81 L 90 78.4 z',       src: 8 },
]

function PipelineDiagram() {
  return (
    <div className="pipeline-board">
      {/* Arrows in a 100×100 viewBox stretched to fill. The path stays clean
          because vector-effect=non-scaling-stroke keeps the stroke width
          constant in screen pixels regardless of the non-uniform scaling. */}
      <svg
        className="pipeline-arrows"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {/* 4 cols × 4 rows in a 100×100 viewBox stretched non-uniformly to
            fill the board. Box edges (approx):
              Col 1: x  0–20    Col 2: x 26.5–46.5
              Col 3: x 53–73    Col 4: x 79.5–100
              Row 1: y  0–18.5  Row 2: y 27–45.5
              Row 3: y 54–72.5  Row 4: y 81–100

            The board is wider than it is tall, so 1 horiz viewBox unit
            renders as ~2.5× more screen pixels than 1 vert unit. To make
            arrowheads look the same shape in every direction, the manual
            triangle paths below use different user-space dimensions per
            direction (slim/tall in horiz vs short/wide in vert) so they
            both render as roughly the same on-screen triangle.

            Topology per pipelinesample.png:
              1→2, 2→4, 4→6, 1→3, 1→7, 2→5, 3→5, 5→6, 6→8, 7→8, 8→9      */}

        <g className="lines">
          {PIPELINE_ARROWS.map((a, i) => (
            <path
              key={`l${i}`}
              d={a.line}
              style={{ animationDelay: `${(a.src - 1) * 90 + 250}ms` }}
            />
          ))}
        </g>
        <g className="heads">
          {PIPELINE_ARROWS.map((a, i) => (
            <path
              key={`h${i}`}
              d={a.head}
              style={{ animationDelay: `${(a.src - 1) * 90 + 650}ms` }}
            />
          ))}
        </g>
      </svg>

      <div className="pipeline-grid">
        {PIPELINE_BOXES.map((b, i) => (
          <div
            key={b.n}
            className={`pl-box ${b.cls}`}
            style={{ animationDelay: `${i * 90}ms` }}
          >
            <div className="pl-title">Step {b.n} | {b.title}</div>
            <div className="pl-body">
              {b.body.map((line, j) => <div key={j}>{line}</div>)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ───────────────────────────────────────────────────────────────────────
// Summary tab: README-style explanation (default tab).
// ───────────────────────────────────────────────────────────────────────
function SummaryContent() {
  return (
    <>
      <h2>How this recommender works</h2>
      <p>
        This app combines an embedding-based semantic search over 2.15M Google reviews with an
        aspect-based re-ranker that weighs what you actually care about. The pipeline runs in
        nine stages, fully described in the project README. The diagram below mirrors the stage
        numbers used in the rest of this page.
      </p>

      <div className="summary-pipeline">
        <PipelineDiagram />
      </div>

      <h3>1. Data Collection</h3>
      <p>
        We started with 19,532 NYC restaurants and 2.15M Google reviews from the UCSD Google Local Reviews dataset.
        Reviews were filtered for English (CJK characters removed), grouped by restaurant, and
        downsampled to the top 500 most-detailed reviews per location. Restaurants with fewer than
        15 reviews were dropped.
      </p>

      <details>
        <summary style={{cursor: 'pointer', fontWeight: 'bold', marginBottom: '12px'}}>
          📄 Raw data example (click to expand)
        </summary>
        <div style={{marginLeft: '12px', marginTop: '12px', backgroundColor: '#f9f9f9', padding: '12px', borderRadius: '6px', fontSize: '12px', fontFamily: 'monospace', overflow: 'auto', maxHeight: '200px', lineHeight: '1.4'}}>
          <div><strong>Restaurant Metadata:</strong></div>
          <div>name: "Eleven Madison Park"</div>
          <div>address: "11 Madison Avenue, New York, NY 10010"</div>
          <div>avg_rating: 4.8</div>
          <div>num_reviews: 2847</div>
          <div>price: "$$$$"</div>
          <div>category: ["American", "Fine Dining"]</div>
          <br/>
          <div><strong>Sample Review:</strong></div>
          <div>"Came here for my anniversary. The tasting menu was absolutely</div>
          <div>exquisite — each course was a work of art. Service was impeccable,</div>
          <div>staff anticipated our needs before we even asked. The wine pairing was</div>
          <div>expertly curated. Definitely worth the price tag. Can't wait to go back!"</div>
          <br/>
          <div><strong>After processing →</strong></div>
          <div>✅ Keeps original English review</div>
          <div>✅ Embeds with nomic-embed-text-v1.5 (768-dim)</div>
          <div>✅ Grouped by restaurant</div>
          <div>✅ Filtered by detail level (length)</div>
        </div>
      </details>

      <h3>2. Embedding</h3>
      <p>
        Every review and every metadata blob is embedded once, offline, using <code>nomic-embed-text-v1.5</code>
        (768-dim vectors) — two files in total, one for metadata and one for reviews. Your query gets the
        same treatment at request time. Cosine similarity between embeddings measures how closely two pieces
        of text "mean" the same thing.
      </p>

      <h3>3. PCA compression</h3>
      <p>
        Review embeddings are then projected from 768 dimensions down to 128 by a fitted PCA. This keeps
        <strong> 75.8% of the variance</strong> on the full 2.15M-review production set while making per-query
        retrieval substantially faster. Both restaurant embeddings and your query get projected with the
        same model.
      </p>

      <h3>4. TF-IDF over reviews</h3>
      <p>
        For each restaurant we also compute a 500-dim TF-IDF vector (<code>max_features=500</code>, ngram
        <code>(1, 2)</code>, custom stopword list that strips generic praise words like "great" / "amazing" /
        "delicious"). This captures vocabulary signal that the embedding model alone tends to smooth out
        (e.g. "fried chicken", "bubble tea").
      </p>

      <h3>5. K-means clustering (50 semantic groups)</h3>
      <p>
        Restaurants are clustered with K-means at <strong>k=50</strong> on the
        <code>[meta_emb ‖ tfidf]</code> 1268-dim concatenation (each block L2-normalized so they
        contribute equal mass). The selected model — combined+kmeans, k=50 — beats the meta-only
        baseline on silhouette score by 2× (0.2782 vs 0.1212), and is small enough that the top-3
        cluster shortlist at query time is a coarse but robust pre-filter.
      </p>

      <details>
        <summary style={{cursor: 'pointer', fontWeight: 'bold', marginBottom: '12px'}}>
          📊 Sample cluster profiles (click to expand)
        </summary>
        <div style={{marginLeft: '12px', marginTop: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px'}}>
          {CLUSTER_EXAMPLES.map(cluster => (
            <div key={cluster.id} style={{padding: '8px', backgroundColor: '#f5f5f5', borderRadius: '6px', fontSize: '13px'}}>
              <strong>Cluster {cluster.id}: {cluster.name}</strong>
              <div style={{marginTop: '4px', color: '#666'}}>{cluster.keywords}</div>
              <img
                src={`/results/clustering/evaluation/wordclouds/cluster_${cluster.id}.png`}
                alt={`Cluster ${cluster.id} wordcloud`}
                style={{width: '100%', marginTop: '8px', borderRadius: '4px', maxHeight: '120px', objectFit: 'cover'}}
              />
            </div>
          ))}
        </div>
      </details>

      <h3>6. Semantic search</h3>
      <p>
        Your query is matched against the 50 cluster centroids (stored as the <em>meta-embedding</em> mean
        of each cluster's restaurants), and we keep the top-3. Inside those clusters we run review-level
        cosine similarity in the 128-dim PCA space, then aggregate to restaurants and keep up to 200 with
        an average similarity above 30%. Below ~0.30 the match starts to feel arbitrary, so it gets dropped.
      </p>

      <h3>7. Aspect-based sentiment scoring (ABSA)</h3>
      <p>
        Every restaurant has four precomputed sentiment scores (food, service, price, wait-time) between 0 and 1.
        These come from parsing each review's sentences into clauses, matching keyword lemmas against four
        aspect dictionaries, and running VADER sentiment on each clause — then Bayesian-smoothing against a
        global prior so sparsely-reviewed spots don't explode. Scores are surfaced in the UI as percentile
        ranks against the rest of NYC. See <code>src/absa.py</code>.
      </p>

      <h3>8. Overall ranking formula</h3>
      <p>The final score blends three signals:</p>
      <p><code>final = α · rating/5  +  β · aspect_weighted  +  γ · log(1+reviews) / global_max</code></p>
      <p>
        where <code>aspect_weighted = Σᵢ wᵢ · aspect_i</code> and <code>wᵢ</code> are user aspect weights
        auto-detected from your query (keywords like "cheap" boost the price weight). The price aspect
        blends 50/50 with the <code>$</code>/<code>$$</code>/<code>$$$</code>/<code>$$$$</code> Google Maps
        tier so a cheap restaurant gets a bonus independent of what reviewers happen to have written.
        Defaults: α=0.4 β=0.5 γ=0.1.
      </p>

      <h3>9. Filtering</h3>
      <p>
        Applied <em>after</em> semantic retrieval and ranking. Radius uses haversine distance, viewport uses
        an axis-aligned bounding box, and freeform polygon uses a point-in-polygon test. Time filtering parses
        the Google hours strings and drops restaurants that are definitely closed at your target time (unknown
        hours stay in). The <strong>Restaurant type (eat, drink)</strong> filter narrows the pool to dine-in
        spots vs cafés/bars before ranking is applied.
      </p>
    </>
  )
}

// ───────────────────────────────────────────────────────────────────────
// 9 slides — recreate the original Gamma deck layouts as faithfully as
// possible: Fraunces serif headings, cream background, formulas via KaTeX,
// big stat numbers, quote-card aesthetic.
// ───────────────────────────────────────────────────────────────────────
function Slide({ index }) {
  const slides = [
    // ── Slide 1: TITLE / HOOK ────────────────────────────────────────────
    (
      <div className="slide-title-hero">
        <h1>Beyond Star Ratings: <span style={{color: 'var(--accent)'}}>A Context-Aware Restaurant Recommender</span> for NYC</h1>
        <div className="subtitle">NYU Fundamentals of Machine Learning · Team Noble Jaguars</div>
        <div className="team"><strong>Team:</strong> Ashley Ying · Jacob Lipner · Langyue Zhao · Yiduo Lu · Yoonjae Andrew Joung</div>
        <div className="hero-img-row">
          <img src="/presentation/image_6a.png" alt="Our app's filter UI — date, time, borough" />
          <img src="/presentation/image_6c.png" alt="Search results for 'udon noodles with cozy vibe'" />
          <img src="/presentation/image_1.png" alt="Google Maps native filter — price, rating, hours" />
        </div>
      </div>
    ),

    // ── Slide 2: DATASET OVERVIEW ────────────────────────────────────────
    (
      <>
        <h2>Dataset Overview <span style={{fontSize: '0.65em', color: '#6a6560', fontWeight: 500}}>(After preprocessing)</span></h2>
        <h3 style={{marginTop: 0}}>Google Local Reviews — NYC Subset</h3>
        <p style={{fontSize: 14, color: '#4a4540', margin: '4px 0 0'}}>Source: UCSD Recommender Systems Repository</p>

        <div className="dataset-stats">
          <div>
            <div className="num">19,532</div>
            <div className="label">Restaurants</div>
            <div className="sub">≥15 reviews, NYC</div>
          </div>
          <div>
            <div className="num">2.15M</div>
            <div className="label">Review Texts</div>
            <div className="sub">Full text corpus</div>
          </div>
          <div>
            <div className="num">5</div>
            <div className="label">Boroughs</div>
            <div className="sub">Manhattan · Brooklyn · Queens · Bronx · Staten Island</div>
          </div>
        </div>

        <p className="dataset-meta-line"><strong>Rich metadata:</strong> categories, hours, price tier ($–$$$$), latitude/longitude, ratings</p>
        <p className="dataset-meta-line"><strong>Multilingual reviews:</strong> Handled via the dataset's translated field</p>

        <div className="quote-grid">
          <div className="quote-card">
            <h4>Restaurant Metadata</h4>
            <div className="meta-row"><span className="k">name</span><span className="sep">|</span>Eleven Madison Park</div>
            <div className="meta-row"><span className="k">address</span><span className="sep">|</span>11 Madison Avenue, New York, NY 10010</div>
            <div className="meta-row"><span className="k">avg_rating</span><span className="sep">|</span>4.8</div>
            <div className="meta-row"><span className="k">num_reviews</span><span className="sep">|</span>2847</div>
            <div className="meta-row"><span className="k">price</span><span className="sep">|</span>$$$$</div>
            <div className="meta-row"><span className="k">category</span><span className="sep">|</span>American, Fine Dining</div>
            <div className="meta-row"><span className="k">description</span><span className="sep">|</span>Iconic Madison Square restaurant offering inventive seasonal tasting menus, wine pairings, and refined service.</div>
            <div className="meta-row"><span className="k">hours</span><span className="sep">|</span>Tue–Sat 17:30–22:00, Sun–Mon closed</div>
          </div>
          <div className="quote-card">
            <h4>Sample Review</h4>
            <div className="review-text">
              Came here for my anniversary. The tasting menu was absolutely exquisite — each course was a work of art.
              Service was impeccable, staff anticipated our needs before we even asked. The wine pairing was expertly
              curated. Definitely worth the price tag. Can't wait to go back!
            </div>
          </div>
        </div>
      </>
    ),

    // ── Slide 3: SYSTEM PIPELINE ─────────────────────────────────────────
    (
      <>
        <h2>System Pipeline</h2>
        <PipelineDiagram />
      </>
    ),

    // ── Slide 4: CLUSTERING — FEATURE CONSTRUCTION ──────────────────────
    (
      <>
        <h2>Clustering: Feature Construction</h2>

        <table className="gamma-table">
          <thead>
            <tr>
              <th style={{width: '18%'}}></th>
              <th>Meta Embedding (768d)</th>
              <th>TF-IDF (500d)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Source</strong></td>
              <td>Restaurant metadata (name, category, description)</td>
              <td>Aggregated review text per restaurant</td>
            </tr>
            <tr>
              <td><strong>Captures</strong></td>
              <td>Semantic identity — what it claims to be</td>
              <td>Lexical specificity — what reviewers actually say</td>
            </tr>
            <tr>
              <td><strong>Method</strong></td>
              <td>nomic-embed-text-v1.5</td>
              <td>TF-IDF, ngram=(1,2), custom stop words</td>
            </tr>
            <tr>
              <td><strong>Example</strong></td>
              <td>"Italian restaurant"</td>
              <td>"carbonara", "tasting menu", "cash only"</td>
            </tr>
          </tbody>
        </table>

        <h3>Feature Concatenation</h3>
        <TeX block math="\mathbf{x}_{\text{restaurant}} = \bigl[\, \hat{\mathbf{e}}_{\text{meta}}\,(768d) \,\Vert\, \hat{\mathbf{t}}_{\text{tfidf}}\,(500d) \,\bigr] \in \mathbb{R}^{1268}" />
        <p style={{fontSize: 14, color: '#2a2826', textAlign: 'center', marginTop: 0}}>
          Both blocks are L2-normalized independently before concatenation
        </p>

        <div className="callout">
          <span className="icon">ⓘ</span>
          <span>TF-IDF was not covered in lecture. We adopted it from Grootendorst (2022), <em>BERTopic: Neural Topic Modeling with a Class-based TF-IDF Procedure</em> (arXiv:2203.05794).</span>
        </div>
      </>
    ),

    // ── Slide 5: CLUSTER RESULTS & K-MEANS SELECTION ────────────────────
    (
      <>
        <h2>Cluster Results &amp; K-Means Selection</h2>
        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, margin: '10px 0', maxWidth: 760, marginInline: 'auto'}}>
          <img src="/presentation/image_4a.png" alt="NYC Restaurant Clusters scatter, combined+kmeans k=50" style={{width: '100%', maxHeight: 220, objectFit: 'contain', borderRadius: 4, border: '1px solid #e0dbd2'}} />
          <img src="/presentation/image_4b.png" alt="Silhouette score vs k for all four schemes" style={{width: '100%', maxHeight: 220, objectFit: 'contain', borderRadius: 4, border: '1px solid #e0dbd2'}} />
        </div>
        <p style={{fontFamily: 'Fraunces, Georgia, serif', fontSize: 15, color: '#2a2826', margin: '10px 0', textAlign: 'center'}}>
          Combined features beat metadata-only by <strong>138%</strong>. K-Means outperforms GMM at every K — supporting the choice of <strong>K=50 with combined features</strong>.
        </p>
        <img src="/presentation/image_4c.png" alt="K-Means from scratch, Lloyd's algorithm: 4-step illustration" style={{display: 'block', width: '100%', maxWidth: 820, maxHeight: 200, objectFit: 'contain', borderRadius: 4, border: '1px solid #e0dbd2', marginTop: 4, marginInline: 'auto'}} />
        <p style={{fontFamily: 'var(--mono)', fontSize: 12, color: '#4a4540', marginTop: 6, textAlign: 'center'}}>
          class KMeansFromScratch · src/6b_clustering_full.py
        </p>
      </>
    ),

    // ── Slide 6: PCA DIMENSIONALITY REDUCTION ───────────────────────────
    (
      <>
        <h2>PCA Dimensionality Reduction</h2>
        <p>
          We reduced 768-dimensional sentence embeddings to 128 dimensions using Incremental PCA. Achieved
          <strong> 99x speedup</strong> (locally) and <strong> 83% size reduction</strong> while retaining
          <strong> 75.8% of variance</strong>. Key insight: recall peaks at 128 and drops for higher counts,
          suggesting PCA acts as a noise filter.
        </p>
        <table className="gamma-table">
          <thead>
            <tr>
              <th><strong>n_components</strong></th>
              <th>Explained Var (GPU)</th>
              <th>Recall@10 (GPU)</th>
              <th><strong>Speedup (Local)</strong></th>
              <th>Speedup (GPU)</th>
              <th>Size</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>16</td><td>35.4%</td><td>0%</td><td>194×</td><td>15.6x</td><td>132 MB</td></tr>
            <tr><td>32</td><td>47.2%</td><td>6%</td><td>160×</td><td>8.4x</td><td>263 MB</td></tr>
            <tr><td>64</td><td>60.9%</td><td>30%</td><td>151×</td><td>5.9x</td><td>527 MB</td></tr>
            <tr className="hl">
              <td><span className="hl-cell">128</span></td>
              <td>75.8%</td>
              <td>44%</td>
              <td><span className="hl-cell">99×</span></td>
              <td>3.2x</td>
              <td>1.1 GB</td>
            </tr>
            <tr><td>256</td><td>89.9%</td><td>56%</td><td>50×</td><td>1.2x</td><td>2.1 GB</td></tr>
            <tr><td>384</td><td>96.2%</td><td>66%</td><td>34×</td><td>0.7x</td><td>3.2 GB</td></tr>
            <tr><td>512</td><td>98.8%</td><td>68%</td><td>20×</td><td>0.2x</td><td>4.2 GB</td></tr>
          </tbody>
        </table>
      </>
    ),

    // ── Slide 7: SEMANTIC SEARCH ────────────────────────────────────────
    (
      <>
        <h2>Semantic Search</h2>
        <p>
          Our two-stage semantic search pipeline efficiently retrieves relevant restaurants by understanding
          natural language queries and leveraging pre-clustered data for rapid filtering.
        </p>
        <p>
          This approach enables a <strong>19x search space reduction</strong>, processing ~113K reviews
          instead of 2.1M for final ranking and up to 77x for niche queries.
        </p>
        <p>
          For instance, the query <em>"cheap ramen with fast service"</em> matched clusters 19 (Ramen),
          41 (Noodles), and 28 (Curry).
        </p>
        <img
          src="/presentation/image_6b.png"
          alt="CLI output: Searching clusters [19, 41, 28] across 968 restaurants — top 10 ramen results"
          style={{display: 'block', width: '100%', maxWidth: 720, maxHeight: 320, objectFit: 'contain', borderRadius: 4, border: '1px solid #2a2826', marginTop: 10, marginInline: 'auto'}}
        />
      </>
    ),

    // ── Slide 8: ABSA ───────────────────────────────────────────────────
    (
      <>
        <h2>ABSA: From Stars to Aspects</h2>
        <div style={{display: 'grid', gridTemplateColumns: 'minmax(0, 540px) 1fr', gap: 36, marginTop: 22, alignItems: 'center'}}>
          <div className="absa-mock">
            <div className="absa-card">
              <div className="head"><MS name="restaurant" size={14} />FOOD</div>
              <div className="score-row">
                <MS name="sentiment_very_satisfied" size={40} className="absa-face" />
                <div className="score">5.0<span className="denom">/5</span></div>
              </div>
              <div className="bar" style={{width: '100%'}} />
            </div>
            <div className="absa-card">
              <div className="head"><MS name="room_service" size={14} />SERVICE</div>
              <div className="score-row">
                <MS name="sentiment_very_satisfied" size={40} className="absa-face" />
                <div className="score">4.9<span className="denom">/5</span></div>
              </div>
              <div className="bar" style={{width: '98%'}} />
            </div>
            <div className="absa-card">
              <div className="head"><MS name="attach_money" size={14} />PRICE</div>
              <div className="score-row">
                <MS name="sentiment_frustrated" size={40} className="absa-face" />
                <div className="score">1.7<span className="denom">/5</span></div>
              </div>
              <div className="bar short-1" />
              <div className="pct-line">Feels worth the price more than <strong>23%</strong> of NYC restaurants</div>
            </div>
            <div className="absa-card">
              <div className="head"><MS name="schedule" size={14} />WAIT TIME</div>
              <div className="score-row">
                <MS name="sentiment_neutral" size={40} className="absa-face" />
                <div className="score">3.0<span className="denom">/5</span></div>
              </div>
              <div className="bar short-2" />
              <div className="pct-line">Feels appropriate more than <strong>78%</strong> of NYC restaurants</div>
            </div>
          </div>

          <div className="aspect-arrows">
            <div className="row">
              <div className="arrow">→</div>
              <div className="text">A 4.5-star average doesn't tell you whether it's the food or the service driving that score.</div>
            </div>
            <div className="row">
              <div className="arrow">→</div>
              <div className="text">Our model scores each aspect separately and auto-matches weights to your query.</div>
            </div>
          </div>
        </div>
      </>
    ),

    // ── Slide 9: TECHNICAL PIPELINE & RANKING ───────────────────────────
    (
      <>
        <h2>Technical Pipeline &amp; Ranking</h2>

        <div className="ranking-timeline">
          {[
            { n: 1, label: <>Sentence split →<br/>clause split</> },
            { n: 2, label: <>Keyword match<br/>against 4 aspect<br/>dictionaries</> },
            { n: 3, label: <>VADER sentiment<br/>on each matched<br/>clause</> },
            { n: 4, label: <>Bayesian<br/>smoothing with<br/>global priors</> },
          ].map(s => (
            <div key={s.n} className="ts">
              <div className="num-circle">{s.n}</div>
              <div className="stem" />
              <div className="ts-label">{s.label}</div>
            </div>
          ))}
        </div>

        <h3 style={{marginTop: 24}}>Final ranking formula:</h3>
        <TeX block math="\text{aspect\_weighted} = w_{\text{food}} \cdot s_{\text{food}} + w_{\text{service}} \cdot s_{\text{service}} + w_{\text{price}} \cdot s_{\text{price}} + w_{\text{wait}} \cdot s_{\text{wait}}" />
        <p style={{fontSize: 15, color: '#4a4540'}}>
          Aspect weights are auto-extracted from query language (e.g. "cheap" → w_price ↑, "quick" → w_wait ↑).
        </p>

        <TeX block math="\text{score} = \alpha \cdot \frac{\text{rating}}{5} + \beta \cdot \text{aspect\_weighted} + \gamma \cdot \frac{\log(1 + \text{reviews})}{\log(1 + \max)}" />
        <p style={{fontSize: 15, color: '#4a4540'}}>
          rating ∈ [0,5] google stars, α=0.4, β=0.5, γ=0.1 (tuned via sensitivity analysis)
        </p>
        <p style={{fontSize: 15, color: '#4a4540'}}>
          Review count serves as a credibility signal, log-scaled captures this with diminishing returns.
        </p>
      </>
    ),
  ]

  // Slides 8 (ABSA) and 9 (Ranking) get bigger body text via this class.
  const largeText = index === 7 || index === 8
  return (
    <div className={`slide${largeText ? ' slide-large-text' : ''}`} key={index} aria-live="polite">
      {slides[index]}
    </div>
  )
}

const TOTAL_SLIDES = 9

export default function HelpModal({ open, onClose }) {
  const [mode, setMode] = useState('summary')
  const [slideIdx, setSlideIdx] = useState(0)

  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (mode !== 'presentation') return
      if (e.key === 'ArrowRight') {
        setSlideIdx(i => Math.min(i + 1, TOTAL_SLIDES - 1))
      } else if (e.key === 'ArrowLeft') {
        setSlideIdx(i => Math.max(i - 1, 0))
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, mode, onClose])

  if (!open) return null

  const isPresentation = mode === 'presentation'

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className={`modal help-modal${isPresentation ? ' presentation-mode' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="content">
          <div className="loc-mode-tabs help-modal-tabs">
            <button
              className={mode === 'summary' ? 'active' : ''}
              onClick={() => setMode('summary')}
            >Summary</button>
            <button
              className={mode === 'presentation' ? 'active' : ''}
              onClick={() => setMode('presentation')}
            >Presentation</button>
          </div>

          {!isPresentation && (
            <>
              <SummaryContent />
              <div className="modal-footer">
                <button className="btn primary" onClick={onClose}>Got it</button>
              </div>
            </>
          )}

          {isPresentation && (
            <div className="slide-deck">
              <Slide index={slideIdx} />
              <div className="slide-nav">
                <button
                  className="slide-nav-btn"
                  onClick={() => setSlideIdx(i => Math.max(i - 1, 0))}
                  disabled={slideIdx === 0}
                  aria-label="Previous slide"
                >
                  <MS name="chevron_left" size={22} />
                </button>
                <div className="counter">
                  {slideIdx + 1} / {TOTAL_SLIDES}
                </div>
                <button
                  className="slide-nav-btn"
                  onClick={() => setSlideIdx(i => Math.min(i + 1, TOTAL_SLIDES - 1))}
                  disabled={slideIdx === TOTAL_SLIDES - 1}
                  aria-label="Next slide"
                >
                  <MS name="chevron_right" size={22} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
