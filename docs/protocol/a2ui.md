# A2UI notes

A2UI is the declarative surface format used by DigitalMate for structured task results.
It is an application-level UI protocol, not the network transport.

## Current mock behaviour

The web app builds surface objects directly in `src/data/surfaces.en.ts` and
`src/data/surfaces.zh.ts`, then renders them through `src/components/a2ui/A2uiSurfaceView.tsx`.
It does not parse the JSONL wire format yet.

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

## Components currently rendered

`SurfaceRoot`, `Column`, `Row`, `Text`, `InfoRows`, `ActionBar`, `ErrorNotice`,
`ThinkingStream`, `TravelOptions`, `TrainOptions`, `FoodChoices`, `SocialHub`,
`ConfirmPanel`, `GenericToolResults`, `MetricGrid`, `ScheduleStack`.

## Components still missing

`FlightBoard`, `ToolConnectCard`, `StripeReceivingAccountCard`, `List`, `HeroBanner`,
`MediaSlider`, `SceneTabs`, `MasonryGrid`, `SegmentedRingChart`, `MultiSeriesLineChart`,
`MatrixHeatmap`, `ExpandableCard`, `SkeletonCard`, `ThinkingCard` (the chat currently uses a
custom thinking card).

## Next implementation steps

1. Add `src/protocol/a2ui/` with types and a line scanner.
2. Implement a surface store keyed by `surfaceId`.
3. Apply component/data-model updates immutably.
4. Add partial-update throttling.
5. Reuse the existing renderer, replacing hand-built surface objects with parsed state.
6. Add parser/store tests before connecting to a real gateway.

## References

- `docs/architecture/a2ui.md` in the original project
- `agent_core/.../a2ui/A2uiProtocol.ets`
- `agent_core/.../a2ui/A2uiLayoutMerger.ets`
- `agent_core/.../a2ui/A2uiUpdateComponentsStreamScanner.ets`
