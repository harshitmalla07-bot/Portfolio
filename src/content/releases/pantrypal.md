---
title: PantryPal
type: Single
started: 2026-06-01
finished: 2026-06-30
catalog: 3
rpm: '45'
tagline: Turns any recipe, whether a URL, a TikTok screenshot or a cookbook photo, into a priced, store-matched shopping list in under 10 seconds.
role: Recipe pipeline and pricing, in a hackathon team
stack: [Python, Vision AI, REST APIs, JSON-LD]
status: Built at the H0 Hackathon
color: '#F0997B'
ink: '#4A1B0C'
spin: 4.6
motif: grid
tracks:
  - { title: Recipe URLs parsed from schema.org JSON-LD, kind: Input }
  - { title: Screenshot and photo extraction with vision AI, kind: Input }
  - { title: '8-stage pipeline: normalize, match, price', kind: Pipeline }
  - { title: Unit-to-package conversion layer, kind: Feature }
  - { title: 24-hour product lookup cache, kind: Performance }
# Repo is owned by a teammate and private for now. Once it is public, add:
#   source: https://github.com/harshitmalla07-bot/pantrypal
links: {}
---

Built with a team at the H0 Hackathon. PantryPal takes a recipe in whatever form you have it, whether a web page, a TikTok screenshot or a photo of a cookbook page, and turns it into a shopping list matched to real store products with prices, in under 10 seconds. No more copying ingredients out by hand.

I engineered the pipeline behind it. Two inputs feed one flow: recipe URLs are parsed from their schema.org JSON-LD metadata, and screenshots go through vision-AI extraction. Both converge into a single 8-stage flow that normalizes, matches and prices each ingredient. Ingredient extraction from recipe URLs is over 90% accurate.

The hardest part was reconciling recipe units with how stores actually sell things. "2 tbsp of butter" has to become "one 1 lb block". I built a canonical ingredient dictionary and a conversion layer to handle that, keeping cost estimates within ±15% of real checkout totals.

To keep API costs down, I cached product lookups for 24 hours and merged duplicate queries. I also designed it to do no scraping at all: it only uses screenshots the user supplies and metadata that publishers already expose.
