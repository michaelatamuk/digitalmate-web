# A2UI notes

A2UI is the declarative surface format used by DigitalMate for structured task results.
It is an application-level UI protocol, not the network transport.

## Protocol layer

Every shipped scenario now goes through the real A2UI JSONL path. `src/data/makeSurface.ts`
serialises each fixture into `createSurface` → `updateComponents` → `updateDataModel`
envelopes and parses them with `A2uiSurfaceStore` before the renderer sees anything.

- `parseA2uiJsonl` validates one envelope per line and reports line-numbered errors.
- `A2uiSurfaceStore` applies `createSurface` / `updateComponents` / `updateDataModel` /
  `deleteSurface` immutably, keyed by `surfaceId`.
- **More → A2UI protocol demo** shows the same path with a surface built from JSONL.
- The built-in travel, hotel, ride, payment, media, food, social, mail, calendar and document
  fixtures are no longer hand-built objects; they exercise the parser on every render.

## Components currently rendered

`SurfaceRoot`, `Column`, `Row`, `Text`, `InfoRows`, `ActionBar`, `ErrorNotice`,
`ThinkingStream`, `TravelOptions`, `TrainOptions`, `FoodChoices`, `SocialHub`,
`ConfirmPanel`, `GenericToolResults`, `MetricGrid`, `ScheduleStack`, `HeroBanner`,
`FlightBoard`, `List`, `ToolConnectCard`, `ExpandableCard`, `SkeletonCard`, `MediaSlider`,
`SceneTabs`, `MasonryGrid`, `HotelOptions`, `RideOptions`, `PaymentCard`,
`SegmentedRingChart`, `MultiSeriesLineChart`, `MatrixHeatmap`, `ThinkingCard`,
`StripeReceivingAccountCard`.

## Components still missing

None from the tracked native catalog. Future native additions may still appear.

## Next implementation steps

1. Add partial-update throttling and coalescing.
2. Connect the store to a real gateway stream behind `ChatTransport`.
3. Add component-catalog schema validation before rendering unknown payloads.
4. Add any new components introduced by future native builds.

## Target wire format

Newline-delimited JSON, one envelope per line. Exactly one of:

```jsonl
{"version":"v0.9.1","createSurface":{"surfaceId":"surface_train","root":"root","title":"Train search"}}
{"version":"v0.9.1","updateComponents":{"surfaceId":"surface_train","components":[...]}}
{"version":"v0.9.1","updateDataModel":{"surfaceId":"surface_train","path":"/trains","value":[...]}}
{"version":"v0.9.1","deleteSurface":{"surfaceId":"surface_train"}}
```

Components bind to a data model with JSON Pointer paths such as `/rows`, `/trains`,
`/travelOptions`, `/foods`, `/socialHub/items`.

## References

- `docs/architecture/a2ui.md` in the original project
- `agent_core/.../a2ui/A2uiProtocol.ets`
- `agent_core/.../a2ui/A2uiLayoutMerger.ets`
- `agent_core/.../a2ui/A2uiUpdateComponentsStreamScanner.ets`
