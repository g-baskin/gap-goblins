---
type: entity
title: "applyTopicBoost"
entity_type: function
status: developing
created: "2026-05-28"
updated: "2026-05-28"
path: "lib/newsletter/orchestrator.ts"
language: ts
depends_on:
  - "[[entities/classes/NewsletterOrchestrator]]"
used_by:
  - "[[entities/classes/NewsletterOrchestrator]]"
last_commit_hash: "40438e4"
tested_by: []
tags:
  - entity
  - newsletter
  - ranking
related:
  - "[[entities/components/GenerateNewsletterDialog]]"
sources:
  - "lib/newsletter/orchestrator.ts"
partial_scan: true
---

# applyTopicBoost

## Overview

Private method on `NewsletterOrchestrator` introduced this session. Re-ranks a pre-scored list of articles by boosting scores for articles whose title or content contains keywords extracted from the user-supplied `topic` string. Ensures topic-relevant articles surface to the top of the final slice, while zero-match articles remain as fallback so an empty edition is never produced.

## Signature / Definition

```ts
private applyTopicBoost(articles: Article[], topic?: string): Article[]
```

## Behavior

1. **Guard:** if `topic` is blank or falsy, returns `articles` unchanged (`lib/newsletter/orchestrator.ts:294`).
2. **Keyword extraction:** splits `topic.toLowerCase()` on `\W+` and filters to words longer than 3 characters (`lib/newsletter/orchestrator.ts:296–299`). If the resulting keyword array is empty, returns `articles` unchanged.
3. **Boost calculation per article:**
   - Builds `haystack` = `article.title + " " + article.content` (lowercased).
   - Counts `hits` = number of keywords found in haystack.
   - Computes `boost = hits / keywords.length` (range 0..1).
   - Adds `boost * 20` to the article's existing score (`lib/newsletter/orchestrator.ts:304–309`). The `* 20` multiplier ensures even a single keyword hit outweighs most organic recency/content scores (which top out near 1.0).
4. **Re-sorts** the augmented array descending by score and returns it.

**No side effects.** Returns a new array with new article objects (spread syntax); does not mutate the input.

## Connections

- **depends_on:** (uses `Article` type from same module)
- **used_by:** [[entities/classes/NewsletterOrchestrator]] (`generateNewsletter` step 4)
- **related:** [[entities/components/GenerateNewsletterDialog]] (the UI field that populates `options.topic`)

## History

- **Created:** commit `40438e4` — new method (this session)

## Sources

- `lib/newsletter/orchestrator.ts` (lines 293–311)
