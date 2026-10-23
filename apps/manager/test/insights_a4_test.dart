import 'package:deligro_manager/core/api.dart';
import 'package:deligro_manager/core/push.dart';
import 'package:deligro_manager/features/alerts/alert_labels.dart';
import 'package:deligro_manager/features/insights/dispatch_screen.dart';
import 'package:deligro_manager/features/insights/fraud_case_screen.dart';
import 'package:deligro_manager/features/insights/fraud_rules_screen.dart';
import 'package:deligro_manager/features/insights/fraud_screen.dart';
import 'package:deligro_manager/models/alerts.dart';
import 'package:deligro_manager/models/insights.dart';
import 'package:deligro_manager/models/outcome.dart';
import 'package:deligro_manager/state/area.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'fakes/fake_insights_repository.dart';
import 'insights_helpers.dart';

const _openCase = 'f0000001-0000-4000-8000-000000000000';
const _criticalCase = 'f0000002-0000-4000-8000-000000000000';
const _dismissedCase = 'f0000003-0000-4000-8000-000000000000';
const _z1 = '11111111-1111-4111-8111-111111111111';
const _z2 = '22222222-2222-4222-8222-222222222222';

const _fraudReader = {...insightsViewer, 'manager.customers.view'};

void main() {
  group('fraud cases', () {
    testWidgets('tabs carry their counts and show only that status', (tester) async {
      final repo = FakeInsightsRepository();
      await pumpInsights(tester, const FraudScreen(), repo: repo, permissions: _fraudReader, size: const Size(390, 1600));
      await settleInsights(tester);
      expect(find.text('Open 2'), findsOneWidget);
      expect(find.text('Dismissed 1'), findsOneWidget);
      expect(find.text('Resolved 7'), findsOneWidget);
      expect(find.byKey(const Key('fraud-case-$_openCase')), findsOneWidget);
      expect(find.byKey(const Key('fraud-case-$_criticalCase')), findsOneWidget);
      expect(find.byKey(const Key('fraud-case-$_dismissedCase')), findsNothing);

      await tester.tap(find.byKey(const Key('fraud-tab-dismissed')));
      await settleInsights(tester);
      expect(repo.fraudCalls.last.$1, FraudStatus.dismissed);
      expect(find.byKey(const Key('fraud-case-$_dismissedCase')), findsOneWidget);
      expect(find.byKey(const Key('fraud-case-$_openCase')), findsNothing);
    });

    testWidgets('a case card says what happened, against the limit, in words', (tester) async {
      await pumpInsights(tester, const FraudScreen(), permissions: _fraudReader, size: const Size(390, 1600));
      await settleInsights(tester);
      expect(find.text('Customer cancellations'), findsOneWidget);
      expect(find.text('Customer 3f2a9c10 · Ravi K.'), findsOneWidget);
      expect(find.text('4 in 7 days (limit 3)'), findsOneWidget);
      expect(find.text('62% in 30 days (limit 30%)'), findsOneWidget);
      expect(find.text('Critical'), findsOneWidget);
      expect(find.text('Warning'), findsOneWidget);
    });

    test('every unit has its sentence', () {
      FraudMeasure m(double v, double t, MeasureUnit u, int d) => FraudMeasure(value: v, threshold: t, unit: u, windowDays: d);
      expect(measureWords(m(4, 3, MeasureUnit.count, 7)), '4 in 7 days (limit 3)');
      expect(measureWords(m(1, 1, MeasureUnit.count, 1)), '1 in 1 day (limit 1)');
      expect(measureWords(m(0.62, 0.3, MeasureUnit.ratio, 30)), '62% in 30 days (limit 30%)');
      expect(measureWords(m(3400, 2000, MeasureUnit.rupees, 2)), '₹3,400 over 2 days (limit ₹2,000)');
      expect(measureWords(m(3.4, 3, MeasureUnit.multiple, 30)), '3.4× the usual in 30 days (limit 3×)');
    });

    testWidgets('no cases says so', (tester) async {
      final repo = FakeInsightsRepository();
      repo.fraudValue = FraudPage(items: const [], nextCursor: null, counts: const FraudCounts(open: 0, dismissed: 0, resolved: 0));
      await pumpInsights(tester, const FraudScreen(), repo: repo, permissions: _fraudReader);
      await settleInsights(tester);
      expect(find.textContaining('No open cases'), findsOneWidget);
    });

    testWidgets('asks for the chosen area', (tester) async {
      final repo = FakeInsightsRepository();
      await pumpInsights(tester, const FraudScreen(), repo: repo, permissions: _fraudReader);
      await settleInsights(tester);
      chooseCity(tester);
      await settleInsights(tester);
      expect(repo.fraudCalls.last.$3, 'city:c1');
    });
  });

  group('one fraud case', () {
    testWidgets('shows the subject, the measure and the evidence — and no phone number', (tester) async {
      await pumpInsights(tester, const FraudCaseScreen(alertId: _openCase), permissions: _fraudReader, size: const Size(390, 1600));
      await settleInsights(tester);
      expect(find.text('Customer cancellations'), findsOneWidget);
      expect(find.text('Customer 3f2a9c10 · Ravi K.'), findsOneWidget);
      expect(find.text('4 in 7 days (limit 3)'), findsOneWidget);
      expect(find.text('Cancelled by customer · ₹420'), findsOneWidget);
      expect(find.text('Cancelled by customer · ₹310'), findsOneWidget);
      final phone = RegExp(r'(\+?91)?[6-9]\d{9}');
      for (final t in tester.widgetList<Text>(find.byType(Text))) {
        expect(phone.hasMatch(t.data ?? ''), isFalse, reason: t.data);
      }
    });

    testWidgets('a case reached from a link is found whichever tab it is on', (tester) async {
      await pumpInsights(tester, const FraudCaseScreen(alertId: _dismissedCase), permissions: _fraudReader, size: const Size(390, 1600));
      await settleInsights(tester);
      expect(find.textContaining('Deposit slip found, entered late'), findsOneWidget);
      expect(find.byKey(const Key('dismiss-case')), findsNothing, reason: 'already dismissed');
    });

    testWidgets('a case that does not exist says so', (tester) async {
      await pumpInsights(tester, const FraudCaseScreen(alertId: 'nope-nope'), permissions: _fraudReader);
      await settleInsights(tester);
      expect(find.textContaining("isn't in your areas"), findsOneWidget);
    });

    Future<FakeInsightsRepository> openDismiss(WidgetTester tester, {FakeInsightsRepository? repo}) async {
      final r = repo ?? FakeInsightsRepository();
      await pumpInsights(tester, const FraudCaseScreen(alertId: _openCase), repo: r, permissions: _fraudReader, size: const Size(390, 1600));
      await settleInsights(tester);
      await tester.tap(find.byKey(const Key('dismiss-case')));
      await settleInsights(tester);
      return r;
    }

    testWidgets('dismissing needs a reason, and sends the days chosen', (tester) async {
      final repo = await openDismiss(tester);
      await tester.enterText(find.byKey(const Key('dismiss-reason')), 'ab');
      await tester.tap(find.byKey(const Key('dismiss-save')));
      await settleInsights(tester);
      expect(find.text('Say why, in at least 3 characters'), findsOneWidget);
      expect(repo.dismissals, isEmpty);

      await tester.enterText(find.byKey(const Key('dismiss-reason')), 'Known family order');
      await tester.tap(find.byKey(const Key('dismiss-days-90')));
      await tester.tap(find.byKey(const Key('dismiss-save')));
      await settleInsights(tester);
      expect(repo.dismissals, hasLength(1));
      expect(repo.dismissals.single.reason, 'Known family order');
      expect(repo.dismissals.single.days, 90);
      expect(repo.dismissals.single.alertId, _openCase);
    });

    testWidgets('thirty days is the default', (tester) async {
      final repo = await openDismiss(tester);
      await tester.enterText(find.byKey(const Key('dismiss-reason')), 'Known family order');
      await tester.tap(find.byKey(const Key('dismiss-save')));
      await settleInsights(tester);
      expect(repo.dismissals.single.days, 30);
    });

    testWidgets('a dropped connection retries as the same action', (tester) async {
      final repo = await openDismiss(tester);
      repo.nextError = ApiException(0, 'network');
      await tester.enterText(find.byKey(const Key('dismiss-reason')), 'Known family order');
      await tester.tap(find.byKey(const Key('dismiss-save')));
      await settleInsights(tester);
      expect(find.text('No connection. Check your internet and try again.'), findsOneWidget);
      await tester.tap(find.byKey(const Key('dismiss-save')));
      await settleInsights(tester);
      expect(repo.dismissals, hasLength(2));
      expect(repo.dismissals[0].clientActionId, repo.dismissals[1].clientActionId);
    });

    testWidgets('a case someone already closed is explained', (tester) async {
      final repo = await openDismiss(tester);
      repo.nextOutcome = const Refused<FraudCase>('already_resolved');
      await tester.enterText(find.byKey(const Key('dismiss-reason')), 'Known family order');
      await tester.tap(find.byKey(const Key('dismiss-save')));
      await settleInsights(tester);
      expect(find.text('That case has already been closed.'), findsOneWidget);
    });
  });

  group('alert links', () {
    Alert alert(AlertKind kind, {String? zoneId, String id = 'a1b2c3d4-0000-4000-8000-000000000000'}) =>
        Alert(id: id, kind: kind, severity: AlertSeverity.warning, status: AlertStatus.open, title: 't', zoneId: zoneId, entityType: 'zone', entityId: zoneId ?? '');

    test('a fraud alert opens its case; an SLA alert opens service levels for its zone', () {
      expect(alertTarget(alert(AlertKind.fraudSuspected)), '/more/insights/fraud/a1b2c3d4-0000-4000-8000-000000000000');
      expect(alertTarget(alert(AlertKind.slaBreach, zoneId: _z1)), '/more/insights/sla?zone=$_z1');
      expect(alertTarget(alert(AlertKind.slaBreach)), '/more/insights/sla');
      // Everything else is untouched.
      expect(alertTarget(alert(AlertKind.orderUnassigned)), startsWith('/alerts'));
    });

    test('pushes for the same two kinds go to the same screens', () {
      expect(inAppPathFrom(null, {'kind': 'fraud_suspected', 'alertId': 'a1b2c3d4-0000-4000-8000-000000000000'}),
          '/more/insights/fraud/a1b2c3d4-0000-4000-8000-000000000000');
      expect(inAppPathFrom(null, {'kind': 'sla_breach', 'alertId': 'a1b2c3d4', 'zoneId': _z1}), '/more/insights/sla?zone=$_z1');
      expect(inAppPathFrom(null, {'kind': 'sla_breach', 'alertId': 'a1b2c3d4'}), '/more/insights/sla');
      expect(inAppPathFrom(null, {'kind': 'order_unassigned', 'alertId': 'a1b2c3d4'}), '/alerts/a1b2c3d4');
    });
  });

  group('fraud rules', () {
    testWidgets('lists every rule, marking the ones that use the default', (tester) async {
      await pumpInsights(tester, const FraudRulesScreen(), permissions: _fraudReader, size: const Size(390, 1800));
      await settleInsights(tester);
      for (final r in ['customer_cancellations', 'code_sharing', 'refund_rate', 'rider_cash_gap', 'unusual_order_value']) {
        expect(find.byKey(Key('fraud-rule-$r')), findsOneWidget, reason: r);
      }
      expect(find.descendant(of: find.byKey(const Key('fraud-rule-customer_cancellations')), matching: find.text('Uses the default')), findsOneWidget);
      expect(find.descendant(of: find.byKey(const Key('fraud-rule-rider_cash_gap')), matching: find.text('Uses the default')), findsNothing);
      expect(find.descendant(of: find.byKey(const Key('fraud-rule-unusual_order_value')), matching: find.text('Off')), findsOneWidget);
      expect(find.text('3 in 7 days'), findsOneWidget);
      expect(find.text('30% in 30 days'), findsOneWidget);
    });

    testWidgets('editing needs alerts.configure and a chosen zone', (tester) async {
      await pumpInsights(tester, const FraudRulesScreen(), permissions: _fraudReader, size: const Size(390, 1800));
      await settleInsights(tester);
      expect(find.byKey(const Key('edit-rule-refund_rate')), findsNothing);

      await pumpInsights(tester, const FraudRulesScreen(), permissions: {..._fraudReader, 'manager.alerts.configure'}, size: const Size(390, 1800));
      await settleInsights(tester);
      expect(find.byKey(const Key('edit-rule-refund_rate')), findsNothing, reason: 'no single zone chosen');
      expect(find.textContaining('Pick a single zone'), findsOneWidget);
    });

    testWidgets('a zone manager can change one rule, within its bounds', (tester) async {
      final repo = FakeInsightsRepository();
      await pumpInsights(tester, const FraudRulesScreen(), repo: repo, permissions: {..._fraudReader, 'manager.alerts.configure'}, size: const Size(390, 1800));
      await settleInsights(tester);
      containerOf(tester).read(areaProvider.notifier).set(const AreaZone('z1', 'Bemetara', 'Bemetara'));
      await settleInsights(tester);

      await tester.tap(find.byKey(const Key('edit-rule-customer_cancellations')));
      await settleInsights(tester);
      await tester.enterText(find.byKey(const Key('rule-threshold')), '99');
      await tester.tap(find.byKey(const Key('rule-save')));
      await settleInsights(tester);
      expect(find.text('Between 1 and 50'), findsOneWidget);
      expect(repo.fraudRuleChanges, isEmpty);

      await tester.enterText(find.byKey(const Key('rule-threshold')), '5');
      await tester.enterText(find.byKey(const Key('rule-window')), '14');
      await tester.tap(find.byKey(const Key('rule-save')));
      await settleInsights(tester);
      expect(repo.fraudRuleChanges, hasLength(1));
      final c = repo.fraudRuleChanges.single;
      expect(c.rule, FraudRule.customerCancellations);
      expect(c.zoneId, 'z1');
      expect(c.threshold, 5);
      expect(c.windowDays, 14);
    });

    testWidgets('the master switch is shown but is not changed here', (tester) async {
      final repo = FakeInsightsRepository();
      repo.fraudRulesValue = FraudRulesView(enabled: false, rules: repo.fraudRulesValue.rules);
      await pumpInsights(tester, const FraudRulesScreen(), repo: repo, permissions: _fraudReader, size: const Size(390, 1800));
      await settleInsights(tester);
      expect(find.byKey(const Key('master-off')), findsOneWidget);
      expect(find.textContaining('Alert thresholds'), findsOneWidget);
    });
  });

  group('dispatch mode', () {
    testWidgets('each zone shows its mode and the last day in numbers', (tester) async {
      await pumpInsights(tester, const DispatchScreen(), permissions: insightsViewer, size: const Size(390, 1600));
      await settleInsights(tester);
      expect(find.descendant(of: find.byKey(const Key('dispatch-$_z1')), matching: find.text('Offered to riders')), findsOneWidget);
      expect(find.descendant(of: find.byKey(const Key('dispatch-$_z2')), matching: find.text('Assigned automatically')), findsOneWidget);
      expect(find.textContaining('41 assigned automatically'), findsOneWidget);
      expect(find.textContaining('5 fell back to an offer'), findsOneWidget);
      expect(find.textContaining('already hold up to 1 delivery'), findsOneWidget);
    });

    testWidgets('editing is hidden without dispatch.configure', (tester) async {
      await pumpInsights(tester, const DispatchScreen(), permissions: insightsViewer, size: const Size(390, 1600));
      await settleInsights(tester);
      expect(find.byKey(const Key('dispatch-edit-$_z1')), findsNothing);
    });

    testWidgets('editing is hidden when the server says the caller cannot configure', (tester) async {
      final repo = FakeInsightsRepository();
      repo.dispatchValue = DispatchOverview(zones: repo.dispatchValue.zones, canConfigure: false);
      await pumpInsights(tester, const DispatchScreen(), repo: repo, permissions: {...insightsViewer, 'manager.dispatch.configure'}, size: const Size(390, 1600));
      await settleInsights(tester);
      expect(find.byKey(const Key('dispatch-edit-$_z1')), findsNothing);
    });

    Future<FakeInsightsRepository> openEdit(WidgetTester tester, String zone) async {
      final repo = FakeInsightsRepository();
      await pumpInsights(tester, const DispatchScreen(), repo: repo, permissions: {...insightsViewer, 'manager.dispatch.configure'}, size: const Size(390, 1800));
      await settleInsights(tester);
      await tester.tap(find.byKey(Key('dispatch-edit-$zone')));
      await settleInsights(tester);
      return repo;
    }

    testWidgets('switching to automatic asks to confirm, then sends the load limit and the reason', (tester) async {
      final repo = await openEdit(tester, _z1);
      await tester.tap(find.byKey(const Key('mode-auto')));
      await settleInsights(tester);
      await tester.tap(find.byKey(const Key('load-2')));
      await tester.enterText(find.byKey(const Key('dispatch-reason')), 'Night shift is short of riders');
      await tester.tap(find.byKey(const Key('dispatch-save')));
      await settleInsights(tester);
      expect(find.text('Assign orders automatically?'), findsOneWidget);
      expect(repo.dispatchChanges, isEmpty, reason: 'nothing is sent before the confirmation');
      await tester.tap(find.text('Yes, assign automatically'));
      await settleInsights(tester);
      expect(repo.dispatchChanges, hasLength(1));
      final c = repo.dispatchChanges.single;
      expect(c.zoneId, _z1);
      expect(c.mode, DispatchMode.autoAssign);
      expect(c.autoAssignMaxLoad, 2);
      expect(c.reason, 'Night shift is short of riders');
    });

    testWidgets('going back to offers needs no confirmation but still needs a reason', (tester) async {
      final repo = await openEdit(tester, _z2);
      await tester.tap(find.byKey(const Key('mode-offer')));
      await settleInsights(tester);
      await tester.tap(find.byKey(const Key('dispatch-save')));
      await settleInsights(tester);
      expect(find.text('Say why, in at least 3 characters'), findsOneWidget);
      expect(repo.dispatchChanges, isEmpty);
      await tester.enterText(find.byKey(const Key('dispatch-reason')), 'Too many wrong picks');
      await tester.tap(find.byKey(const Key('dispatch-save')));
      await settleInsights(tester);
      expect(repo.dispatchChanges.single.mode, DispatchMode.offer);
    });

    testWidgets('a dropped connection retries as the same action', (tester) async {
      final repo = await openEdit(tester, _z2);
      repo.nextError = ApiException(0, 'network');
      await tester.tap(find.byKey(const Key('mode-offer')));
      await tester.enterText(find.byKey(const Key('dispatch-reason')), 'Too many wrong picks');
      await tester.tap(find.byKey(const Key('dispatch-save')));
      await settleInsights(tester);
      await tester.tap(find.byKey(const Key('dispatch-save')));
      await settleInsights(tester);
      expect(repo.dispatchChanges, hasLength(2));
      expect(repo.dispatchChanges[0].clientActionId, repo.dispatchChanges[1].clientActionId);
    });
  });
}
