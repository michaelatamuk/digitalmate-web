# A2UI notes

A2UI is the declarative surface format used by DigitalMate for structured task results.
It is an application-level UI protocol, not the network transport.

## Protocol layer

The app still ships hand-built surface fixtures for the built-in scenarios, but it now also
includes a real A2UI JSONL path:

- `parseA2uiJsonl` validates one envelope per line and reports line-numbered errors.
- `A2uiSurfaceStore` applies `createSurface` / `updateComponents` / `updateDataModel` /
  `deleteSurface` immutably, keyed by `surfaceId`.
- **More → A2UI protocol demo** builds a surface from JSONL envelopes and renders it with the
  normal component catalog, including `HeroBanner`, `FlightBoard`, `List`, `ToolConnectCard`,
  `ExpandableCard` and `SkeletonCard`.

## Components currently rendered

`SurfaceRoot`, `Column`, `Row`, `Text`, `InfoRows`, `ActionBar`, `ErrorNotice`,
`ThinkingStream`, `TravelOptions`, `TrainOptions`, `FoodChoices`, `SocialHub`,
`ConfirmPanel`, `GenericToolResults`, `MetricGrid`, `ScheduleStack`, `HeroBanner`,
`FlightBoard`, `List`, `ToolConnectCard`, `ExpandableCard`, `SkeletonCard`, `MediaSlider`,
`SceneTabs`, `MasonryGrid`, `HotelOptions`, `RideOptions`, `PaymentCard`.

## Components still missing

`StripeReceivingAccountCard`, `SegmentedRingChart`, `MultiSeriesLineChart`,
`MatrixHeatmap`, `ThinkingCard` (the chat currently uses a custom thinking card).

## Next implementation steps

1. Move the built-in scenario fixtures onto the JSONL store instead of hand-built objects.
2. Add partial-update throttling and coalescing.
3. Add the remaining chart/data components.
4. Connect the store to a real gateway stream behind `ChatTransport`.
5. Add parser/store tests before connecting to a real gateway. *(done — see
   `tests/a2uiProtocol.test.ts`)*

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
