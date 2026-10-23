import 'dart:io';

import 'package:deligro_manager/core/api.dart';
import 'package:deligro_manager/features/insights/demand_screen.dart';
import 'package:deligro_manager/features/insights/insights_hub_screen.dart';
import 'package:deligro_manager/features/insights/riders_needed_screen.dart';
import 'package:deligro_manager/models/insights.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'fakes/fake_insights_repository.dart';
import 'insights_helpers.dart';

void main() {
  group('the Insights hub', () {
    testWidgets('shows the five core tiles to an insights reader, and hides the gated ones', (tester) async {
      await pumpInsights(tester, const InsightsHubScreen());
      for (final k in ['demand', 'riders', 'zones', 'vendors', 'sla', 'dispatch']) {
        expect(find.byKey(Key('insight-$k')), findsOneWidget, reason: k);
      }
      expect(find.byKey(const Key('insight-fraud')), findsNothing);
      expect(find.byKey(const Key('insight-reports')), findsNothing);
      expect(find.byKey(const Key('insight-accounting')), findsNothing);
    });

    testWidgets('Fraud needs customers.view as well, Accounting needs export and finance', (tester) async {
      await pumpInsights(tester, const InsightsHubScreen(), permissions: {...insightsViewer, 'manager.customers.view'});
      expect(find.byKey(const Key('insight-fraud')), findsOneWidget);
      expect(find.byKey(const Key('insight-accounting')), findsNothing);

      await pumpInsights(tester, const InsightsHubScreen(), permissions: {...insightsViewer, 'manager.accounting.export'});
      expect(find.byKey(const Key('insight-accounting')), findsNothing, reason: 'export alone is not enough');

      await pumpInsights(tester, const InsightsHubScreen(),
          permissions: {...insightsViewer, 'manager.accounting.export', 'manager.finance.view'});
      expect(find.byKey(const Key('insight-accounting')), findsOneWidget);

      await pumpInsights(tester, const InsightsHubScreen(), permissions: {...insightsViewer, 'manager.reports.view'});
      expect(find.byKey(const Key('insight-reports')), findsOneWidget);
    });

    testWidgets('an admin sees every tile', (tester) async {
      await pumpInsights(tester, const InsightsHubScreen(), permissions: insightsEverything, role: 'admin', size: const Size(390, 1400));
      for (final k in ['demand', 'riders', 'zones', 'vendors', 'sla', 'dispatch', 'fraud', 'reports', 'accounting']) {
        expect(find.byKey(Key('insight-$k')), findsOneWidget, reason: k);
      }
    });
  });

  group('demand forecast', () {
    testWidgets('draws 7 bars for the week and a band around the chosen day', (tester) async {
      await pumpInsights(tester, const DemandScreen(), size: const Size(390, 1800));
      await settleInsights(tester);
      final bars = tester.widget<BarChart>(find.byType(BarChart));
      expect(bars.data.barGroups, hasLength(7));

      final line = tester.widget<LineChart>(find.byType(LineChart));
      // The forecast with the low and high edges of its band: three lines of 24 hours.
      expect(line.data.lineBarsData, hasLength(3));
      expect(line.data.lineBarsData.every((l) => l.spots.length == 24), isTrue);
      expect(line.data.betweenBarsData, isNotEmpty);
    });

    testWidgets('names the busiest hour and the trend in words', (tester) async {
      await pumpInsights(tester, const DemandScreen(), size: const Size(390, 1800));
      await settleInsights(tester);
      expect(find.byKey(const Key('peak')), findsOneWidget);
      expect(find.textContaining('Busiest hour'), findsOneWidget);
      expect(find.text('+8% vs the previous 4 weeks'), findsOneWidget);
    });

    testWidgets('states the typical error honestly, with how much it was compared over', (tester) async {
      await pumpInsights(tester, const DemandScreen(), size: const Size(390, 1800));
      await settleInsights(tester);
      expect(find.byKey(const Key('error-card')), findsOneWidget);
      expect(find.textContaining('22%'), findsOneWidget);
      expect(find.textContaining('31%'), findsOneWidget);
      expect(find.textContaining('196 hours'), findsOneWidget);
      expect(find.textContaining('last 14 days'), findsOneWidget);
      expect(find.byKey(const Key('insufficient-banner')), findsNothing);
    });

    testWidgets('too little history: a banner, a "Rough estimate" label, and "Not enough history yet"', (tester) async {
      await pumpInsights(tester, const DemandScreen(), repo: FakeInsightsRepository(demandFixture: 'demand_thin'), size: const Size(390, 1800));
      await settleInsights(tester);
      expect(find.byKey(const Key('insufficient-banner')), findsOneWidget);
      expect(find.byKey(const Key('rough-label')), findsOneWidget);
      expect(find.text('Rough estimate'), findsOneWidget);
      expect(find.text('Not enough history yet'), findsOneWidget);
      // Never a made-up zero.
      expect(find.text('0%'), findsNothing);
    });

    testWidgets('picking another day redraws the hours', (tester) async {
      await pumpInsights(tester, const DemandScreen(), size: const Size(390, 1800));
      await settleInsights(tester);
      final fx = FakeInsightsRepository().demandValue;
      final second = fx.daily[1].date;
      final before = tester.widget<LineChart>(find.byType(LineChart)).data.lineBarsData.first.spots.map((s) => s.y).toList();
      await tester.tap(find.byKey(Key('day-$second')));
      await settleInsights(tester);
      final after = tester.widget<LineChart>(find.byType(LineChart)).data.lineBarsData.first.spots.map((s) => s.y).toList();
      expect(after, hasLength(24));
      // Friday (day 1) and Saturday (day 2) differ in the fixture (weekend uplift).
      expect(after, isNot(equals(before)));
    });

    testWidgets('asks for the chosen area', (tester) async {
      final repo = FakeInsightsRepository();
      await pumpInsights(tester, const DemandScreen(), repo: repo);
      await settleInsights(tester);
      expect(repo.demandCalls.last, isNull);
      chooseCity(tester);
      await settleInsights(tester);
      expect(repo.demandCalls.last, 'city:c1');
    });

    testWidgets('a failed load says so and Retry loads again', (tester) async {
      final repo = FakeInsightsRepository()..nextError = ApiException(500, 'load_failed');
      await pumpInsights(tester, const DemandScreen(), repo: repo);
      await settleInsights(tester);
      expect(find.text('Retry'), findsOneWidget);
      await tester.tap(find.text('Retry'));
      await settleInsights(tester);
      expect(find.text('Retry'), findsNothing);
      expect(find.byType(BarChart), findsOneWidget);
    });
  });

  group('riders needed', () {
    testWidgets('highlights exactly the short hours of the chosen day', (tester) async {
      final repo = FakeInsightsRepository();
      await pumpInsights(tester, const RidersNeededScreen(), repo: repo, size: const Size(390, 1800));
      await settleInsights(tester);

      // The screen opens on the first day with a shortage.
      final day = repo.ridersValue.daily.firstWhere((d) => d.shortHours > 0);
      final shortHours = repo.ridersValue.hours.where((h) => h.gap > 0 && _istDate(h.hourStart!) == day.date).length;
      expect(shortHours, day.shortHours);
      expect(find.byKey(const Key('short-hours')), findsOneWidget);
      expect(find.byWidgetPredicate((w) => w.key is ValueKey && (w.key! as ValueKey).value.toString().startsWith('short-hour-')), findsNWidgets(shortHours));
    });

    testWidgets('each productivity source is explained in words', (tester) async {
      await pumpInsights(tester, const RidersNeededScreen(), repo: FakeInsightsRepository(), size: const Size(390, 1800));
      await settleInsights(tester);
      expect(find.text('Based on 2.4 deliveries per rider-hour in this zone.'), findsOneWidget);

      final platform = FakeInsightsRepository();
      final r = platform.ridersValue;
      platform.ridersValue = RidersNeeded(
        generatedAt: r.generatedAt,
        area: r.area,
        productivity: const Productivity(deliveriesPerRiderHour: 2.1, sampleHours: 5, source: ProductivitySource.platform),
        hours: r.hours,
        daily: r.daily,
        shortHours: r.shortHours,
      );
      await pumpInsights(tester, const RidersNeededScreen(), repo: platform, size: const Size(390, 1800));
      await settleInsights(tester);
      expect(find.textContaining('platform average of 2.1 deliveries per rider-hour'), findsOneWidget);

      await pumpInsights(tester, const RidersNeededScreen(), repo: FakeInsightsRepository(ridersFixture: 'riders_default'), size: const Size(390, 1800));
      await settleInsights(tester);
      expect(find.text('Based on a default of 2.0 deliveries per rider-hour until there is enough history.'), findsOneWidget);
    });

    testWidgets('a day strip shows peak needed against usually online', (tester) async {
      final repo = FakeInsightsRepository();
      await pumpInsights(tester, const RidersNeededScreen(), repo: repo, size: const Size(390, 1800));
      await settleInsights(tester);
      for (final d in repo.ridersValue.daily) {
        expect(find.byKey(Key('rday-${d.date}')), findsOneWidget, reason: d.date);
      }
      final first = repo.ridersValue.daily.first;
      expect(find.descendant(of: find.byKey(Key('rday-${first.date}')), matching: find.textContaining('${first.peakNeeded}')), findsWidgets);
    });

    testWidgets('a week with no short hours says so', (tester) async {
      final repo = FakeInsightsRepository();
      final r = repo.ridersValue;
      repo.ridersValue = RidersNeeded(
        generatedAt: r.generatedAt,
        area: r.area,
        productivity: r.productivity,
        hours: [for (final h in r.hours) RiderHour(hourStart: h.hourStart, forecastOrders: h.forecastOrders, ridersNeeded: h.ridersNeeded, ridersUsuallyOnline: h.ridersNeeded.toDouble(), gap: 0)],
        daily: [for (final d in r.daily) RiderDay(date: d.date, peakNeeded: d.peakNeeded, peakUsual: d.peakNeeded.toDouble(), shortHours: 0)],
        shortHours: 0,
      );
      await pumpInsights(tester, const RidersNeededScreen(), repo: repo, size: const Size(390, 1800));
      await settleInsights(tester);
      expect(find.text('No short hours this week.'), findsOneWidget);
      expect(find.byKey(const Key('short-hours')), findsNothing);
    });

    testWidgets('asks for the chosen area', (tester) async {
      final repo = FakeInsightsRepository();
      await pumpInsights(tester, const RidersNeededScreen(), repo: repo);
      await settleInsights(tester);
      chooseCity(tester);
      await settleInsights(tester);
      expect(repo.ridersCalls.last, 'city:c1');
    });
  });

  test('the Insights screens are English only', () {
    final devanagari = RegExp(r'[\u0900-\u097F]');
    for (final f in Directory('lib/features/insights').listSync(recursive: true).whereType<File>()) {
      final s = f.readAsStringSync();
      expect(devanagari.hasMatch(s), isFalse, reason: f.path);
      expect(s.contains('tr('), isFalse, reason: '${f.path} uses tr(');
    }
  });
}

/// The IST calendar day of an instant.
String _istDate(DateTime at) {
  final d = at.toUtc().add(const Duration(hours: 5, minutes: 30));
  return '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';
}
