import 'package:flutter/material.dart' show DateTimeRange;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../core/format.dart' show istToday;
import '../models/insights.dart';
import '../widgets/zone_picker.dart' show areaFilterProvider;
import 'providers.dart';

// Every read follows the area picker: a zone id, a `city:<id>` token or null.
// The API client turns the token into `city=` on the way out.

/// Demand for the next 7 days and how wrong the forecast has been (§17.1).
final demandProvider = FutureProvider.autoDispose<DemandForecast>(
  (ref) => ref.read(insightsRepoProvider).demand(zoneId: ref.watch(areaFilterProvider)?.id),
  retry: (_, _) => null,
);

/// Riders needed each hour against riders usually online (§17.2).
final ridersNeededProvider = FutureProvider.autoDispose<RidersNeeded>(
  (ref) => ref.read(insightsRepoProvider).riders(zoneId: ref.watch(areaFilterProvider)?.id),
  retry: (_, _) => null,
);

// ─── The range the map, benchmarks and service levels share ─────────────

enum RangeChoice { days7, days28, days90, custom }

/// A range of whole IST days, `YYYY-MM-DD`, inclusive at both ends.
class InsightRangeState {
  const InsightRangeState({required this.choice, required this.from, required this.to});
  final RangeChoice choice;
  final String from;
  final String to;

  @override
  bool operator ==(Object other) => other is InsightRangeState && other.choice == choice && other.from == from && other.to == to;

  @override
  int get hashCode => Object.hash(choice, from, to);
}

String _day(DateTime d) => DateFormat('yyyy-MM-dd').format(d);

/// Changing it on one screen keeps it on the others: the same four weeks.
class InsightRangeNotifier extends Notifier<InsightRangeState> {
  static InsightRangeState lastDays(int n, RangeChoice choice, [DateTime? now]) {
    final today = istToday(now);
    return InsightRangeState(choice: choice, from: _day(today.subtract(Duration(days: n - 1))), to: _day(today));
  }

  @override
  InsightRangeState build() => lastDays(28, RangeChoice.days28);

  void setDays(int n) => state = lastDays(n, switch (n) {
        7 => RangeChoice.days7,
        90 => RangeChoice.days90,
        _ => RangeChoice.days28,
      });

  void setCustom(DateTimeRange r) =>
      state = InsightRangeState(choice: RangeChoice.custom, from: _day(r.start), to: _day(r.end));
}

final insightRangeProvider = NotifierProvider<InsightRangeNotifier, InsightRangeState>(InsightRangeNotifier.new);

// ─── Zone map, benchmarks, service levels ───────────────────────────────

final zoneMapProvider = FutureProvider.autoDispose<ZoneMap>(
  (ref) {
    final r = ref.watch(insightRangeProvider);
    return ref.read(insightsRepoProvider).zoneMap(from: r.from, to: r.to, zoneId: ref.watch(areaFilterProvider)?.id);
  },
  retry: (_, _) => null,
);

/// Vendors against their zone's middle (§17.5), a page at a time.
class VendorBenchNotifier extends AsyncNotifier<VendorBenchmarks> {
  bool loadingMore = false;

  @override
  Future<VendorBenchmarks> build() {
    final r = ref.watch(insightRangeProvider);
    return ref.read(insightsRepoProvider).vendors(from: r.from, to: r.to, zoneId: ref.watch(areaFilterProvider)?.id);
  }

  Future<void> loadMore() async {
    final cur = state.value;
    if (cur == null || !cur.hasMore || loadingMore) return;
    loadingMore = true;
    try {
      final r = ref.read(insightRangeProvider);
      final next = await ref.read(insightsRepoProvider).vendors(
            from: r.from,
            to: r.to,
            zoneId: ref.read(areaFilterProvider)?.id,
            page: cur.page + 1,
          );
      state = AsyncData(cur.withMore(next));
    } finally {
      loadingMore = false;
    }
  }
}

final vendorBenchProvider = AsyncNotifierProvider.autoDispose<VendorBenchNotifier, VendorBenchmarks>(
  VendorBenchNotifier.new,
  retry: (_, _) => null,
);

final slaProvider = FutureProvider.autoDispose<SlaReport>(
  (ref) {
    final r = ref.watch(insightRangeProvider);
    return ref.read(insightsRepoProvider).sla(from: r.from, to: r.to, zoneId: ref.watch(areaFilterProvider)?.id);
  },
  retry: (_, _) => null,
);
