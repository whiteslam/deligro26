import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/format.dart';
import '../../models/insights.dart';
import '../../state/insights.dart';
import '../../theme/app_theme.dart';
import '../../widgets/async_view.dart';
import '../../widgets/zone_picker.dart';
import 'insight_format.dart';
import 'insight_widgets.dart';

/// Riders needed (§17.2): the forecast turned into riders for each hour, set
/// against how many are usually online, with the short hours called out.
class RidersNeededScreen extends ConsumerStatefulWidget {
  const RidersNeededScreen({super.key});

  @override
  ConsumerState<RidersNeededScreen> createState() => _RidersNeededScreenState();
}

class _RidersNeededScreenState extends ConsumerState<RidersNeededScreen> {
  String? _day;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final value = ref.watch(ridersNeededProvider);
    return Scaffold(
      backgroundColor: c.bg,
      appBar: AppBar(
        title: const Text('Riders needed'),
        actions: const [Padding(padding: EdgeInsets.only(right: 12), child: AreaPickerChip())],
      ),
      body: AsyncView<RidersNeeded>(
        value: value,
        onRetry: () => ref.invalidate(ridersNeededProvider),
        builder: (r) => RefreshIndicator(
          onRefresh: () => ref.refresh(ridersNeededProvider.future),
          child: _body(context, r),
        ),
      ),
    );
  }

  /// Where the deliveries-per-rider-hour figure came from, in words.
  static String productivityNote(Productivity p) {
    final n = p.deliveriesPerRiderHour.toStringAsFixed(1);
    return switch (p.source) {
      ProductivitySource.zone => 'Based on $n deliveries per rider-hour in this zone.',
      ProductivitySource.platform =>
        'Based on the platform average of $n deliveries per rider-hour, because this zone has too little history of its own.',
      ProductivitySource.fallback => 'Based on a default of $n deliveries per rider-hour until there is enough history.',
    };
  }

  Widget _body(BuildContext context, RidersNeeded r) {
    final c = context.colors;
    if (r.daily.isEmpty) {
      return ListView(children: const [EmptyLine('Nothing to plan yet. This appears once there is a forecast.')]);
    }
    // Open on the first day with a shortage: that is the day to look at.
    final firstShort = r.daily.where((d) => d.shortHours > 0);
    final day = r.daily.any((d) => d.date == _day) ? _day! : (firstShort.isEmpty ? r.daily.first.date : firstShort.first.date);
    final hours = [for (final h in r.hours) if (h.hourStart != null && istDay(h.hourStart!) == day) h];
    final short = [for (final h in hours) if (h.gap > 0) h];
    final wide = MediaQuery.sizeOf(context).width >= 840;

    final headline = r.shortHours > 0
        ? Text('${r.shortHours} ${r.shortHours == 1 ? 'hour' : 'hours'} this week with fewer riders usually online than needed.',
            style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: c.deal))
        : Text('No short hours this week.', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: c.green));

    final strip = Wrap(spacing: 8, runSpacing: 8, children: [
      for (final d in r.daily) _DayCard(day: d, selected: d.date == day, onTap: () => setState(() => _day = d.date)),
    ]);

    final chart = InsightCard(
      title: 'Hour by hour · ${dayWords(day)}',
      subtitle: 'Bars are riders needed; the blue bar is how many are usually online.',
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        _HourBars(hours: hours),
        const SizedBox(height: 8),
        Wrap(spacing: 14, children: [
          LegendKey(color: c.accent, text: 'Needed'),
          LegendKey(color: c.deal, text: 'Needed, and short'),
          LegendKey(color: c.blue, text: 'Usually online'),
        ]),
        if (short.isNotEmpty) ...[
          const SizedBox(height: 14),
          Text('Short hours', key: const Key('short-hours'), style: TextStyle(fontWeight: FontWeight.w800, color: c.ink)),
          const SizedBox(height: 8),
          Wrap(spacing: 8, runSpacing: 8, children: [
            for (final h in short)
              Container(
                key: ValueKey('short-hour-${istOf(h.hourStart!).hour}'),
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(color: c.dealSoft, borderRadius: BorderRadius.circular(999)),
                child: Text(
                  '${hourWord(istOf(h.hourStart!).hour)} · need ${h.ridersNeeded}, usually ${plain(h.ridersUsuallyOnline)}',
                  style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: c.deal),
                ),
              ),
          ]),
        ],
      ]),
    );

    final noteText = Text(productivityNote(r.productivity), key: const Key('productivity-note'), style: TextStyle(fontSize: 12.5, color: c.muted));

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
      children: [
        headline,
        const SizedBox(height: 4),
        noteText,
        const SizedBox(height: 12),
        if (wide)
          Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [strip])),
            const SizedBox(width: 16),
            Expanded(child: chart),
          ])
        else ...[strip, const SizedBox(height: 12), chart],
      ],
    );
  }
}

class _DayCard extends StatelessWidget {
  const _DayCard({required this.day, required this.selected, required this.onTap});
  final RiderDay day;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return InkWell(
      key: Key('rday-${day.date}'),
      borderRadius: BorderRadius.circular(radiusBlock),
      onTap: onTap,
      child: Container(
        width: 96,
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: selected ? c.accentSoft : c.surface,
          border: Border.all(color: selected ? c.accent : c.line),
          borderRadius: BorderRadius.circular(radiusBlock),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(weekdayShort(day.date), style: TextStyle(fontWeight: FontWeight.w800, color: c.ink)),
          const SizedBox(height: 4),
          Text('Needs ${day.peakNeeded}', style: dataStyle(context, size: 12.5)),
          Text('Usually ${plain(day.peakUsual)}', style: TextStyle(fontSize: 12, color: c.muted)),
          const SizedBox(height: 4),
          day.shortHours > 0
              ? Text('${day.shortHours} short', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: c.deal))
              : Text('Covered', style: TextStyle(fontSize: 12, color: c.green)),
        ]),
      ),
    );
  }
}

/// The 24 hours of a day: riders needed (red when short) beside riders usually online.
class _HourBars extends StatelessWidget {
  const _HourBars({required this.hours});
  final List<RiderHour> hours;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final byHour = {for (final h in hours) istOf(h.hourStart!).hour: h};
    var maxY = 1.0;
    for (final h in hours) {
      if (h.ridersNeeded > maxY) maxY = h.ridersNeeded.toDouble();
      if (h.ridersUsuallyOnline > maxY) maxY = h.ridersUsuallyOnline;
    }
    return SizedBox(
      height: 190,
      child: BarChart(BarChartData(
        maxY: maxY * 1.2,
        gridData: FlGridData(drawVerticalLine: false, getDrawingHorizontalLine: (_) => FlLine(color: c.line, strokeWidth: 1)),
        borderData: FlBorderData(show: false),
        titlesData: FlTitlesData(
          topTitles: const AxisTitles(),
          rightTitles: const AxisTitles(),
          leftTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              reservedSize: 28,
              getTitlesWidget: (v, meta) => v == meta.max || v != v.roundToDouble()
                  ? const SizedBox.shrink()
                  : Text(count(v), style: TextStyle(fontSize: 10, color: c.muted)),
            ),
          ),
          bottomTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              getTitlesWidget: (v, _) {
                final h = v.round();
                if (h % 4 != 0) return const SizedBox.shrink();
                return Padding(
                  padding: const EdgeInsets.only(top: 6),
                  child: Text(hourWord(h), style: TextStyle(fontSize: 10, color: c.muted)),
                );
              },
            ),
          ),
        ),
        barGroups: [
          for (var h = 0; h < 24; h++)
            BarChartGroupData(x: h, barsSpace: 1, barRods: [
              BarChartRodData(
                toY: (byHour[h]?.ridersNeeded ?? 0).toDouble(),
                width: 6,
                color: (byHour[h]?.gap ?? 0) > 0 ? c.deal : c.accent,
                borderRadius: const BorderRadius.vertical(top: Radius.circular(2)),
              ),
              BarChartRodData(
                toY: byHour[h]?.ridersUsuallyOnline ?? 0,
                width: 6,
                color: c.blue,
                borderRadius: const BorderRadius.vertical(top: Radius.circular(2)),
              ),
            ]),
        ],
      )),
    );
  }
}
