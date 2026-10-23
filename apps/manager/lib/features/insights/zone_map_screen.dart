import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:latlong2/latlong.dart';

import '../../core/format.dart' show count;
import '../../models/insights.dart';
import '../../state/insights.dart';
import '../../theme/app_theme.dart';
import '../../widgets/async_view.dart';
import '../../widgets/zone_picker.dart';
import '../orders/order_mini_map.dart' show MapPin, mapTilesEnabledProvider, osmTiles;
import 'insight_format.dart';
import 'insight_widgets.dart';
import 'range_chips.dart';

/// The cell a map tap landed in, or null when it fell between them.
GridCell? cellAt(List<GridCell> cells, LatLng p) {
  for (final c in cells) {
    final b = c.bounds;
    if (p.latitude >= b.south && p.latitude <= b.north && p.longitude >= b.west && p.longitude <= b.east) return c;
  }
  return null;
}

enum _Shade { busy, time }

/// Zone map (§17.3): where deliveries go and how long they take, in 1 km
/// squares, with plain suggestions for what to change. No square with fewer
/// than three drops is drawn, so no single household is a marker.
class ZoneMapScreen extends ConsumerStatefulWidget {
  const ZoneMapScreen({super.key, this.controller});

  /// For tests to watch where the map is looking.
  final MapController? controller;

  @override
  ConsumerState<ZoneMapScreen> createState() => _ZoneMapScreenState();
}

class _ZoneMapScreenState extends ConsumerState<ZoneMapScreen> {
  late final MapController _map = widget.controller ?? MapController();
  _Shade _shade = _Shade.busy;

  @override
  void dispose() {
    if (widget.controller == null) _map.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final value = ref.watch(zoneMapProvider);
    return Scaffold(
      backgroundColor: c.bg,
      appBar: AppBar(
        title: const Text('Zone map'),
        actions: const [Padding(padding: EdgeInsets.only(right: 12), child: AreaPickerChip())],
      ),
      body: Column(children: [
        const Padding(padding: EdgeInsets.fromLTRB(16, 8, 16, 8), child: Align(alignment: Alignment.centerLeft, child: RangeChips())),
        Expanded(
          child: AsyncView<ZoneMap>(
            value: value,
            onRetry: () => ref.invalidate(zoneMapProvider),
            builder: (m) => RefreshIndicator(onRefresh: () => ref.refresh(zoneMapProvider.future), child: _content(context, m)),
          ),
        ),
      ]),
    );
  }

  Widget _content(BuildContext context, ZoneMap m) {
    final wide = MediaQuery.sizeOf(context).width >= 840;
    final mapCard = _mapBlock(context, m, wide);
    final side = Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      _suggestions(context, m),
      _busiest(context, m),
      _zones(context, m),
      _cities(context, m),
    ]);
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 32),
      children: [
        if (wide)
          Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Expanded(flex: 3, child: mapCard),
            const SizedBox(width: 16),
            Expanded(flex: 2, child: side),
          ])
        else ...[mapCard, side],
      ],
    );
  }

  // ─── the map ──────────────────────────────────────────────────────────

  Color _shadeColor(BuildContext context, GridCell cell, List<GridCell> all) {
    final c = context.colors;
    double v(GridCell x) => _shade == _Shade.busy ? x.drops.toDouble() : (x.medianDeliveryMinutes ?? x.avgDeliveryMinutes ?? 0);
    final values = [for (final x in all) v(x)];
    final lo = values.reduce((a, b) => a < b ? a : b);
    final hi = values.reduce((a, b) => a > b ? a : b);
    final t = hi == lo ? 0.5 : (v(cell) - lo) / (hi - lo);
    return (_shade == _Shade.busy ? c.accent : c.deal).withValues(alpha: 0.18 + 0.52 * t);
  }

  Widget _mapBlock(BuildContext context, ZoneMap m, bool wide) {
    final c = context.colors;
    final tiles = ref.watch(mapTilesEnabledProvider);
    final points = <LatLng>[
      for (final z in m.zones) ?z.center,
      for (final x in m.cells) ?x.center,
    ];
    final fit = points.length >= 2
        ? CameraFit.coordinates(coordinates: points, padding: const EdgeInsets.all(36), maxZoom: 15)
        : null;
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      ClipRRect(
        borderRadius: BorderRadius.circular(radiusBlock),
        child: SizedBox(
          height: wide ? 540 : 320,
          child: DecoratedBox(
            decoration: BoxDecoration(color: c.surface2),
            child: FlutterMap(
              mapController: _map,
              options: MapOptions(
                initialCenter: points.isEmpty ? const LatLng(21.71, 81.53) : points.first,
                initialZoom: points.isEmpty ? 11 : 13,
                initialCameraFit: fit,
                interactionOptions: const InteractionOptions(flags: InteractiveFlag.all & ~InteractiveFlag.rotate),
                onTap: (_, p) {
                  final cell = cellAt(m.cells, p);
                  if (cell != null) _openCell(context, cell);
                },
              ),
              children: [
                if (tiles) osmTiles(),
                CircleLayer(circles: [
                  for (final z in m.zones)
                    if (z.center != null)
                      CircleMarker(
                        point: z.center!,
                        radius: z.radiusKm * 1000,
                        useRadiusInMeter: true,
                        color: c.blue.withValues(alpha: 0.05),
                        borderColor: c.blue,
                        borderStrokeWidth: 2,
                      ),
                ]),
                PolygonLayer(polygons: [
                  for (final cell in m.cells)
                    Polygon(
                      points: [
                        LatLng(cell.bounds.south, cell.bounds.west),
                        LatLng(cell.bounds.north, cell.bounds.west),
                        LatLng(cell.bounds.north, cell.bounds.east),
                        LatLng(cell.bounds.south, cell.bounds.east),
                      ],
                      color: _shadeColor(context, cell, m.cells),
                      borderColor: cell.insideZone ? c.accent.withValues(alpha: 0.5) : c.deal,
                      borderStrokeWidth: cell.insideZone ? 1 : 2,
                    ),
                ]),
                MarkerLayer(markers: [
                  for (final s in m.suggestions)
                    if (s.center != null)
                      Marker(
                        point: s.center!,
                        width: 30,
                        height: 30,
                        child: MapPin(icon: Icons.lightbulb_outline, color: c.pop, fg: c.popInk, label: s.text),
                      ),
                ]),
              ],
            ),
          ),
        ),
      ),
      const SizedBox(height: 10),
      SegmentedButton<_Shade>(
        key: const Key('shade-toggle'),
        showSelectedIcon: false,
        segments: const [
          ButtonSegment(value: _Shade.busy, label: Text('Busy areas')),
          ButtonSegment(value: _Shade.time, label: Text('Delivery time')),
        ],
        selected: {_shade},
        onSelectionChanged: (s) => setState(() => _shade = s.first),
      ),
      const SizedBox(height: 8),
      _legend(context),
      if (m.cells.isEmpty)
        Padding(
          padding: const EdgeInsets.only(top: 8),
          child: Text(
            'No areas with enough deliveries in this range yet. A square needs at least ${m.minCellDrops} drops to be shown.',
            style: TextStyle(fontSize: 13, color: c.muted),
          ),
        ),
      const SizedBox(height: 12),
    ]);
  }

  Widget _legend(BuildContext context) {
    final c = context.colors;
    final base = _shade == _Shade.busy ? c.accent : c.deal;
    final (low, high) = _shade == _Shade.busy ? ('Fewer drops', 'More drops') : ('Faster deliveries', 'Slower deliveries');
    return Wrap(
      key: const Key('map-legend'),
      crossAxisAlignment: WrapCrossAlignment.center,
      spacing: 4,
      runSpacing: 4,
      children: [
        Text(low, style: TextStyle(fontSize: 12, color: c.muted)),
        const SizedBox(width: 4),
        for (final a in [0.18, 0.34, 0.5, 0.7]) Container(width: 20, height: 12, color: base.withValues(alpha: a)),
        const SizedBox(width: 4),
        Text(high, style: TextStyle(fontSize: 12, color: c.muted)),
      ],
    );
  }

  void _openCell(BuildContext context, GridCell cell) {
    final c = context.colors;
    Widget row(String label, String value) => Padding(
          padding: const EdgeInsets.symmetric(vertical: 5),
          child: Row(children: [
            Expanded(child: Text(label, style: TextStyle(color: c.muted))),
            Text(value, style: dataStyle(context, size: 14)),
          ]),
        );
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (sheet) => SafeArea(
        child: Padding(
          key: const Key('cell-sheet'),
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
          child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('This 1 km square', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: c.ink)),
            const SizedBox(height: 6),
            row('Drops', count(cell.drops)),
            row('Average delivery', minutesWord(cell.avgDeliveryMinutes)),
            row('Median delivery', minutesWord(cell.medianDeliveryMinutes)),
            row('Average distance from the shop', kmWord(cell.avgDistanceKm)),
            row('Distance from the zone centre', kmWord(cell.distanceToZoneCenterKm)),
            const SizedBox(height: 4),
            Text(cell.insideZone ? 'Inside a zone' : 'Outside every zone',
                style: TextStyle(fontWeight: FontWeight.w700, color: cell.insideZone ? c.green : c.deal)),
          ]),
        ),
      ),
    );
  }

  // ─── beside / below the map ───────────────────────────────────────────

  void _show(ZoneSuggestion s, ZoneMap m) {
    if (s.center != null) {
      _map.move(s.center!, 14);
      return;
    }
    for (final z in m.zones) {
      if (z.id == s.zoneId && z.center != null) {
        _map.move(z.center!, 12);
        return;
      }
    }
  }

  IconData _suggestionIcon(SuggestionType t) => switch (t) {
        SuggestionType.newZone => Icons.add_location_alt_outlined,
        SuggestionType.uncoveredDemand => Icons.wrong_location_outlined,
        SuggestionType.slowArea => Icons.hourglass_bottom_outlined,
        SuggestionType.resizeZone => Icons.zoom_in_map_outlined,
        SuggestionType.mergeZone => Icons.merge_type,
        SuggestionType.unknown => Icons.lightbulb_outline,
      };

  Widget _suggestions(BuildContext context, ZoneMap m) {
    final c = context.colors;
    return InsightCard(
      title: 'What to look at',
      subtitle: 'Plain suggestions for ${rangeWords(m.range.from, m.range.to)}. Tap one to see where.',
      child: m.suggestions.isEmpty
          ? Text('Nothing to change right now.', style: TextStyle(color: c.muted))
          : Column(children: [
              for (var i = 0; i < m.suggestions.length; i++)
                ListTile(
                  key: Key('suggestion-$i'),
                  contentPadding: EdgeInsets.zero,
                  dense: true,
                  leading: Icon(_suggestionIcon(m.suggestions[i].type), color: m.suggestions[i].warning ? c.deal : c.muted),
                  title: Text(m.suggestions[i].text, style: TextStyle(fontSize: 13.5, color: c.ink, height: 1.3)),
                  onTap: () => _show(m.suggestions[i], m),
                ),
            ]),
    );
  }

  Widget _busiest(BuildContext context, ZoneMap m) {
    final c = context.colors;
    if (m.cells.isEmpty) return const SizedBox.shrink();
    final top = ([...m.cells]..sort((a, b) => b.drops.compareTo(a.drops))).take(8).toList();
    return InsightCard(
      title: 'Busiest squares',
      subtitle: 'The same figures as tapping the map.',
      child: Column(children: [
        for (final cell in top)
          ListTile(
            key: Key('cell-${cell.key}'),
            contentPadding: EdgeInsets.zero,
            dense: true,
            title: Text('${count(cell.drops)} drops', style: TextStyle(fontWeight: FontWeight.w700, color: c.ink)),
            subtitle: Text(
              '${cell.insideZone ? 'Inside a zone' : 'Outside every zone'} · ${kmWord(cell.distanceToZoneCenterKm)} from the centre',
              style: TextStyle(fontSize: 12, color: c.muted),
            ),
            trailing: Text('median ${minutesWord(cell.medianDeliveryMinutes)}', style: TextStyle(fontSize: 12.5, color: c.muted)),
            onTap: () => _openCell(context, cell),
          ),
      ]),
    );
  }

  Widget _zones(BuildContext context, ZoneMap m) {
    final c = context.colors;
    if (m.zones.isEmpty) return const SizedBox.shrink();
    return InsightCard(
      title: 'Zones',
      child: Column(children: [
        for (final z in m.zones)
          ListTile(
            key: Key('zone-${z.id}'),
            contentPadding: EdgeInsets.zero,
            dense: true,
            title: Text('${z.name} · ${z.cityName}', style: TextStyle(fontWeight: FontWeight.w700, color: c.ink)),
            subtitle: Text(
              '${count(z.drops)} drops · average ${minutesWord(z.avgDeliveryMinutes)} · ${ordersWord(z.ordersPerDay)} orders a day · '
              '${percentWord(z.outsideRadiusShare)} beyond its radius',
              style: TextStyle(fontSize: 12.5, color: c.muted, height: 1.3),
            ),
          ),
      ]),
    );
  }

  Widget _cities(BuildContext context, ZoneMap m) {
    final c = context.colors;
    if (m.cities.isEmpty) return const SizedBox.shrink();
    return InsightCard(
      title: 'Cities',
      child: Column(children: [
        for (final city in m.cities)
          ListTile(
            key: Key('city-${city.id}'),
            contentPadding: EdgeInsets.zero,
            dense: true,
            title: Text(city.name, style: TextStyle(fontWeight: FontWeight.w700, color: c.ink)),
            subtitle: Text(
              '${count(city.drops)} drops · average ${minutesWord(city.avgDeliveryMinutes)} · ${ordersWord(city.ordersPerDay)} orders a day · '
              '${percentWord(city.outsideRadiusShare)} outside zone radii',
              style: TextStyle(fontSize: 12.5, color: c.muted, height: 1.3),
            ),
          ),
      ]),
    );
  }
}
