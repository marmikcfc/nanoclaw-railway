---
name: market-analysis
description: Produce a comprehensive market analysis report for a business idea. Includes keyword trends, proof signals, community analysis, competitive landscape, market gaps, founder edge, value ladder, and execution plan. Output as a PDF artifact.
inputs:
  - name: EXA_API_KEY
    description: Exa API key for structured web search across Reddit, G2, Product Hunt, YouTube, Facebook
    required: true
---

## When to use

- When the user asks to analyze or refine a business idea
- When asked to generate a market analysis report
- When asked to find communities, competitors, or proof signals for an idea
- When asked to create a go-to-market strategy or value ladder

## When NOT to use

- For general Q&A not related to market analysis
- When the user just wants a quick opinion (use conversation instead)

## IMPORTANT: Use Exa, not WebSearch

**Always use the Exa API (`curl` commands below) for research, NOT the built-in WebSearch tool.** Exa provides structured, domain-filtered results with highlights and summaries. WebSearch returns generic search results that are harder to parse and less relevant. Every community, competitor, and signal search should go through Exa.

If `EXA_API_KEY` is not set, inform the user that the API key is missing and the report quality will be degraded.

## IMPORTANT: Do NOT WebFetch x.com/twitter.com URLs

X/Twitter blocks headless fetches (returns "JavaScript is disabled"). Instead:
- Use the `x-search` skill for Twitter signal discovery (searches via Grok API)
- Treat any x.com URLs in the task context as **pre-verified references** — cite them directly without fetching
- For reading specific tweets/threads: `x-search thread "<url>"`
- For finding demand signals: `x-search query "voice AI operations" --from 2025-01-01`
- **Never call WebFetch on x.com, twitter.com, or old.twitter.com** — it will always fail

## Report Structure

When asked to generate a full market analysis report, produce a PDF with these sections. Each section should be well-researched using Exa API and x-search. Run searches in parallel where possible (multiple curl commands) to speed up research.

### 1. Executive Summary

- Business thesis (2-3 paragraphs explaining the opportunity)
- Viability tags: assess and include relevant tags like "Perfect Timing", "10x Better", "Unfair Advantage", "Clear Monetization", "Growing Market", "Low Competition"
- Overall viability score: X/10

### 2. Keyword & Trend Analysis

Research search volume and interest trends to validate market demand:

**Google Trends Proxy** — use Exa to find recent articles citing Google Trends data:
```bash
curl -s -X POST https://api.exa.ai/search \
  -H "content-type: application/json" \
  -H "x-api-key: $EXA_API_KEY" \
  -d '{
    "query": "[TOPIC] google trends growth search volume 2025 2026",
    "numResults": 10,
    "type": "auto",
    "startPublishedDate": "2025-01-01",
    "contents": {
      "highlights": { "maxCharacters": 3000 },
      "summary": true
    }
  }'
```

**Keyword signals to find:**
- Primary keywords and their relative search interest (growing, stable, declining)
- Related/emerging keywords that indicate market shifts
- Seasonal patterns or cyclical demand
- Geographic hotspots (which regions search most)
- Long-tail keywords revealing specific pain points (e.g., "[competitor] alternative", "[problem] solution")

**Output format:**
| Keyword | Trend Direction | Signal |
|---------|----------------|--------|
| [keyword] | Rising/Stable/Declining | [what it tells us] |

### 3. Why Now?

- Market timing signals (technology shifts, regulatory changes, cultural trends)
- Growth data (market size, CAGR, recent funding rounds in the space)
- What has changed recently that makes this viable now vs. 2 years ago
- Inflection points: new APIs, cost drops, platform changes, regulatory shifts

### 4. Proof Signals

Score each category out of 10 with specific evidence:

**Emotional Frustration Signals** (X/10)
- Pain points from Reddit, Twitter, forums
- "I wish", "I hate", "why can't" signals with sources and links

**Time-Sensitive Needs** (X/10)
- Market growth urgency, platform shifts, regulatory deadlines

**Systemic Barriers** (X/10)
- Gaps in existing solutions, underserved verticals, compliance gaps

**Community Demand & Engagement** (X/10)
- Search volume, community sizes, discussion activity, upvote counts

### 5. Community Analysis

Research and document relevant communities where the idea can be validated and early users acquired. For EACH community found:
- **Name** and platform
- **Size** (member/subscriber count)
- **Relevance** — why this community cares about this problem
- **Activity level** — how often people post, engagement quality
- **Opportunity** — how to engage (share insights, not spam)
- **2-3 relevant discussions** with links and key quotes

**Platforms to search (use Exa commands below):**
- Reddit — subreddits, threads with high engagement
- Facebook — groups (especially closed/private ones in the niche)
- YouTube — channels covering the space, popular videos
- LinkedIn — groups, influencers posting about the topic
- Discord/Slack — communities (search for invite links)
- Product Hunt — related launches and discussions
- Niche forums — industry-specific (e.g., Indie Hackers, Hacker News, Stack Overflow)

### 6. Competitive Landscape

- Top 5-10 competitors with: name, URL, pricing, strengths, weaknesses
- Product Hunt launches (recent, relevant)
- G2 reviews and sentiment
- Feature comparison matrix
- Key differentiation opportunities

### 7. Market Gap Analysis

Score each area out of 10:

**Underserved Customer Segments** (X/10)
- Who is being ignored by current solutions

**Feature Gaps** (X/10)
- What existing products fail to deliver

**Geographic Opportunities** (X/10)
- Underserved regions or markets

**Integration Opportunities** (X/10)
- Partnerships and platform integrations

**Differentiation Levers** (X/10)
- What would make this 10x better than alternatives

### 8. Your Edge — Founder-Market Fit

Analyze the founder's unique advantages based on their profile/context (from task context or workspace description):

**Background Advantage**
- Relevant industry experience (years, companies, roles)
- Technical expertise that competitors lack
- Network and relationships in the space

**Credibility Signals**
- Past exits, companies built, or products shipped
- Public presence (social following, content, speaking)
- Domain expertise that would take competitors years to replicate

**Unfair Advantages**
- Proprietary data, technology, or access
- Distribution channels already built
- First-mover or timing advantage
- Cost structure advantages

**Edge Score: X/10** — with explanation of how defensible the founder's position is.

If no founder context is available, skip this section and note that founder profile information would strengthen the analysis.

### 9. Value Ladder Strategy

Adapt based on business type (see Business Type Adaptation below):

| Stage | Offer | Price | Value Provided | Goal |
|-------|-------|-------|----------------|------|
| Lead Magnet | [Free resource] | Free | [What it teaches] | Build awareness |
| Frontend Offer | [Entry product] | $X/mo | [What user gets] | Convert to paying |
| Core Offer | [Main product] | $XX/mo | [Full value] | Generate revenue |
| Continuity Program | [Add-ons/expansion] | $X/mo per | [Extended value] | Increase LTV |
| Backend Offer | [Premium/enterprise] | $XXX+/yr | [White-glove] | Maximize revenue |

### 10. Execution Plan

- **Business Classification**: Type, model (SaaS/marketplace/content/etc.)
- **Target Audience**: Buyer personas (2-3), key pain points
- **Success Metrics**: CAC target, churn rate target, conversion rate, revenue targets
- **Resource Requirements**: Budget range, team structure, timeline
- **Risk Assessment**: Top 3 risks with mitigations
- **Phase 1 Roadmap (0-6 months)**: Core strategy, MVP approach, initial offer, pricing
- **Acquisition Channels**: For each channel — platform, content format, frequency, target metrics
- **Phase 2 Outlook (6-18 months)**: Growth strategy, traction milestones, expansion plan

### 11. Citations & Sources

List ALL URLs referenced in the report with brief descriptions.

---

## Exa Search Commands

Use `exa-search` for all research. **Always prefer exa-search over WebSearch.** Run searches in parallel for speed.

```bash
# Communities
exa-search "communities and discussions about [TOPIC]" --domain reddit.com
exa-search "facebook groups for [TOPIC]" --domain facebook.com
exa-search "[TOPIC] tutorials and reviews" --domain youtube.com
exa-search "[TOPIC] linkedin groups and discussions" --domain linkedin.com
exa-search "[TOPIC] discord server OR slack community invite"

# Competitors & reviews
exa-search "[COMPETITOR] reviews and alternatives" --domain g2.com --limit 5
exa-search "[TOPIC] product launch" --domain producthunt.com
exa-search "[TOPIC] discussion building launching" --domain indiehackers.com,news.ycombinator.com

# Trends & market data
exa-search "[TOPIC] google trends growth 2025 2026" --since 2025-01-01 --summary
exa-search "[TOPIC] market size CAGR funding" --summary

# General research
exa-search "[QUERY]" --summary --limit 10
```

Replace `[TOPIC]`, `[COMPETITOR]`, and `[QUERY]` with actual search terms.

Full options: `exa-search --help`

---

## Twitter/X Signals

Use the `x-search` skill (if available) to find demand and complaint signals on Twitter/X. Search for:
- People asking for solutions: "wish there was", "looking for", "need a tool"
- Complaints about existing products: "hate", "switching from", "broken"
- Market validation: product announcements, launch reactions
- Founders/builders discussing the space

---

## Business Type Adaptation

Adapt your research focus and value ladder based on the business type (from task context):

**Tech / SaaS**
- Communities: Reddit (r/SaaS, r/startups, r/Entrepreneur), Hacker News, Product Hunt
- Value ladder: Free trial / Freemium -> Pro ($29-99/mo) -> Team ($99-299/mo) -> Enterprise (custom)
- Key metrics: MRR, churn rate, CAC, LTV

**Content / Creator** (Newsletter, Podcast, YouTube)
- Communities: Twitter/X, niche subreddits, creator forums
- Value ladder: Free content -> Paid newsletter ($5-15/mo) -> Course ($97-497) -> Community ($49/mo) -> Consulting ($500+/hr)
- Key metrics: Subscribers, open rate, paid conversion, sponsorship revenue

**E-Commerce / DTC**
- Communities: Facebook groups, TikTok, Instagram, Shopify forums
- Value ladder: Lead magnet (discount) -> Single product ($20-80) -> Bundle ($80-200) -> Subscription box ($30-60/mo) -> Wholesale/B2B
- Key metrics: AOV, repeat purchase rate, CAC, ROAS

**Agency / Services**
- Communities: LinkedIn groups, industry associations, Clutch/UpCity
- Value ladder: Free audit -> Starter package ($500-2K) -> Monthly retainer ($2-10K/mo) -> White-label ($5-20K/mo) -> Licensing
- Key metrics: Client retention, project margins, utilization rate

**Local Business**
- Communities: Local Facebook groups, Nextdoor, Google Maps, Yelp
- Value ladder: Free trial/visit -> Starter package ($50-200) -> Membership ($50-150/mo) -> Premium ($200-500/mo) -> Events/workshops
- Key metrics: Customer retention, local search ranking, review count

---

## PDF Output

When producing the final report:
1. Write the complete report as a well-formatted markdown document to `/workspace/group/market_analysis.md`
2. Use the `pdf` skill to convert it to a PDF at `/workspace/group/market_analysis.pdf`
3. Include all links as clickable URLs
4. Add a disclaimer at the bottom: "Analysis, scores, and revenue estimates are educational and based on assumptions. Results vary by execution and market conditions."
5. **Upload BOTH files immediately** — this is mandatory:
```
mcp__pepper__upload_artifact({
  file_path: "/workspace/group/market_analysis.pdf",
  title: "Market Analysis: [IDEA NAME]"
})
mcp__pepper__upload_artifact({
  file_path: "/workspace/group/market_analysis.md",
  title: "Market Analysis (source): [IDEA NAME]"
})
```

Store key findings in workspace memory so other team members can access them:
```
mcp__pepper__workspace_memory({ action: "remember", text: "Market analysis for [IDEA]: [KEY FINDING]" })
```
