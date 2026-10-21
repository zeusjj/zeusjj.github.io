# Astrology synchronization

`astrology.yml` collects the official probability menu hourly (GitHub schedules
can run late) and supports manual dispatch. It commits only changed snapshots
and requests a Pages build. A collection failure exits before any writes.

`astrology-data.js` is the last accepted calculator dataset. Existing IDs and
browser-local sliders remain unchanged. `astrology-source.json` records discovery
and missing fields; missing information never overwrites accepted values.
The publisher preserves newer remote snapshots and their matching data module.

The official source currently lists six constellations but exposes only their
central-star counts. Leo and Gemini therefore remain pending. The collector
does not assume costs, outer-star weights, or effects from earlier stars.

Supported complete source tables have explicitly labelled scalar rows:
`중앙 별 개수`, `외곽 별 개수`, `외곽 별 가중치`, `기본 비용`, `잠금 비용`;
stage effects use columns `일치 개수 | 능력치 | 수치`, completion effects use
`완성 효과 | 수치`. A source format change requires adapting and testing the
parser; unknown formats are held rather than guessed. Only the current weighted
draw model is supported. Additional mechanics require a reviewed model change.

The exact budget optimizer is capped at 60,000 combined states before accepting
an expanded dataset. Larger additions remain pending until solver capacity is
verified. This avoids automatically shipping a browser memory/time regression.

Local collection: `ASTROLOGY_CHROME=1 node docs/.github/scripts/collect-astrology.mjs docs`.
Tests: `node scripts/test-astrology-source.mjs`.
