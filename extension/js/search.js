/**
 * search.js
 * High-Performance Fuzzy Search Engine with Multi-Token, Acronym, and Domain Weighting
 */

export class SearchEngine {
  /**
   * Search an array of items
   * Each item should have { title, href (or url), folder (or category) }
   */
  static search(items, query, options = {}) {
    const rawQuery = (query || '').trim();
    if (!rawQuery) return [];

    const tokens = rawQuery.toLowerCase().split(/\s+/).filter(Boolean);
    const results = [];

    for (const item of items) {
      const url = item.href || item.url || '';
      const title = item.title || item.name || '';
      const folder = item.folder || item.category || '';

      const matchResult = this.scoreItem(title, url, folder, rawQuery, tokens);
      if (matchResult && matchResult.score > 0) {
        results.push({
          item,
          score: matchResult.score,
          highlightedTitle: matchResult.highlightedTitle || escapeHTML(title),
          highlightedUrl: matchResult.highlightedUrl || escapeHTML(url)
        });
      }
    }

    // Sort descending by score
    results.sort((a, b) => b.score - a.score);

    const limit = options.limit || results.length;
    return results.slice(0, limit);
  }

  /**
   * Score an item against full query and tokens
   */
  static scoreItem(title, url, folder, rawQuery, tokens) {
    const q = rawQuery.toLowerCase();
    const titleLower = title.toLowerCase();
    let hostname = '';
    try {
      if (url.startsWith('http://') || url.startsWith('https://')) {
        hostname = new URL(url).hostname.replace(/^www\./, '').toLowerCase();
      }
    } catch {}

    let totalScore = 0;

    // 1. EXACT & PREFIX MATCHES ON TITLE
    if (titleLower === q) {
      totalScore += 500; // Perfect match
    } else if (titleLower.startsWith(q)) {
      totalScore += 300; // Title starts with query
    } else if (hostname && (hostname === q || hostname.startsWith(q))) {
      totalScore += 280; // Domain matches query
    }

    // 2. ACRONYM MATCHING (e.g. "ue5" -> "Unreal Engine 5", "yt" -> "YouTube", "cg" -> "Computer Graphics")
    const acronym = this.getAcronym(title);
    if (acronym && (acronym.toLowerCase() === q || acronym.toLowerCase().startsWith(q))) {
      totalScore += 250;
    }

    // 3. MULTI-TOKEN SCORING
    // Every token must match somewhere (in title, hostname, url, or folder)
    const tokenScores = [];
    const matchedTitleIndices = new Set();
    const matchedUrlIndices = new Set();

    for (const token of tokens) {
      let tokenScore = 0;
      let matchedInItem = false;

      // Check title for token
      const titleMatch = this.fuzzyScoreString(title, token);
      if (titleMatch) {
        tokenScore += titleMatch.score * 2.0;
        titleMatch.indices.forEach(idx => matchedTitleIndices.add(idx));
        matchedInItem = true;
      }

      // Check hostname/domain for token
      if (hostname) {
        if (hostname.includes(token)) {
          tokenScore += 80;
          matchedInItem = true;
        } else {
          const hostMatch = this.fuzzyScoreString(hostname, token);
          if (hostMatch) {
            tokenScore += hostMatch.score * 1.2;
            matchedInItem = true;
          }
        }
      }

      // Check folder/category
      if (folder && folder.toLowerCase().includes(token)) {
        tokenScore += 40;
        matchedInItem = true;
      }

      // If a token didn't match anywhere, this item fails multi-token query
      if (!matchedInItem) {
        return null;
      }

      tokenScores.push(tokenScore);
    }

    totalScore += tokenScores.reduce((acc, s) => acc + s, 0);

    // Build highlighted HTML
    const highlightedTitle = this.buildHighlightedHTML(title, matchedTitleIndices);

    return {
      score: totalScore,
      highlightedTitle
    };
  }

  /**
   * Extract acronym/initials from a title (e.g. "Unreal Engine 5" -> "UE5")
   */
  static getAcronym(str) {
    if (!str) return '';
    const words = str.split(/[\s\-_.:/]+/).filter(Boolean);
    if (words.length <= 1) return '';
    let acr = '';
    for (const w of words) {
      acr += w[0];
      // If there's a trailing number (e.g. "5" in "Engine 5"), capture it
      const numMatch = w.match(/\d+/);
      if (numMatch && w !== numMatch[0]) {
        acr += numMatch[0];
      }
    }
    return acr;
  }

  /**
   * Subsequence fuzzy score with word-boundary, consecutive, and gap penalties
   */
  static fuzzyScoreString(source, pattern) {
    if (!source || !pattern) return null;
    const s = source.toLowerCase();
    const p = pattern.toLowerCase();

    // Exact substring check
    const subIdx = s.indexOf(p);
    if (subIdx !== -1) {
      const indices = new Set();
      for (let i = 0; i < p.length; i++) indices.add(subIdx + i);
      let score = 100 + (p.length * 10);
      if (subIdx === 0) score += 80; // Prefix bonus
      else if (/[\s\-_.\/\\>|]/.test(source[subIdx - 1])) score += 60; // Word boundary bonus
      return { score, indices };
    }

    // Subsequence fuzzy search
    let sIdx = 0;
    let pIdx = 0;
    let score = 0;
    let consecutive = 0;
    const indices = new Set();

    while (sIdx < s.length && pIdx < p.length) {
      if (s[sIdx] === p[pIdx]) {
        indices.add(sIdx);
        score += 15;
        if (consecutive > 0) score += consecutive * 10;
        consecutive++;

        // Bonus for matching at word boundaries or camelCase
        if (sIdx === 0) {
          score += 40;
        } else if (/[\s\-_.\/\\>|]/.test(source[sIdx - 1])) {
          score += 30;
        } else if (source[sIdx] === source[sIdx].toUpperCase() && source[sIdx - 1] === source[sIdx - 1].toLowerCase()) {
          score += 25; // CamelCase boundary
        }

        pIdx++;
      } else {
        consecutive = 0;
        score -= 1; // Gap penalty
      }
      sIdx++;
    }

    // All pattern characters must be found in subsequence
    if (pIdx < p.length) return null;

    // Small penalty for total length difference to favor tighter matches
    score -= (s.length - p.length) * 0.3;

    return { score, indices };
  }

  /**
   * Wrap matched index characters with <span class="fuzzy-match">
   */
  static buildHighlightedHTML(str, matchedIndices) {
    if (!matchedIndices || matchedIndices.size === 0) return escapeHTML(str);
    let html = '';
    for (let i = 0; i < str.length; i++) {
      if (matchedIndices.has(i)) {
        html += `<span class="fuzzy-match">${escapeHTML(str[i])}</span>`;
      } else {
        html += escapeHTML(str[i]);
      }
    }
    return html;
  }
}

function escapeHTML(str) {
  if (!str) return '';
  return String(str).replace(/[&<>'"]/g, tag => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[tag] || tag));
}
