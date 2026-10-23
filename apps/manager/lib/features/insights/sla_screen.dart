import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/format.dart' show count;
import '../../models/insights.dart';
import '../../models/manager_me.dart';
import '../../state/insights.dart';
import '../../state/session.dart';
import '../../theme/app_theme.dart';
import '../../widgets/async_view.dart';
import '../../widgets/zone_picker.dart';
import 'insight_format.dart';
import 'insight_widgets.dart';
import 'range_chips.dart';
import 'sla_targets_sheet.dart';

/// The platform's own default when the server sent none.
const _fallbackTarget = SlaTarget(
  zoneId: null,
  inherited: false,
  acceptMinutes: 5,
  prepMinutes: 20,
  pickupMinutes: 10,
  deliverMinutes: 45,
  updatedBy: null,
  updatedAt: null,
);

/// The targets in force for [zoneId]: its own, else the platform default.
SlaTarget targetFor(SlaReport report, String? zoneId) {
  if (zoneId != null) {
    for (final t in report.targets) {
      if (t.zoneId == zoneId) return t;
    }
  }
  for (final t in report.targets) {
    if (t.zoneId == null) return t;
  }
  return _fallbackTarget;
}

String stageName(SlaStage s) => switch (s) {
      SlaStage.accept => 'Accepting',
      SlaStage.prep => 'Preparing',
      SlaStage.pickup => 'Pickup',
      SlaStage.deliver => 'Delivery',
    };

String _stageWho(SlaStage s) => switch (s) {
      SlaStage.accept => 'the vendor takes the order',
      SlaStage.prep => 'the vendor makes it',
      SlaStage.pickup => 'the rider collects it',
      SlaStage.deliver => 'order placed to delivered',
    };

/// Service levels (§17.9): how often each stage of an order runs past its
/// target, and who it comes down to. The targets are per zone.
class SlaScreen extends ConsumerStatefulWidget {
  const SlaScreen({super.key, this.zoneId});

  /// Set when opened from an SLA alert (`?zone=<id>`): the screen looks at
  /// that zone, if this manager works it.
  final String? zoneId;

  @override
  ConsumerState<SlaScreen> createState() => _SlaScreenState();
}

class _SlaScreenState extends ConsumerState<SlaScreen> {
  bool _applied = false;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final me = ref.watch(managerMeProvider).value;
    final want = widget.zoneId;
    if (!_applied && want != null && me != null) {
      _applied = true;
      for (final z in me.zones.zones) {
        if (z.id == want) {
          // After this frame: a provider cannot change while the tree builds.
          Future.microtask(() {
            if (mounted) ref.read(areaProvider.notifier).set(AreaZone(z.id, z.name, z.cityName));
          });
        }
      }
    }
    final value = ref.watch(slaProvider);
    final canEdit = me != null && (me.isAdmin || me.can('manager.alerts.configure'));
    return Scaffold(
      backgroundColor: c.bg,
      appBar: AppBar(
        title: const Text('Service levels'),
        actions: const [Padding(padding: EdgeInsets.only(right: 12), child: AreaPickerChip())],
      ),
      body: Column(children: [
        const Padding(padding: EdgeInsets.fromLTRB(16, 8, 16, 8), child: Align(alignment: Alignment.centerLeft, child: RangeChips())),
        Expanded(
          child: AsyncView<SlaReport>(
            value: value,
            onRetry: () => ref.invalidate(slaProvider),
            builder: (r) => RefreshIndicator(
              onRefresh: () => ref.refresh(slaProvider.future),
              child: _Body(report: r, me: me, canEdit: canEdit),
            ),
          ),
        ),
      ]),
    );
  }
}

class _Body extends ConsumerWidget {
  const _Body({required this.report, required this.me, required this.canEdit});
  final SlaReport report;
  final ManagerMe? me;
  final bool canEdit;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.colors;
    final areaId = ref.watch(areaFilterProvider)?.id;
    final target = targetFor(report, areaId);
    final wide = MediaQuery.sizeOf(context).width >= 840;

    String zoneName(String? id) {
      if (id == null) return 'Platform default';
      for (final z in me?.zones.zones ?? const <Zone>[]) {
        if (z.id == id) return z.name;
      }
      for (final z in report.byZone) {
        if (z.id == id) return z.name;
      }
      return 'Zone';
    }

    final cards = LayoutBuilder(builder: (context, box) {
      final cols = wide ? 4 : 2;
      final w = (box.maxWidth - 12 * (cols - 1)) / cols;
      return Wrap(spacing: 12, runSpacing: 12, children: [
        for (final s in SlaStage.values)
          SizedBox(width: w, child: _StageCard(stage: s, stat: report.overall.stage(s), target: target.minutesFor(s))),
      ]);
    });

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 32),
      children: [
        Text('Late means a stage took longer than its target. Targets are set per zone.', style: TextStyle(fontSize: 13, color: c.muted)),
        const SizedBox(height: 12),
        cards,
        const SizedBox(height: 12),
        if (report.daily.isNotEmpty) _DailyChart(days: report.daily),
        InsightCard(
          title: 'Targets',
          subtitle: 'Minutes allowed for each stage',
          trailing: canEdit ? TextButton(key: const Key('edit-targets'), onPressed: () => showSlaTargetsSheet(context, report), child: const Text('Edit targets')) : null,
          child: Column(children: [
            for (final t in report.targets)
              ListTile(
                key: Key('target-${t.zoneId ?? 'default'}'),
                contentPadding: EdgeInsets.zero,
                dense: true,
                title: Text(zoneName(t.zoneId), style: TextStyle(fontWeight: FontWeight.w700, color: c.ink)),
                subtitle: Text(
                  t.inherited
                      ? 'Uses the platform default'
                      : 'Accepting ${t.acceptMinutes} · Preparing ${t.prepMinutes} · Pickup ${t.pickupMinutes} · Delivery ${t.deliverMinutes} min'
                          '${t.updatedBy == null ? '' : ' · set by ${t.updatedBy!.name}'}',
                  style: TextStyle(fontSize: 12.5, color: c.muted),
                ),
              ),
          ]),
        ),
        if (report.byZone.isNotEmpty)
          InsightCard(
            title: 'By zone',
            child: Column(children: [for (final z in report.byZone) _GroupRow(rowKey: 'sla-zone-${z.id}', name: z.name, stages: z.stages)]),
          ),
        if (report.byCity.isNotEmpty)
          InsightCard(
            title: 'By city',
            child: Column(children: [for (final z in report.byCity) _GroupRow(rowKey: 'sla-city-${z.id}', name: z.name, stages: z.stages)]),
          ),
        if (report.byVendor.isNotEmpty)
          InsightCard(
            title: 'Vendors running late',
            subtitle: 'The 20 worst, among vendors with at least 5 orders',
            child: Column(children: [
              for (final v in report.byVendor)
                _GroupRow(rowKey: 'sla-vendor-${v.id}', name: v.name, stages: v.stages, only: const [SlaStage.accept, SlaStage.prep]),
            ]),
          ),
        if (report.byRider.isNotEmpty)
          InsightCard(
            title: 'Riders running late',
            subtitle: 'The 20 worst, among riders with at least 5 deliveries',
            child: Column(children: [
              for (final r in report.byRider)
                _GroupRow(
                  rowKey: 'sla-rider-${r.id}',
                  name: r.code == null ? r.name : '${r.name} · ${r.code}',
                  stages: r.stages,
                  only: const [SlaStage.pickup, SlaStage.deliver],
                ),
            ]),
          ),
      ],
    );
  }
}

class _StageCard extends StatelessWidget {
  const _StageCard({required this.stage, required this.stat, required this.target});
  final SlaStage stage;
  final StageStat stat;
  final int target;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final none = stat.orders == 0;
    return Material(
      key: Key('stage-${stage.name}'),
      color: c.surface,
      shape: RoundedRectangleBorder(side: BorderSide(color: c.line), borderRadius: BorderRadius.circular(radiusBlock)),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(stageName(stage), style: TextStyle(fontWeight: FontWeight.w800, color: c.ink)),
          Text(_stageWho(stage), style: TextStyle(fontSize: 11.5, color: c.muted)),
          const SizedBox(height: 8),
          if (none)
            Text('No orders reached this stage', style: TextStyle(fontSize: 13, color: c.muted))
          else ...[
            Text(percentWord(stat.rate), style: dataStyle(context, size: 26, weight: FontWeight.w800)),
            Text('${count(stat.breaches)} of ${count(stat.orders)} late', style: TextStyle(fontSize: 12.5, color: c.ink)),
            const SizedBox(height: 4),
            Text('Median ${minutesWord(stat.medianMinutes)} · target $target min', style: TextStyle(fontSize: 12, color: c.muted)),
          ],
        ]),
      ),
    );
  }
}

Color _stageColor(AppColors c, SlaStage s) => switch (s) {
      SlaStage.accept => c.blue,
      SlaStage.prep => c.accent,
      SlaStage.pickup => c.violet,
      SlaStage.deliver => c.deal,
    };

class _DailyChart extends StatelessWidget {
  const _DailyChart({required this.days});
  final List<SlaDay> days;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    var maxY = 0.1;
    for (final d in days) {
      for (final s in SlaStage.values) {
        if (d.rate(s) > maxY) maxY = d.rate(s);
      }
    }
    return KeyedSubtree(
      key: const Key('sla-daily'),
      child: InsightCard(
        title: 'Late share, day by day',
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          SizedBox(
            height: 180,
            child: LineChart(LineChartData(
              minY: 0,
              maxY: (maxY * 1.2).clamp(0.1, 1),
              gridData: FlGridData(drawVerticalLine: false, getDrawingHorizontalLine: (_) => FlLine(color: c.line, strokeWidth: 1)),
              borderData: FlBorderData(show: false),
              titlesData: FlTitlesData(
                topTitles: const AxisTitles(),
                rightTitles: const AxisTitles(),
                leftTitles: AxisTitles(
                  sideTitles: SideTitles(
                    showTitles: true,
                    reservedSize: 36,
                    getTitlesWidget: (v, meta) =>
                        v == meta.max ? const SizedBox.shrink() : Text(percentWord(v), style: TextStyle(fontSize: 10, color: c.muted)),
                  ),
                ),
                bottomTitles: AxisTitles(
                  sideTitles: SideTitles(
                    showTitles: true,
                    interval: 1,
                    getTitlesWidget: (v, _) {
                      final i = v.round();
                      if (i < 0 || i >= days.length || (days.length > 7 && i % 2 != 0)) return const SizedBox.shrink();
                      return Padding(
                        padding: const EdgeInsets.only(top: 6),
                        child: Text(weekdayShort(days[i].date), style: TextStyle(fontSize: 10, color: c.muted)),
                      );
                    },
                  ),
                ),
              ),
              lineBarsData: [
                for (final s in SlaStage.values)
                  LineChartBarData(
                    spots: [for (var i = 0; i < days.length; i++) FlSpot(i.toDouble(), days[i].rate(s))],
                    color: _stageColor(c, s),
                    barWidth: 2,
                    dotData: FlDotData(show: days.length <= 8),
                  ),
              ],
            )),
          ),
          const SizedBox(height: 8),
          Wrap(spacing: 14, children: [for (final s in SlaStage.values) LegendKey(color: _stageColor(c, s), text: stageName(s))]),
        ]),
      ),
    );
  }
}

/// A name and the late share of the stages that matter for it.
class _GroupRow extends StatelessWidget {
  const _GroupRow({required this.rowKey, required this.name, required this.stages, this.only});
  final String rowKey;
  final String name;
  final SlaStages stages;
  final List<SlaStage>? only;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final shown = only ?? SlaStage.values;
    final parts = [
      for (final s in shown)
        if (stages.stage(s).orders > 0) '${stageName(s)} ${percentWord(stages.stage(s).rate)}',
    ];
    return ListTile(
      key: Key(rowKey),
      contentPadding: EdgeInsets.zero,
      dense: true,
      title: Text(name, style: TextStyle(fontWeight: FontWeight.w700, color: c.ink)),
      subtitle: Text(parts.isEmpty ? 'No orders reached these stages' : '${parts.join(' · ')} late', style: TextStyle(fontSize: 12.5, color: c.muted)),
    );
  }
}
