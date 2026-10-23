// Phase 9 screenshots (Insights) with sample data, for reviewing the look
// without a signed-in manager. Like screens_test.dart it lives outside test/
// and is not a regression gate. Writes PNGs to test_screens/out/ (gitignored):
//
//   flutter test test_screens/phase9_screens_test.dart --update-goldens
import 'dart:io';

import 'package:deligro_manager/features/insights/accounting_screen.dart';
import 'package:deligro_manager/features/insights/demand_screen.dart';
import 'package:deligro_manager/features/insights/dispatch_screen.dart';
import 'package:deligro_manager/features/insights/fraud_case_screen.dart';
import 'package:deligro_manager/features/insights/fraud_rules_screen.dart';
import 'package:deligro_manager/features/insights/fraud_screen.dart';
import 'package:deligro_manager/features/insights/insights_hub_screen.dart';
import 'package:deligro_manager/features/insights/report_run_screen.dart';
import 'package:deligro_manager/features/insights/riders_needed_screen.dart';
import 'package:deligro_manager/features/insights/schedule_form_screen.dart';
import 'package:deligro_manager/features/insights/schedules_screen.dart';
import 'package:deligro_manager/features/insights/sla_screen.dart';
import 'package:deligro_manager/features/insights/vendor_benchmarks_screen.dart';
import 'package:deligro_manager/features/insights/zone_map_screen.dart';
import 'package:deligro_manager/features/orders/order_mini_map.dart';
import 'package:deligro_manager/models/manager_me.dart';
import 'package:deligro_manager/models/support_ops.dart' show Assignee, AssigneeList;
import 'package:deligro_manager/state/prefs.dart';
import 'package:deligro_manager/state/providers.dart';
import 'package:deligro_manager/state/session.dart';
import 'package:deligro_manager/state/support.dart' show ticketAssigneesProvider;
import 'package:deligro_manager/state/vendors.dart' show vendorDirectoryProvider;
import 'package:deligro_manager/theme/app_theme.dart';
import 'package:deligro_manager/widgets/zone_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../test/auth_test.dart' show meJson;
import '../test/fakes/fake_insights_repository.dart';

Future<void> _loadFont(String family, List<String> files) async {
  final loader = FontLoader(family);
  for (final f in files) {
    final bytes = File(f.contains('/') ? f : 'C:/Windows/Fonts/$f').readAsBytesSync();
    loader.addFont(Future.value(ByteData.view(bytes.buffer)));
  }
  await loader.load();
}

Future<void> _fonts() async {
  for (final w in FontWeight.values) {
    final bold = w.value >= 600;
    await _loadFont(GoogleFonts.inter(fontWeight: w).fontFamily!, [bold ? 'segoeuib.ttf' : 'segoeui.ttf']);
    await _loadFont(GoogleFonts.jetBrainsMono(fontWeight: w).fontFamily!, [bold ? 'consolab.ttf' : 'consola.ttf']);
  }
  await _loadFont('Roboto', ['segoeui.ttf', 'segoeuib.ttf']);
  await _loadFont('MaterialIcons', ['F:/dev/flutter/bin/cache/artifacts/material_fonts/materialicons-regular.otf']);
}

/// A manager who holds every Insights permission, in two cities so the area
/// picker has something to show.
class _FixedMe extends ManagerMeNotifier {
  @override
  Future<ManagerMe?> build() async => ManagerMe.fromJson({
        ...meJson,
        'zones': {
          'all': false,
          'cities': [
            {
              'id': 'c1',
              'name': 'Bemetara',
              'zones': [
                {'id': 'z1', 'name': 'Bemetara Town', 'slug': 'town'},
                {'id': 'z2', 'name': 'Bemetara North', 'slug': 'north'},
              ],
            },
            {
              'id': 'c2',
              'name': 'Durg',
              'zones': [
                {'id': 'z3', 'name': 'Durg Central', 'slug': 'durg'},
              ],
            },
          ],
        },
        'permissions': {
          'manager.insights.view': true,
          'manager.customers.view': true,
          'manager.reports.view': true,
          'manager.finance.view': true,
          'manager.accounting.export': true,
          'manager.alerts.configure': true,
          'manager.dispatch.configure': true,
        },
      });
}

Future<void> _pump(
  WidgetTester t,
  Widget child, {
  Brightness b = Brightness.light,
  Size size = const Size(390, 860),
  FakeInsightsRepository? repo,
}) async {
  t.view.physicalSize = size * 2;
  t.view.devicePixelRatio = 2;
  addTearDown(t.view.reset);
  // A test harness outside test/, so the analyzer does not know it is one.
  // ignore: invalid_use_of_visible_for_testing_member
  SharedPreferences.setMockInitialValues({});
  final prefs = await SharedPreferences.getInstance();
  await t.pumpWidget(ProviderScope(
    overrides: [
      prefsProvider.overrideWithValue(prefs),
      managerMeProvider.overrideWith(_FixedMe.new),
      signedInProvider.overrideWithValue(true),
      activeZoneProvider.overrideWithValue(null),
      insightsRepoProvider.overrideWithValue(repo ?? FakeInsightsRepository()),
      vendorDirectoryProvider.overrideWith((ref) async => const []),
      ticketAssigneesProvider.overrideWith((ref, z) async => const AssigneeList(
            staff: [Assignee(id: 'u1', name: 'Asha Verma', role: 'manager'), Assignee(id: 'u2', name: 'Imran S', role: 'manager')],
            teams: [],
          )),
      mapTilesEnabledProvider.overrideWithValue(false),
    ],
    child: MaterialApp(debugShowCheckedModeBanner: false, theme: buildTheme(b), home: child),
  ));
  for (var i = 0; i < 10; i++) {
    await t.pump(const Duration(milliseconds: 100));
  }
}

Future<void> _settle(WidgetTester t) async {
  for (var i = 0; i < 8; i++) {
    await t.pump(const Duration(milliseconds: 100));
  }
}

Future<void> _shot(WidgetTester t, String name) => expectLater(find.byType(MaterialApp).first, matchesGoldenFile('out/$name.png'));

const _tall = Size(390, 1500);
const _taller = Size(390, 2300);
const _tablet = Size(1000, 800);

void main() {
  setUpAll(() async {
    GoogleFonts.config.allowRuntimeFetching = false;
    await _fonts();
  });

  for (final b in Brightness.values) {
    final tag = b.name;
    testWidgets('p9 hub $tag', (t) async {
      await _pump(t, const InsightsHubScreen(), b: b, size: const Size(390, 860));
      await _shot(t, 'p9-hub-$tag');
    });
    testWidgets('p9 demand $tag', (t) async {
      await _pump(t, const DemandScreen(), b: b, size: _taller);
      await _shot(t, 'p9-demand-$tag');
    });
    testWidgets('p9 zone map $tag', (t) async {
      await _pump(t, const ZoneMapScreen(), b: b, size: const Size(390, 2400));
      await _shot(t, 'p9-zone-map-$tag');
    });
    testWidgets('p9 vendor benchmarks $tag', (t) async {
      await _pump(t, const VendorBenchmarksScreen(), b: b, size: const Size(390, 2000));
      await _shot(t, 'p9-vendors-$tag');
    });
    testWidgets('p9 service levels $tag', (t) async {
      await _pump(t, const SlaScreen(), b: b, size: const Size(390, 2600));
      await _shot(t, 'p9-sla-$tag');
    });
  }

  testWidgets('p9 demand, too little history', (t) async {
    await _pump(t, const DemandScreen(), repo: FakeInsightsRepository(demandFixture: 'demand_thin'), size: _taller);
    await _shot(t, 'p9-demand-thin');
  });
  testWidgets('p9 riders needed', (t) async {
    await _pump(t, const RidersNeededScreen(), size: _tall);
    await _shot(t, 'p9-riders-needed');
  });
  testWidgets('p9 riders needed, default productivity', (t) async {
    await _pump(t, const RidersNeededScreen(), repo: FakeInsightsRepository(ridersFixture: 'riders_default'), size: _tall);
    await _shot(t, 'p9-riders-needed-default');
  });
  testWidgets('p9 demand tablet', (t) async {
    await _pump(t, const DemandScreen(), size: _tablet);
    await _shot(t, 'p9-demand-tablet');
  });
  testWidgets('p9 zone map tablet', (t) async {
    await _pump(t, const ZoneMapScreen(), size: _tablet);
    await _shot(t, 'p9-zone-map-tablet');
  });
  testWidgets('p9 zone map, shaded by delivery time', (t) async {
    await _pump(t, const ZoneMapScreen(), size: const Size(390, 1000));
    await t.tap(find.text('Delivery time'));
    await _settle(t);
    await _shot(t, 'p9-zone-map-time');
  });
  testWidgets('p9 zone map cell sheet', (t) async {
    await _pump(t, const ZoneMapScreen(), size: const Size(390, 2400));
    await t.ensureVisible(find.byKey(const Key('cell-2412:8790')));
    await t.tap(find.byKey(const Key('cell-2412:8790')));
    await _settle(t);
    await _shot(t, 'p9-zone-map-cell');
  });
  testWidgets('p9 service levels, edit targets', (t) async {
    await _pump(t, const SlaScreen(), size: const Size(390, 1800));
    await t.ensureVisible(find.byKey(const Key('edit-targets')));
    await t.tap(find.byKey(const Key('edit-targets')));
    await _settle(t);
    await _shot(t, 'p9-sla-edit');
  });
  testWidgets('p9 fraud cases', (t) async {
    await _pump(t, const FraudScreen(), size: _tall);
    await _shot(t, 'p9-fraud');
  });
  testWidgets('p9 fraud case', (t) async {
    await _pump(t, const FraudCaseScreen(alertId: 'f0000001-0000-4000-8000-000000000000'), size: _tall);
    await _shot(t, 'p9-fraud-case');
  });
  testWidgets('p9 fraud case, dismiss sheet', (t) async {
    await _pump(t, const FraudCaseScreen(alertId: 'f0000001-0000-4000-8000-000000000000'), size: _tall);
    await t.tap(find.byKey(const Key('dismiss-case')));
    await _settle(t);
    await _shot(t, 'p9-fraud-dismiss');
  });
  testWidgets('p9 fraud rules', (t) async {
    await _pump(t, const FraudRulesScreen(), size: const Size(390, 1700));
    await _shot(t, 'p9-fraud-rules');
  });
  testWidgets('p9 dispatch mode', (t) async {
    await _pump(t, const DispatchScreen(), size: const Size(390, 1000));
    await _shot(t, 'p9-dispatch');
  });
  testWidgets('p9 dispatch mode, change sheet', (t) async {
    await _pump(t, const DispatchScreen(), size: const Size(390, 1000));
    await t.tap(find.byKey(const Key('dispatch-edit-11111111-1111-4111-8111-111111111111')));
    await _settle(t);
    await t.tap(find.byKey(const Key('mode-auto')));
    await _settle(t);
    await _shot(t, 'p9-dispatch-edit');
  });
  testWidgets('p9 scheduled reports', (t) async {
    await _pump(t, const SchedulesScreen(), size: const Size(390, 1000));
    await _shot(t, 'p9-schedules');
  });
  testWidgets('p9 schedule form', (t) async {
    await _pump(t, const ScheduleFormScreen(scheduleId: 's0000001-0000-4000-8000-000000000000'), size: const Size(390, 2600));
    await _shot(t, 'p9-schedule-form');
  });
  testWidgets('p9 report run', (t) async {
    await _pump(t, const ReportRunScreen(runId: 'run00001-0000-4000-8000-000000000000'), size: const Size(390, 800));
    await _shot(t, 'p9-run');
  });
  testWidgets('p9 report run, too big', (t) async {
    await _pump(t, const ReportRunScreen(runId: 'run00003-0000-4000-8000-000000000000'), size: const Size(390, 700));
    await _shot(t, 'p9-run-too-big');
  });
  testWidgets('p9 accounting export', (t) async {
    await _pump(t, const AccountingScreen(), size: const Size(390, 2600));
    await _shot(t, 'p9-accounting');
  });
  testWidgets('p9 area picker', (t) async {
    await _pump(t, const DemandScreen(), size: const Size(390, 860));
    await t.tap(find.byKey(const Key('zone-picker')));
    await _settle(t);
    await _shot(t, 'p9-area-picker');
  });
}
