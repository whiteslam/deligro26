import 'package:deligro_manager/models/support_ops.dart' show Assignee, AssigneeList;
import 'package:deligro_manager/state/area.dart';
import 'package:deligro_manager/state/support.dart' show ticketAssigneesProvider;
import 'package:deligro_manager/state/vendors.dart' show vendorDirectoryProvider;
import 'package:deligro_manager/state/providers.dart';
import 'package:deligro_manager/state/session.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'fakes/fake_insights_repository.dart';
import 'helpers.dart';
import 'vp_helpers.dart' show MeWith;

/// What an insights reader holds.
const insightsViewer = {'manager.insights.view'};

/// Every permission an Insights screen looks at, for tests of the full hub.
const insightsEverything = {
  'manager.insights.view',
  'manager.customers.view',
  'manager.reports.view',
  'manager.finance.view',
  'manager.accounting.export',
  'manager.alerts.configure',
  'manager.dispatch.configure',
};

/// Pumps [child] with a fake insights repository and a manager holding exactly
/// [permissions] (or an admin when [role] is `admin`).
Future<void> pumpInsights(
  WidgetTester tester,
  Widget child, {
  FakeInsightsRepository? repo,
  Set<String> permissions = insightsViewer,
  String role = 'manager',
  Size size = const Size(390, 860),
  List extra = const [],
  Map<String, Object> prefs = const {},
}) async {
  tester.view.physicalSize = size;
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);
  // A fresh scope each time, so a second pump in one test starts from nothing.
  await tester.pumpWidget(const SizedBox());
  await tester.pumpWidget(await themed(
    child,
    prefs: prefs,
    overrides: [
      insightsRepoProvider.overrideWithValue(repo ?? FakeInsightsRepository()),
      managerMeProvider.overrideWith(() => MeWith(permissions, role)),
      signedInProvider.overrideWithValue(true),
      // The pickers in the schedule form: no network in a widget test.
      vendorDirectoryProvider.overrideWith((ref) async => const []),
      ticketAssigneesProvider.overrideWith((ref, zoneId) async => const AssigneeList(
            staff: [Assignee(id: 'u1', name: 'Asha Verma', role: 'manager'), Assignee(id: 'u2', name: 'Imran S', role: 'manager')],
            teams: [],
          )),
      ...extra,
    ],
  ));
  await tester.pump();
  await tester.pump();
}

/// Lets async work and animations run without waiting for a spinner.
Future<void> settleInsights(WidgetTester tester, [int frames = 12]) async {
  for (var i = 0; i < frames; i++) {
    await tester.pump(const Duration(milliseconds: 100));
  }
}

/// The container behind the pumped screen, to change the area or read state.
ProviderContainer containerOf(WidgetTester tester) => ProviderScope.containerOf(tester.element(find.byType(Scaffold).first));

void chooseCity(WidgetTester tester, {String id = 'c1', String name = 'Bemetara'}) =>
    containerOf(tester).read(areaProvider.notifier).set(AreaCity(id, name));
