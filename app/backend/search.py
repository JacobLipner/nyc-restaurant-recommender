"""
search.py — end-to-end search orchestration.

Flow:
    build_query(toggles, free_text)
    → embed_query + cluster-aware PCA search (similarity.search_pca_within_clusters)
    → location filter (geo.filter_by_location)
    → time filter (hours.is_open_at)
    → ranking formula (ranking.rank_candidates)
    → slice top N
"""
from __future__ import annotations

import time as _time
from typing import Optional

import numpy as np
import pandas as pd
from sklearn.metrics.pairwise import cosine_similarity

from src.absa       import get_aspect_prefs
from src.ranking    import PRICE_TIER_BLEND, rank_candidates, tier_to_score
from src.similarity import embed_query, has_valid_nyc_zip, search_pca_within_clusters

from .geo           import filter_by_location
from .hours         import is_open_at
from .query_builder import build_query
from .schemas       import (
    MatchedCluster,
    RestaurantSummary,
    SearchRequest,
    SearchResponse,
)
from .state         import STATE


# Retrieval pool sizes. Bigger pool = better coverage when the location
# filter is strict, at the cost of some latency.
TOP_N_CLUSTERS       = 3
K_REVIEWS_PER_SEARCH = 200
RETRIEVAL_POOL       = 200        # restaurants out of the semantic stage

# ── Similarity floor ────────────────────────────────────────────────────────
# Restaurants whose mean review-similarity to the query falls below this
# threshold are dropped at the retrieval stage (this is the same number the
# UI surfaces as "% Match"). Below ~0.30 the match starts to feel arbitrary
# and adds noise to the result list. Range [0.0, 1.0]; set to 0.0 to disable.
MIN_AVG_SIMILARITY: float = 0.30


# ── Purpose-of-visit cluster mapping ────────────────────────────────────────
# Cluster ids that represent "drink" venues (cocktail bars, cafés, dessert
# spots, etc). When the user selects purpose="drink", semantic retrieval is
# restricted to the top-3 of these. When purpose="eat" (default), retrieval
# uses the top-3 of every OTHER cluster.
#
# To retune: inspect cluster keywords/examples in
#   results/clustering/evaluation/cluster_summary.json
# and replace the list below with the matching ids.
DRINK_CLUSTERS: list[int] = [6,15,16,17,19,20,27,31,32,36,43,48]

# Single eat-side cluster considered "vegetarian-friendly" by review content.
# Picked from cluster_summary.json by inspecting top keywords; cluster 46's
# top tokens are ["vegan","vegetarian","friendly","menu","options"]. Must NOT
# overlap DRINK_CLUSTERS — assertion below.
VEGETARIAN_CLUSTER: int = 46
assert VEGETARIAN_CLUSTER not in DRINK_CLUSTERS, "vegetarian cluster must be an eat cluster"


def _matched_clusters(
    best_clusters: list[int],
    centroid_sims: np.ndarray | None = None,
) -> list[MatchedCluster]:
    out = []
    for cid in best_clusters:
        info = STATE.cluster_info.get(cid) or STATE.cluster_info.get(str(cid))
        kws  = (info or {}).get("top_keywords", [])[:5]
        sim  = float(centroid_sims[cid]) if centroid_sims is not None else None
        out.append(MatchedCluster(id=int(cid), top_keywords=kws, similarity=sim))
    return out


def _cluster_fields(gmap_id: str, centroid_sims: np.ndarray | None):
    """Resolve (cluster_id, cluster_keyword, cluster_similarity) for one row."""
    cid = STATE.gmap_to_cluster.get(str(gmap_id))
    if cid is None:
        return None, None, None
    info = STATE.cluster_info.get(cid) or STATE.cluster_info.get(str(cid)) or {}
    kws  = info.get("top_keywords") or []
    keyword = kws[0] if kws else None
    sim = float(centroid_sims[cid]) if centroid_sims is not None else None
    return int(cid), keyword, sim


def _summary_rows(
    df: pd.DataFrame,
    limit: int,
    centroid_sims: np.ndarray | None = None,
) -> list[RestaurantSummary]:
    out: list[RestaurantSummary] = []
    for rank, (_, r) in enumerate(df.head(limit).iterrows(), 1):
        # Aspect scores may or may not be present on the ranked row depending
        # on whether src/ranking merged them in. If missing, fall back to the
        # canonical meta so the sidebar always has something to sort by.
        food    = _float_or_none(r.get("aspect_food"))
        service = _float_or_none(r.get("aspect_service"))
        price_r = _float_or_none(r.get("aspect_price"))
        waitt   = _float_or_none(r.get("aspect_wait_time"))
        price_tier_str = r.get("price") if isinstance(r.get("price"), str) else None
        price_blend = None
        if price_r is not None:
            price_blend = PRICE_TIER_BLEND * price_r + (1 - PRICE_TIER_BLEND) * tier_to_score(price_tier_str)

        cluster_id, cluster_keyword, cluster_similarity = _cluster_fields(
            r["gmap_id"], centroid_sims,
        )
        out.append(RestaurantSummary(
            gmap_id=str(r["gmap_id"]),
            name=str(r.get("name", "")),
            borough=_none_if_nan(r.get("borough")),
            avg_rating=_float_or_none(r.get("avg_rating")),
            num_of_reviews=_int_or_none(r.get("num_of_reviews")),
            price=_none_if_nan(r.get("price")) if isinstance(r.get("price"), str) else None,
            latitude=_float_or_none(r.get("latitude")),
            longitude=_float_or_none(r.get("longitude")),
            final_score=float(r["final_score"]),
            rank=rank,
            avg_similarity=_float_or_none(r.get("avg_similarity")),
            aspect_food=food,
            aspect_service=service,
            aspect_price=price_r,
            aspect_price_blended=price_blend,
            aspect_wait_time=waitt,
            aspect_price_pct=_int_or_none(r.get("aspect_price_pct")),
            aspect_wait_time_pct=_int_or_none(r.get("aspect_wait_time_pct")),
            cluster_id=cluster_id,
            cluster_keyword=cluster_keyword,
            cluster_similarity=cluster_similarity,
        ))
    return out


def _float_or_none(v):
    try:
        f = float(v)
        if np.isnan(f):
            return None
        return f
    except Exception:
        return None


def _int_or_none(v):
    try:
        f = float(v)
        if np.isnan(f):
            return None
        return int(f)
    except Exception:
        return None


def _none_if_nan(v):
    if v is None:
        return None
    if isinstance(v, float) and np.isnan(v):
        return None
    return v


def do_search(req: SearchRequest) -> SearchResponse:
    if not STATE.loaded:
        raise RuntimeError("state not loaded")

    # 1. Compose query string
    query = build_query(req.toggles, req.query)
    if not query.strip():
        raise ValueError("empty query — provide 'query' or toggles")

    # 2. Detect aspect preferences
    prefs = get_aspect_prefs(query)

    # 3. Semantic retrieval (purpose-of-visit restricts the candidate cluster set)
    n_clusters = STATE.centroids.shape[0]
    drink_set = {c for c in DRINK_CLUSTERS if 0 <= c < n_clusters}
    if req.purpose == "drink":
        allowed_clusters = sorted(drink_set)
    elif req.vegetarian and 0 <= VEGETARIAN_CLUSTER < n_clusters:
        # Strict vegetarian filter: search only the single vegetarian cluster.
        allowed_clusters = [VEGETARIAN_CLUSTER]
    else:
        allowed_clusters = [c for c in range(n_clusters) if c not in drink_set]

    t0 = _time.time()
    candidates, best_clusters = search_pca_within_clusters(
        query, STATE.model, STATE.pca, STATE.embeddings_pca,
        STATE.reviews_gmap_ids, STATE.meta,
        STATE.centroids, STATE.clusters,
        top_n_clusters=TOP_N_CLUSTERS,
        k=K_REVIEWS_PER_SEARCH,
        top_n=RETRIEVAL_POOL,
        allowed_clusters=allowed_clusters,
    )
    retrieval_ms = (_time.time() - t0) * 1000.0

    # 3b. Drop low-quality semantic matches before any user-driven filtering.
    # This is part of the retrieval contract (so it does NOT count toward the
    # "filtered out by time/location" tally shown in the UI).
    if MIN_AVG_SIMILARITY > 0 and "avg_similarity" in candidates.columns:
        candidates = candidates[candidates["avg_similarity"] >= MIN_AVG_SIMILARITY].copy()

    # 3c. Recompute query→centroid similarities so we can surface them per
    # restaurant (and per matched cluster) without modifying the shared
    # similarity module. One extra encode (~30-50 ms); centroids are 768-dim
    # full-embedding-space, so the raw query embedding compares directly.
    query_emb = embed_query(query, STATE.model)
    centroid_sims = cosine_similarity(query_emb, STATE.centroids)[0]

    total_candidates = len(candidates)
    if total_candidates == 0:
        return SearchResponse(
            query_effective=query, user_prefs=prefs,
            alpha=req.alpha, beta=req.beta, gamma=req.gamma,
            matched_clusters=_matched_clusters(best_clusters, centroid_sims),
            results=[], total_candidates=0, filtered_candidates=0,
            retrieval_ms=retrieval_ms, rank_ms=0.0,
        )

    # 4. Merge full meta (for lat/lon/hours/category/percentile cols/etc.) onto
    #    candidates if missing. The `aspect_*_pct` columns are display-only;
    #    rank_candidates won't merge them on its own, so we pull them here.
    merge_cols = [c for c in ["address", "latitude", "longitude", "hours", "category",
                              "aspect_price_pct", "aspect_wait_time_pct"]
                  if c not in candidates.columns and c in STATE.meta.columns]
    if merge_cols:
        candidates = candidates.merge(
            STATE.meta[["gmap_id", *merge_cols]], on="gmap_id", how="left"
        )

    # 4b. NYC ZIP-prefix filter. Redundant with the guard inside
    # search_pca_within_clusters, but kept explicit here so future reviewers can
    # see that the backend never emits results from restaurants outside NYC,
    # regardless of how the retrieval layer is swapped out.
    candidates = candidates[candidates["address"].map(has_valid_nyc_zip)].copy()

    # 5. Location filter (mask via meta, then align to candidates)
    if req.location.mode != "all":
        meta_mask = filter_by_location(STATE.meta, req.location)
        allowed_ids = set(STATE.meta.loc[meta_mask, "gmap_id"])
        candidates = candidates[candidates["gmap_id"].isin(allowed_ids)].copy()

    # 6. Time filter
    if not req.time.any_time and req.time.at is not None:
        visit = req.time.at
        is_open = candidates["hours"].apply(lambda h: is_open_at(h, visit))
        # Only drop rows where we *know* they're closed; unknown stays in.
        candidates = candidates[is_open.fillna(True) == True].copy()

    filtered_candidates = len(candidates)
    if filtered_candidates == 0:
        return SearchResponse(
            query_effective=query, user_prefs=prefs,
            alpha=req.alpha, beta=req.beta, gamma=req.gamma,
            matched_clusters=_matched_clusters(best_clusters, centroid_sims),
            results=[],
            total_candidates=total_candidates,
            filtered_candidates=0,
            retrieval_ms=retrieval_ms, rank_ms=0.0,
        )

    # 7. Rank
    t0 = _time.time()
    result = rank_candidates(
        candidates, STATE.meta, prefs,
        alpha=req.alpha, beta=req.beta, gamma=req.gamma,
        log_reviews_max=STATE.log_reviews_max,
    )
    rank_ms = (_time.time() - t0) * 1000.0

    return SearchResponse(
        query_effective=query,
        user_prefs=result.user_prefs,
        alpha=result.alpha, beta=result.beta, gamma=result.gamma,
        matched_clusters=_matched_clusters(best_clusters, centroid_sims),
        results=_summary_rows(result.ranked, req.limit, centroid_sims),
        total_candidates=total_candidates,
        filtered_candidates=filtered_candidates,
        retrieval_ms=retrieval_ms,
        rank_ms=rank_ms,
    )
