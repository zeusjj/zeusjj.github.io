# Astrology synchronization

`astrology.yml` collects the official probability menu hourly (GitHub schedules
can run late) and supports manual dispatch. It commits only changed snapshots
and requests a Pages build. A collection failure exits before any writes.

`astrology-data.js` is the last accepted calculator dataset. Existing IDs and
browser-local sliders remain unchanged. `astrology-source.json` records discovery
and missing fields; missing information never overwrites accepted values.
The publisher preserves newer remote snapshots and their matching data module.

The official content API lists six constellations, option pools and rounded
probabilities at every lock count. The collector requests complete tables and
reconciles pool counts and all four probability columns. It reconstructs the
simplest rational weight consistent with the published rounding for each lock
count, not a single constant weight for an entire constellation.

`astrology-reviewed.json` holds screenshot-confirmed stage/completion effects
and any confirmed costs. Confirmed fields supplement missing official fields;
conflicting values stop collection. Leo and Gemini currently await cost data.
Their confirmed effects remain visible while budget calculations stay pending.

The source is `/api/proxy/lootviewer/api/v2/LootBox/<game>/content`, with the
observed menu key and a page size covering all rows. Every table's row count
must equal its declared total. Unknown formats or unsupported probabilities
are held rather than guessed. Additional mechanics require a reviewed model
change. Costs must be independently confirmed; they are not inferred from rates.

The exact budget optimizer is capped at 60,000 combined states before accepting
an expanded dataset. Larger additions remain pending until solver capacity is
verified. This avoids automatically shipping a browser memory/time regression.

Local collection: `ASTROLOGY_CHROME=1 node docs/.github/scripts/collect-astrology.mjs docs`.
Tests: `node scripts/test-astrology-source.mjs`.
