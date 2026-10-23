import 'package:deligro_manager/models/insights.dart';
import 'package:flutter_test/flutter_test.dart';

import 'fixtures/fixtures.dart';

Map<String, dynamic> ins(String name) => apiFixture('insights/$name');

void main() {
  group('demand', () {
    test('parses 168 hours, 7 days, the peak and the backtest', () {
      final d = DemandForecast.fromJson(ins('demand'));
      expect(d.forecast, hasLength(168));
      expect(d.daily, hasLength(7));
      expect(d.insufficientHistory, isFalse);
      expect(d.weeksOfHistory, 8);
      expect(d.trend.factor, 1.08);
      expect(d.trend.changePct, 8);
      expect(d.peak!.orders, greaterThan(0));
      expect(d.backtest.mape, 0.31);
      expect(d.backtest.wape, 0.22);
      expect(d.backtest.hoursCompared, 196);
      expect(d.backtest.byDay, hasLength(14));
      expect(d.forecast.first.weekday, inInclusiveRange(1, 7));
      expect(d.forecast.first.low, lessThanOrEqualTo(d.forecast.first.orders));
      expect(d.area.name, 'All my zones');
    });

    test('null mape and wape stay null (never zero)', () {
      final d = DemandForecast.fromJson(ins('demand_thin'));
      expect(d.insufficientHistory, isTrue);
      expect(d.backtest.mape, isNull);
      expect(d.backtest.wape, isNull);
      expect(d.backtest.hoursCompared, 0);
      expect(d.trend.changePct, 0);
    });

    test('a day groups its 24 hours', () {
      final d = DemandForecast.fromJson(ins('demand'));
      final day = d.daily.first.date;
      expect(d.hoursOn(day), hasLength(24));
    });
  });

  group('riders needed', () {
    test('parses hours, days, productivity and the short-hour count', () {
      final r = RidersNeeded.fromJson(ins('riders'));
      expect(r.hours, hasLength(168));
      expect(r.daily, hasLength(7));
      expect(r.productivity.source, ProductivitySource.zone);
      expect(r.productivity.deliveriesPerRiderHour, 2.4);
      expect(r.shortHours, r.hours.where((h) => h.gap > 0).length);
    });

    test('the default source parses', () {
      expect(RidersNeeded.fromJson(ins('riders_default')).productivity.source, ProductivitySource.fallback);
    });
  });

  group('zone map', () {
    final z = ZoneMap.fromJson(ins('zones'));
    test('zones, cities, cells and every suggestion type parse', () {
      expect(z.zones, hasLength(2));
      expect(z.cities.single.name, 'Bemetara');
      expect(z.cells, hasLength(6));
      expect(z.cells.first.bounds.north, greaterThan(z.cells.first.bounds.south));
      expect(z.cells.where((c) => !c.insideZone), hasLength(2));
      expect(z.suggestions.map((s) => s.type).toSet(), SuggestionType.values.where((t) => t != SuggestionType.unknown).toSet());
      expect(z.suggestions.where((s) => s.center != null), hasLength(3));
      expect(z.minCellDrops, 3);
    });
  });

  group('vendor benchmarks', () {
    final b = VendorBenchmarks.fromJson(ins('vendors'));
    test('six metrics, verdicts and nulls', () {
      expect(b.metrics, hasLength(6));
      expect(b.metrics.first.better, BetterWhen.lower);
      final small = b.vendors.last;
      expect(small.values['prepMinutes'], isNull);
      expect(small.verdictOf('prepMinutes'), Verdict.notEnoughData);
      final spice = b.vendors.first;
      expect(spice.verdictOf('prepMinutes'), Verdict.worse);
      expect(spice.verdictOf('acceptMinutes'), Verdict.better);
      expect(spice.verdictOf('repeatRate'), Verdict.inLine);
      expect(spice.deltaPct['prepMinutes'], 22.2);
      expect(b.vendors[1].values['rating'], isNull);
      expect(b.zones.single.medians['prepMinutes'], 18);
      expect(b.total, 3);
    });
  });

  group('sla', () {
    final s = SlaReport.fromJson(ins('sla'));
    test('targets keep inherited and overridden apart', () {
      expect(s.targets, hasLength(3));
      expect(s.targets[1].inherited, isTrue);
      expect(s.targets[2].inherited, isFalse);
      expect(s.targets[2].updatedBy!.name, 'Asha Verma');
      expect(s.targets[0].zoneId, isNull);
    });
    test('stages, tables and the daily line parse', () {
      expect(s.overall.stage(SlaStage.deliver).breaches, 141);
      expect(s.overall.stage(SlaStage.accept).rate, closeTo(0.075, 0.001));
      expect(s.byVendor.first.accept!.orders, 230);
      expect(s.byRider.last.code, isNull);
      expect(s.daily, hasLength(7));
      expect(s.daily.first.rate(SlaStage.prep), 0.09);
    });
  });

  group('dispatch', () {
    final d = DispatchOverview.fromJson(ins('dispatch'));
    test('both modes parse with their counts', () {
      expect(d.zones.first.mode, DispatchMode.offer);
      expect(d.zones.last.mode, DispatchMode.autoAssign);
      expect(d.zones.last.autoAssignMaxLoad, 1);
      expect(d.zones.last.last24h.fellBackToOffer, 5);
      expect(d.canConfigure, isTrue);
    });
  });

  group('fraud', () {
    final f = FraudPage.fromJson(ins('fraud'));
    test('cases, counts, evidence and a dismissal parse', () {
      expect(f.items, hasLength(3));
      expect(f.counts.open, 2);
      expect(f.counts.dismissed, 1);
      expect(f.counts.resolved, 7);
      expect(f.items[0].rule, FraudRule.customerCancellations);
      expect(f.items[1].severity, FraudSeverity.critical);
      expect(f.items[2].status, FraudStatus.dismissed);
      expect(f.items[2].dismissal!.reason, contains('slip'));
      expect(f.items[2].subject.type, FraudSubjectType.rider);
      expect(f.items[0].measure.unit, MeasureUnit.count);
      expect(f.items[2].measure.unit, MeasureUnit.rupees);
      expect(f.items[0].evidence, hasLength(2));
    });
    test('evidence text carries no phone number', () {
      final phone = RegExp(r'(\+?91)?[6-9]\d{9}');
      for (final c in f.items) {
        for (final e in c.evidence) {
          expect(phone.hasMatch(e.text), isFalse, reason: e.text);
        }
      }
    });
    test('rules: inherited and own, units and the master switch', () {
      final r = FraudRulesView.fromJson(ins('fraud_rules'));
      expect(r.enabled, isTrue);
      expect(r.rules, hasLength(5));
      expect(r.rules[0].inherited, isTrue);
      expect(r.rules[3].inherited, isFalse);
      expect(r.rules[4].enabled, isFalse);
      expect(r.rules[2].unit, MeasureUnit.ratio);
      expect(r.rules[4].unit, MeasureUnit.multiple);
    });
  });

  group('scheduled reports', () {
    test('schedules, kinds and ineligible recipients', () {
      final s = ScheduleList.fromJson(ins('schedules'));
      expect(s.items, hasLength(2));
      expect(s.kinds, hasLength(3));
      expect(s.items.first.recipients.last.eligible, isFalse);
      expect(s.items.first.frequency, ScheduleFrequency.daily);
      expect(s.items.first.weekday, isNull);
      expect(s.items.last.frequency, ScheduleFrequency.weekly);
      expect(s.items.last.weekday, 1);
      expect(s.items.last.active, isFalse);
      expect(s.items.last.lastRun, isNull);
      expect(s.items.first.lastRun!.status, RunStatus.partial);
      expect(s.items.first.rangePreset, RangePreset.yesterday);
    });
    test('runs in every status, skipped recipients, and one run', () {
      final r = RunPage.fromJson(ins('runs'));
      expect(r.items.map((x) => x.status), [RunStatus.partial, RunStatus.sent, RunStatus.tooLarge]);
      expect(r.items.first.recipientsSkipped.single.reason, 'permission');
      final one = ReportRun.fromJson((ins('run'))['run'] as Map<String, dynamic>);
      expect(one.scheduleName, 'Daily sales');
      expect(one.kind, 'sales');
    });
    test('a download link', () {
      final d = RunDownload.fromJson(ins('download'));
      expect(d.url, startsWith('https://'));
      expect(d.expiresAt, isNotNull);
    });
  });

  group('accounting', () {
    final a = AccountingSummary.fromJson(ins('accounting'));
    test('vouchers balance and reconciliation shows the mismatch', () {
      expect(a.vouchers, hasLength(4));
      expect(a.vouchers.every((v) => v.debit == v.credit), isTrue);
      expect(a.totals.debit, a.totals.credit);
      expect(a.vouchers.first.type, VoucherType.sales);
      expect(a.vouchers[2].reference, 'UTR123456789');
      expect(a.reconciliation.where((r) => !r.match), hasLength(1));
      expect(a.reconciliation.last.difference, 500);
      expect(a.company, 'Deligro');
    });
  });

  test('every fixture avoids Devanagari', () {
    final devanagari = RegExp(r'[ऀ-ॿ]');
    for (final n in ['demand', 'riders', 'zones', 'vendors', 'sla', 'dispatch', 'fraud', 'fraud_rules', 'schedules', 'runs', 'accounting']) {
      expect(devanagari.hasMatch(ins(n).toString()), isFalse, reason: n);
    }
  });
}
