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

/// Demand forecast (§17.1): orders expected hour by hour for the next 7 days,
/// with how wrong the same method was on the last 14 days — stated, not hidden.
class DemandScreen extends ConsumerStatefulWidget {
  const DemandScreen({super.key});

  @override
  ConsumerState<DemandScreen> createState() => _DemandScreenState();
}

class _DemandScreenState extends ConsumerState<DemandScreen> {
  String? _day;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final value = ref.watch(demandProvider);
    return Scaffold(
      backgroundColor: c.bg,
      appBar: AppBar(
        title: const Text('Demand forecast'),
        actions: const [Padding(padding: EdgeInsets.only(right: 12), child: AreaPickerChip())],
      ),
      body: AsyncView<DemandForecast>(
        value: value,
        onRetry: () => ref.invalidate(demandProvider),
        builder: (d) => RefreshIndicator(
          onRefresh: () => ref.refresh(demandProvider.future),
          child: _body(context, d),
        ),
      ),
    );
  }

  Widget _body(BuildContext context, DemandForecast d) {
    final c = context.colors;
    if (d.daily.isEmpty) {
      return ListView(children: const [EmptyLine('No forecast yet. It appears once there are orders to learn from.')]);
    }
    final day = d.daily.any((x) => x.date == _day) ? _day! : d.daily.first.date;
    final hours = d.hoursOn(day);
    final wide = MediaQuery.sizeOf(context).width >= 840;

    final week = InsightCard(
      title: 'Next 7 days',
      trailing: d.insufficientHistory
          ? Text('Rough estimate', key: const Key('rough-label'), style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: c.deal))
          : null,
      subtitle: 'Orders expected each day. Tap a day to see its hours.',
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        _WeekBars(days: d.daily, selected: day, onPick: (date) => setState(() => _day = date)),
        const SizedBox(height: 10),
        Wrap(spacing: 8, runSpacing: 8, children: [
          for (final x in d.daily)
            ChoiceChip(
              key: Key('day-${x.date}'),
              label: Text('${weekdayShort(x.date)} · ${ordersWord(x.orders)}'),
              selected: x.date == day,
              onSelected: (_) => setState(() => _day = x.date),
            ),
        ]),
      ]),
    );

    final hourly = InsightCard(
      title: 'Hour by hour · ${dayWords(day)}',
      subtitle: 'The line is the forecast; the shaded band is the range it usually lands in.',
      child: _HourLines(hours: hours),
    );

    final left = <Widget>[
      if (d.insufficientHistory)
        InsightBanner(
          key: const Key('insufficient-banner'),
          text: d.weeksOfHistory <= 0
              ? 'There is no order history yet, so these numbers are a rough estimate.'
              : 'Only ${d.weeksOfHistory} ${d.weeksOfHistory == 1 ? 'week' : 'weeks'} of orders so far. Treat these numbers as a rough estimate.',
        ),
      _Headline(d: d),
      week,
    ];
    final right = <Widget>[hourly, _ErrorCard(backtest: d.backtest)];
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
      children: [
        if (d.generatedAt != null)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Text('Made ${placedAt(d.generatedAt)}', style: TextStyle(fontSize: 12.5, color: c.muted)),
          ),
        if (wide)
          Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Expanded(child: Column(children: left)),
            const SizedBox(width: 16),
            Expanded(child: Column(children: right)),
          ])
        else ...[...left, ...right],
      ],
    );
  }
}

/// The trend chip and the busiest hour.
class _Headline extends StatelessWidget {
  const _Headline({required this.d});
  final DemandForecast d;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final pct = d.trend.changePct;
    final steady = pct == 0 || d.trend.prior4Weeks == 0;
    final peak = d.peak;
    final peakAt = peak?.hourStart == null ? null : istOf(peak!.hourStart!);
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Wrap(spacing: 8, runSpacing: 8, children: [
        if (d.trend.prior4Weeks > 0)
          Container(
            key: const Key('trend-chip'),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(color: pct >= 0 ? c.greenSoft : c.dealSoft, borderRadius: BorderRadius.circular(999)),
            child: Text(
              steady ? 'Steady vs the previous 4 weeks' : '${signedPercent(pct)} vs the previous 4 weeks',
              style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: pct >= 0 ? c.green : c.deal),
            ),
          ),
        if (peak != null && peakAt != null)
          Container(
            key: const Key('peak'),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(color: c.accentSoft, borderRadius: BorderRadius.circular(999)),
            child: Text(
              'Busiest hour: ${weekdayShort(istDay(peak.hourStart!))} ${hourWord(peakAt.hour)} · about ${ordersWord(peak.orders)} orders',
              style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: c.accentInk),
            ),
          ),
      ]),
    );
  }
}

class _WeekBars extends StatelessWidget {
  const _WeekBars({required this.days, required this.selected, required this.onPick});
  final List<ForecastDay> days;
  final String selected;
  final ValueChanged<String> onPick;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final maxY = days.fold<double>(0, (m, d) => d.orders > m ? d.orders : m);
    return SizedBox(
      height: 170,
      child: BarChart(BarChartData(
        maxY: maxY == 0 ? 1 : maxY * 1.18,
        gridData: FlGridData(drawVerticalLine: false, getDrawingHorizontalLine: (_) => FlLine(color: c.line, strokeWidth: 1)),
        borderData: FlBorderData(show: false),
        titlesData: FlTitlesData(
          topTitles: const AxisTitles(),
          rightTitles: const AxisTitles(),
          leftTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              reservedSize: 32,
              getTitlesWidget: (v, meta) => v == meta.max || v != v.roundToDouble()
                  ? const SizedBox.shrink()
                  : Text(count(v), style: TextStyle(fontSize: 10, color: c.muted)),
            ),
          ),
          bottomTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              getTitlesWidget: (v, _) {
                final i = v.round();
                if (i < 0 || i >= days.length) return const SizedBox.shrink();
                return Padding(
                  padding: const EdgeInsets.only(top: 6),
                  child: Text(weekdayShort(days[i].date), style: TextStyle(fontSize: 10.5, color: c.muted)),
                );
              },
            ),
          ),
        ),
        barTouchData: BarTouchData(
          touchCallback: (event, response) {
            final i = response?.spot?.touchedBarGroupIndex;
            if (event is FlTapUpEvent && i != null && i >= 0 && i < days.length) onPick(days[i].date);
          },
        ),
        barGroups: [
          for (var i = 0; i < days.length; i++)
            BarChartGroupData(x: i, barRods: [
              BarChartRodData(
                toY: days[i].orders,
                width: 22,
                color: days[i].date == selected ? c.accent : c.accent.withValues(alpha: 0.35),
                borderRadius: const BorderRadius.vertical(top: Radius.circular(5)),
              ),
            ]),
        ],
      )),
    );
  }
}

/// The 24 hours of one day: the forecast, with its low and high edges.
class _HourLines extends StatelessWidget {
  const _HourLines({required this.hours});
  final List<ForecastHour> hours;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    List<FlSpot> spots(double Function(ForecastHour) y) {
      final byHour = {for (final h in hours) h.hour: h};
      return [for (var h = 0; h < 24; h++) FlSpot(h.toDouble(), byHour[h] == null ? 0 : y(byHour[h]!))];
    }

    final high = spots((h) => h.high);
    final maxY = high.fold<double>(0, (m, s) => s.y > m ? s.y : m);
    LineChartBarData edge(List<FlSpot> s) => LineChartBarData(
          spots: s,
          color: c.accent.withValues(alpha: 0.35),
          barWidth: 1,
          dotData: const FlDotData(show: false),
        );
    return SizedBox(
      height: 190,
      child: LineChart(LineChartData(
        minY: 0,
        minX: 0,
        maxX: 23,
        maxY: maxY == 0 ? 1 : maxY * 1.15,
        gridData: FlGridData(drawVerticalLine: false, getDrawingHorizontalLine: (_) => FlLine(color: c.line, strokeWidth: 1)),
        borderData: FlBorderData(show: false),
        titlesData: FlTitlesData(
          topTitles: const AxisTitles(),
          rightTitles: const AxisTitles(),
          leftTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              reservedSize: 30,
              getTitlesWidget: (v, meta) => v == meta.max || v != v.roundToDouble()
                  ? const SizedBox.shrink()
                  : Text(count(v), style: TextStyle(fontSize: 10, color: c.muted)),
            ),
          ),
          bottomTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              interval: 1,
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
        lineTouchData: LineTouchData(
          touchTooltipData: LineTouchTooltipData(
            getTooltipItems: (touched) => [
              for (final t in touched)
                if (t.barIndex == 2)
                  LineTooltipItem('${hourWord(t.x.round())}\n${ordersWord(t.y)} orders',
                      TextStyle(color: c.onAccent, fontSize: 12, fontWeight: FontWeight.w600))
                else
                  null,
            ],
          ),
        ),
        // Low edge, high edge, then the forecast on top of the band.
        lineBarsData: [
          edge(spots((h) => h.low)),
          edge(high),
          LineChartBarData(
            spots: spots((h) => h.orders),
            color: c.accent,
            barWidth: 2.5,
            isCurved: false,
            dotData: const FlDotData(show: false),
          ),
        ],
        betweenBarsData: [BetweenBarsData(fromIndex: 0, toIndex: 1, color: c.accent.withValues(alpha: 0.14))],
      )),
    );
  }
}

/// How wrong the method was on the last 14 days: two honest numbers, or
/// "Not enough history yet" — never a made-up zero.
class _ErrorCard extends StatelessWidget {
  const _ErrorCard({required this.backtest});
  final Backtest backtest;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final none = backtest.wape == null && backtest.mape == null;
    Widget row(String label, double? v, String note) => Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(label, style: TextStyle(fontWeight: FontWeight.w700, color: c.ink)),
                Text(note, style: TextStyle(fontSize: 12, color: c.muted)),
              ]),
            ),
            Text(v == null ? '—' : percentWord(v), style: dataStyle(context, size: 18, weight: FontWeight.w800)),
          ]),
        );
    return InsightCard(
      key: const Key('error-card'),
      title: 'Typical error',
      subtitle: 'The same method, run for each recent day, against what really happened.',
      child: none
          ? Text('Not enough history yet', style: TextStyle(color: c.muted, fontSize: 14))
          : Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              row('Overall miss', backtest.wape, 'Total orders missed, as a share of total orders'),
              row('Average hourly miss', backtest.mape, 'The usual miss in a single hour'),
              Text('Compared over ${backtest.hoursCompared} hours in the last ${backtest.days} days.',
                  style: TextStyle(fontSize: 12, color: c.muted)),
              if (backtest.byDay.isNotEmpty)
                ExpansionTile(
                  tilePadding: EdgeInsets.zero,
                  title: Text('Forecast and actual, day by day', style: TextStyle(fontSize: 13.5, color: c.ink)),
                  children: [
                    for (final d in backtest.byDay)
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 3),
                        child: Row(children: [
                          Expanded(child: Text(dayWords(d.date), style: TextStyle(fontSize: 13, color: c.ink))),
                          Text('forecast ${ordersWord(d.forecast)}', style: TextStyle(fontSize: 12.5, color: c.muted)),
                          const SizedBox(width: 12),
                          Text('actual ${ordersWord(d.actual)}', style: TextStyle(fontSize: 12.5, color: c.ink)),
                        ]),
                      ),
                  ],
                ),
            ]),
    );
  }
}
