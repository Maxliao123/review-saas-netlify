/**
 * Template Matcher
 *
 * Attempts to find a matching reply template for a given review.
 * If found, returns the hydrated template (skipping OpenAI call).
 * If not found, returns null (caller should fall back to AI generation).
 */

export interface ReplyTemplate {
  id: string;
  tenant_id: string;
  name: string;
  category: string;
  min_rating: number;
  max_rating: number;
  vertical: string | null;
  language: string;
  body: string;
  variables: Array<{ key: string; label: string; default?: string }>;
  is_active: boolean;
  use_count: number;
}

export interface MatchContext {
  rating: number;
  language: string;
  vertical: string | null;
  storeName: string;
  authorName: string;
  reviewText: string;
}

/**
 * Find the best matching template from a pre-fetched list.
 * Templates are already filtered by tenant & is_active in the query.
 *
 * Scoring:
 *   - Rating in range: required (filter, not score)
 *   - Language match: required (filter, not score)
 *   - Vertical match: +2 (exact match), +1 (template has null = universal)
 *   - Category match: +3 (if review category is provided)
 *   - Higher use_count (proven template): +0.5 (tiebreaker)
 */
export function findBestTemplate(
  templates: ReplyTemplate[],
  context: MatchContext,
  reviewCategory?: string
): ReplyTemplate | null {
  // Hard filters
  const candidates = templates.filter(t => {
    if (context.rating < t.min_rating || context.rating > t.max_rating) return false;
    if (t.language !== context.language) return false;
    // Vertical: null means "all verticals" → always matches
    if (t.vertical !== null && t.vertical !== context.vertical) return false;
    return true;
  });

  if (candidates.length === 0) return null;

  // Score remaining candidates
  const scored = candidates.map(t => {
    let score = 0;

    // Vertical specificity bonus
    if (t.vertical !== null && t.vertical === context.vertical) {
      score += 2; // Exact vertical match beats universal
    } else if (t.vertical === null) {
      score += 1; // Universal template
    }

    // Category match
    if (reviewCategory && t.category === reviewCategory) {
      score += 3;
    } else if (t.category === 'general') {
      score += 0.5; // Generic fallback
    }

    // Proven templates get a tiny tiebreaker bonus
    score += Math.min(t.use_count / 1000, 0.5);

    return { template: t, score };
  });

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  return scored[0].template;
}

/**
 * Hydrate a template body with context variables.
 * Replaces {{store_name}}, {{author_name}}, {{rating}}, and custom variables.
 */
export function hydrateTemplate(template: ReplyTemplate, context: MatchContext): string {
  let result = template.body;

  // Built-in variables
  result = result.replace(/\{\{store_name\}\}/g, context.storeName);
  result = result.replace(/\{\{author_name\}\}/g, context.authorName);
  result = result.replace(/\{\{rating\}\}/g, String(context.rating));

  // Custom variables — apply defaults
  for (const v of template.variables) {
    const pattern = new RegExp(`\\{\\{${v.key}\\}\\}`, 'g');
    result = result.replace(pattern, v.default || '');
  }

  return result.trim();
}

/**
 * Infer a rough category from the review rating.
 * This is used as a fallback when AI hasn't classified the review yet.
 */
export function inferCategoryFromRating(rating: number): string {
  if (rating >= 4) return 'positive';
  if (rating === 3) return 'neutral';
  return 'negative';
}
