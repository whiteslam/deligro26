import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/format.dart' show count, rupees;
import '../../models/insights.dart';
import '../../state/insights.dart';
import '../../theme/app_theme.dart';
import '../../widgets/async_view.dart';
import '../../widgets/zone_picker.dart';
import 'insight_format.dart';
import 'insight_widgets.dart';
import 'range_chips.dart';

/// A metric's value in the unit it is measured in.
String metricValue(BenchMetric m, double? v) {
  if (v == null) return '—';
  return switch (m.unit) {
    'minutes' => minutesWord(v),
    'ratio' => percentWord(v),
    'stars' => plain(double.parse(v.toStringAsFixed(1))),
    'rupees' => rupees(v),
    _ => plain(v),
  };
}

/// "Worse · +22%", "Better · −40%", "In line", "Not enough data": words, so
/// the verdict never rests on colour alone.
String verdictWords(Verdict verdict, double? deltaPct) {
  final delta = deltaPct == null ? '' : ' · ${signedPercent(deltaPct.round())}';
  return switch (verdict) {
    Verdict.better => 'Better$delta',
    Verdict.worse => 'Worse$delta',
    Verdict.inLine => 'In line',
    Verdict.notEnoughData => 'Not enough data',
  };
}

/// Vendor benchmarks (§17.5): each vendor against the middle of its zone on
/// prep time, accept time, cancellations, rating, average order and repeat
/// customers. Vendors with too few orders are listed but not compared.
class VendorBenchmarksScreen extends ConsumerStatefulWidget {
  const VendorBenchmarksScreen({super.key});

  @override
  ConsumerState<VendorBenchmarksScreen> createState() => _VendorBenchmarksScreenState();
}

class _VendorBenchmarksScreenState extends ConsumerState<VendorBenchmarksScreen> {
  /// A metric key, or null for "most orders first".
  String? _sort;
  bool _loadingMore = false;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final value = ref.watch(vendorBenchProvider);
    return Scaffold(
      backgroundColor: c.bg,
      appBar: AppBar(
        title: const Text('Vendor benchmarks'),
        actions: const [Padding(padding: EdgeInsets.only(right: 12), child: AreaPickerChip())],
      ),
      body: Column(children: [
        const Padding(padding: EdgeInsets.fromLTRB(16, 8, 16, 8), child: Align(alignment: Alignment.centerLeft, child: RangeChips())),
        Expanded(
          child: AsyncView<VendorBenchmarks>(
            value: value,
            onRetry: () => ref.invalidate(vendorBenchProvider),
            builder: (b) => RefreshIndicator(onRefresh: () => ref.refresh(vendorBenchProvider.future), child: _list(context, b)),
          ),
        ),
      ]),
    );
  }

  List<VendorBench> _sorted(VendorBenchmarks b) {
    final list = [...b.vendors];
    final key = _sort;
    if (key == null) {
      list.sort((a, z) => z.orders.compareTo(a.orders));
      return list;
    }
    final lowerBetter = b.metrics.where((m) => m.key == key).any((m) => m.better == BetterWhen.lower);
    list.sort((a, z) {
      final x = a.values[key];
      final y = z.values[key];
      if (x == null && y == null) return 0;
      if (x == null) return 1;
      if (y == null) return -1;
      return lowerBetter ? x.compareTo(y) : y.compareTo(x);
    });
    return list;
  }

  Widget _list(BuildContext context, VendorBenchmarks b) {
    final c = context.colors;
    final vendors = _sorted(b);
    final sortLabel = _sort == null ? 'Most orders' : b.metrics.firstWhere((m) => m.key == _sort).label;
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 32),
      children: [
        Text(
          'Each vendor against the middle of its zone. A vendor with fewer than ${b.minOrders} orders is listed but not compared.',
          style: TextStyle(fontSize: 13, color: c.muted, height: 1.35),
        ),
        const SizedBox(height: 12),
        for (final z in b.zones) _MediansCard(group: z, metrics: b.metrics, id: 'medians-${z.id}'),
        if (b.zones.length > 1)
          for (final city in b.cities) _MediansCard(group: city, metrics: b.metrics, id: 'medians-city-${city.id}', allZones: true),
        Align(
          alignment: Alignment.centerLeft,
          child: PopupMenuButton<String>(
            key: const Key('sort-menu'),
            onSelected: (k) => setState(() => _sort = k == 'orders' ? null : k),
            itemBuilder: (_) => [
              const PopupMenuItem(key: Key('sort-orders'), value: 'orders', child: Text('Most orders')),
              for (final m in b.metrics) PopupMenuItem(key: Key('sort-${m.key}'), value: m.key, child: Text(m.label)),
            ],
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: Row(mainAxisSize: MainAxisSize.min, children: [
                Icon(Icons.sort, size: 18, color: c.accent),
                const SizedBox(width: 6),
                Text('Sort: $sortLabel', style: TextStyle(fontWeight: FontWeight.w700, color: c.ink)),
              ]),
            ),
          ),
        ),
        if (vendors.isEmpty) EmptyLine('No vendors had orders in this range.'),
        for (final v in vendors) _VendorRow(vendor: v, bench: b),
        if (b.hasMore)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: OutlinedButton(
              key: const Key('load-more'),
              onPressed: _loadingMore
                  ? null
                  : () async {
                      setState(() => _loadingMore = true);
                      try {
                        await ref.read(vendorBenchProvider.notifier).loadMore();
                      } catch (_) {
                        if (context.mounted) showSnack(context, 'Could not load more. Try again.');
                      } finally {
                        if (mounted) setState(() => _loadingMore = false);
                      }
                    },
              child: Text(_loadingMore ? 'Loading…' : 'Load more'),
            ),
          ),
      ],
    );
  }
}

class _MediansCard extends StatelessWidget {
  const _MediansCard({required this.group, required this.metrics, required this.id, this.allZones = false});
  final BenchGroup group;
  final List<BenchMetric> metrics;
  final String id;
  final bool allZones;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return InsightCard(
      key: Key(id),
      title: '${group.name}${allZones ? ' (all zones)' : ''}',
      subtitle: '${group.vendorsCompared} vendors compared · the middle value for each',
      child: Wrap(spacing: 8, runSpacing: 8, children: [
        for (final m in metrics)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(color: c.surface2, borderRadius: BorderRadius.circular(10)),
            child: Text.rich(TextSpan(children: [
              TextSpan(text: '${m.label}  ', style: TextStyle(fontSize: 12, color: c.muted)),
              TextSpan(text: metricValue(m, group.medians[m.key]), style: dataStyle(context, size: 12.5)),
            ])),
          ),
      ]),
    );
  }
}

class _VendorRow extends StatelessWidget {
  const _VendorRow({required this.vendor, required this.bench});
  final VendorBench vendor;
  final VendorBenchmarks bench;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final few = vendor.orders < bench.minOrders;
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Material(
        key: Key('vendor-row-${vendor.id}'),
        color: c.surface,
        clipBehavior: Clip.antiAlias,
        shape: RoundedRectangleBorder(side: BorderSide(color: c.line), borderRadius: BorderRadius.circular(radiusBlock)),
        child: InkWell(
          onTap: () => context.push('/more/vendors/${vendor.id}'),
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Expanded(child: Text(vendor.name, style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: c.ink))),
                Text('${count(vendor.orders)} orders', style: TextStyle(fontSize: 12.5, color: c.muted)),
              ]),
              if (few)
                Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Text('Fewer than ${bench.minOrders} orders in this range, so it is not compared.',
                      style: TextStyle(fontSize: 12.5, color: c.muted)),
                ),
              const SizedBox(height: 8),
              LayoutBuilder(builder: (context, box) {
                final w = (box.maxWidth - 10) / 2;
                return Wrap(spacing: 10, runSpacing: 8, children: [
                  for (final m in bench.metrics)
                    SizedBox(width: w, child: _Cell(vendor: vendor, metric: m)),
                ]);
              }),
            ]),
          ),
        ),
      ),
    );
  }
}

class _Cell extends StatelessWidget {
  const _Cell({required this.vendor, required this.metric});
  final VendorBench vendor;
  final BenchMetric metric;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final verdict = vendor.verdictOf(metric.key);
    final color = switch (verdict) {
      Verdict.better => c.green,
      Verdict.worse => c.deal,
      _ => c.muted,
    };
    final icon = switch (verdict) {
      Verdict.better => Icons.arrow_circle_up_outlined,
      Verdict.worse => Icons.arrow_circle_down_outlined,
      Verdict.inLine => Icons.drag_handle,
      Verdict.notEnoughData => Icons.remove,
    };
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(metric.label, style: TextStyle(fontSize: 11.5, color: c.muted)),
      Text(metricValue(metric, vendor.values[metric.key]), style: dataStyle(context, size: 15)),
      Row(
        key: Key('verdict-${vendor.id}-${metric.key}'),
        children: [
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 4),
          Flexible(
            child: Text(verdictWords(verdict, vendor.deltaPct[metric.key]),
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: color)),
          ),
        ],
      ),
    ]);
  }
}
