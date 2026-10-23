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

// ─── Fraud, dispatch mode ───────────────────────────────────────────────

/// Fraud cases of one status (§17.6), a page at a time.
class FraudListNotifier extends AsyncNotifier<FraudPage> {
  FraudListNotifier(this.status);
  final FraudStatus status;
  bool loadingMore = false;

  @override
  Future<FraudPage> build() => ref.read(insightsRepoProvider).fraud(status: status, zoneId: ref.watch(areaFilterProvider)?.id);

  Future<void> loadMore() async {
    final cur = state.value;
    if (cur == null || cur.nextCursor == null || loadingMore) return;
    loadingMore = true;
    try {
      final next = await ref
          .read(insightsRepoProvider)
          .fraud(status: status, zoneId: ref.read(areaFilterProvider)?.id, cursor: cur.nextCursor);
      final seen = {for (final c in cur.items) c.alertId};
      state = AsyncData(FraudPage(
        items: [...cur.items, for (final c in next.items) if (!seen.contains(c.alertId)) c],
        nextCursor: next.nextCursor,
        counts: next.counts,
      ));
    } finally {
      loadingMore = false;
    }
  }
}

final fraudListProvider = AsyncNotifierProvider.autoDispose.family<FraudListNotifier, FraudPage, FraudStatus>(
  FraudListNotifier.new,
  retry: (_, _) => null,
);

/// One case by its alert id. The API lists cases by status, so a case reached
/// from a link is looked for in each status in turn (a few pages at most).
final fraudCaseProvider = FutureProvider.autoDispose.family<FraudCase?, String>(
  (ref, alertId) async {
    final repo = ref.read(insightsRepoProvider);
    for (final status in [FraudStatus.open, FraudStatus.dismissed, FraudStatus.resolved]) {
      String? cursor;
      for (var page = 0; page < 5; page++) {
        final p = await repo.fraud(status: status, cursor: cursor);
        for (final c in p.items) {
          if (c.alertId == alertId) return c;
        }
        cursor = p.nextCursor;
        if (cursor == null) break;
      }
    }
    return null;
  },
  retry: (_, _) => null,
);

/// The fraud rules for one zone (null = the platform defaults).
final fraudRulesProvider = FutureProvider.autoDispose.family<FraudRulesView, String?>(
  (ref, zoneId) => ref.read(insightsRepoProvider).fraudRules(zoneId: zoneId),
  retry: (_, _) => null,
);

final dispatchProvider = FutureProvider.autoDispose<DispatchOverview>(
  (ref) => ref.read(insightsRepoProvider).dispatch(),
  retry: (_, _) => null,
);

// ─── Scheduled reports, accounting ──────────────────────────────────────

final schedulesProvider = FutureProvider.autoDispose<ScheduleList>(
  (ref) => ref.read(insightsRepoProvider).schedules(),
  retry: (_, _) => null,
);

/// The runs of one schedule, a page at a time.
class RunsNotifier extends AsyncNotifier<RunPage> {
  RunsNotifier(this.scheduleId);
  final String scheduleId;
  bool loadingMore = false;

  @override
  Future<RunPage> build() => ref.read(insightsRepoProvider).runs(scheduleId);

  Future<void> loadMore() async {
    final cur = state.value;
    if (cur == null || cur.nextCursor == null || loadingMore) return;
    loadingMore = true;
    try {
      final next = await ref.read(insightsRepoProvider).runs(scheduleId, cursor: cur.nextCursor);
      final seen = {for (final r in cur.items) r.id};
      state = AsyncData(RunPage(items: [...cur.items, for (final r in next.items) if (!seen.contains(r.id)) r], nextCursor: next.nextCursor));
    } finally {
      loadingMore = false;
    }
  }
}

final runsProvider = AsyncNotifierProvider.autoDispose.family<RunsNotifier, RunPage, String>(
  RunsNotifier.new,
  retry: (_, _) => null,
);

final runDetailProvider = FutureProvider.autoDispose.family<ReportRun, String>(
  (ref, runId) => ref.read(insightsRepoProvider).run(runId),
  retry: (_, _) => null,
);

/// The accounting export has its own range (up to a year), apart from the
/// one the map, benchmarks and service levels share.
final accountingRangeProvider = NotifierProvider<InsightRangeNotifier, InsightRangeState>(InsightRangeNotifier.new);

final accountingProvider = FutureProvider.autoDispose<AccountingSummary>(
  (ref) {
    final r = ref.watch(accountingRangeProvider);
    return ref.read(insightsRepoProvider).accounting(from: r.from, to: r.to, zoneId: ref.watch(areaFilterProvider)?.id);
  },
  retry: (_, _) => null,
);
