import 'package:deligro_manager/core/api.dart';
import 'package:deligro_manager/core/format.dart' show istToday;
import 'package:deligro_manager/features/insights/sla_screen.dart';
import 'package:deligro_manager/features/insights/vendor_benchmarks_screen.dart';
import 'package:deligro_manager/features/insights/zone_map_screen.dart';
import 'package:deligro_manager/features/orders/order_mini_map.dart';
import 'package:deligro_manager/models/insights.dart';
import 'package:deligro_manager/models/outcome.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:intl/intl.dart';
import 'package:latlong2/latlong.dart';

import 'fakes/fake_insights_repository.dart';
import 'fixtures/fixtures.dart';
import 'insights_helpers.dart';

const _z1 = '11111111-1111-4111-8111-111111111111';
const _z2 = '22222222-2222-4222-8222-222222222222';
const _c1 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const _spice = 'v0000001-0000-4000-8000-000000000000';
const _biryani = 'v0000002-0000-4000-8000-000000000000';
const _chaat = 'v0000003-0000-4000-8000-000000000000';

final _noTiles = [mapTilesEnabledProvider.overrideWithValue(false)];

String _day(DateTime d) => DateFormat('yyyy-MM-dd').format(d);

void main() {
  group('zone map', () {
    testWidgets('draws one rectangle per cell and one circle per zone', (tester) async {
      await pumpInsights(tester, const ZoneMapScreen(), size: const Size(390, 2200), extra: _noTiles);
      await settleInsights(tester);
      expect(tester.widget<PolygonLayer>(find.byType(PolygonLayer)).polygons, hasLength(6));
      expect(tester.widget<CircleLayer>(find.byType(CircleLayer)).circles, hasLength(2));
    });

    test('a tap finds the cell it landed in, and nothing outside the grid', () {
      final cells = ZoneMap.fromJson(apiFixture('insights/zones')).cells;
      final hit = cellAt(cells, const LatLng(21.7045, 81.5245));
      expect(hit?.key, cells.first.key);
      expect(cellAt(cells, const LatLng(10, 70)), isNull);
    });

    testWidgets('tapping a suggestion moves the map to where it points', (tester) async {
      final controller = MapController();
      await pumpInsights(tester, ZoneMapScreen(controller: controller), size: const Size(390, 2400), extra: _noTiles);
      await settleInsights(tester);
      await tester.ensureVisible(find.byKey(const Key('suggestion-0')));
      await tester.tap(find.byKey(const Key('suggestion-0')));
      await settleInsights(tester);
      expect(controller.camera.center.latitude, closeTo(21.742, 0.002));
      expect(controller.camera.center.longitude, closeTo(81.561, 0.002));
    });

    testWidgets('a suggestion with no point of its own goes to its zone', (tester) async {
      final controller = MapController();
      await pumpInsights(tester, ZoneMapScreen(controller: controller), size: const Size(390, 2400), extra: _noTiles);
      await settleInsights(tester);
      // resize_zone, about Nawagarh (zone 2): no centre of its own.
      await tester.ensureVisible(find.byKey(const Key('suggestion-3')));
      await tester.tap(find.byKey(const Key('suggestion-3')));
      await settleInsights(tester);
      expect(controller.camera.center.latitude, closeTo(21.75, 0.002));
      expect(controller.camera.center.longitude, closeTo(81.65, 0.002));
    });

    testWidgets('every suggestion reads as plain words', (tester) async {
      await pumpInsights(tester, const ZoneMapScreen(), size: const Size(390, 2400), extra: _noTiles);
      await settleInsights(tester);
      expect(find.textContaining('12% of Bemetara drops are beyond its 6 km radius'), findsOneWidget);
      expect(find.textContaining('53 drops in this range came from places outside every zone'), findsOneWidget);
      expect(find.textContaining('could shrink to 3 km'), findsOneWidget);
      for (var i = 0; i < 5; i++) {
        expect(find.byKey(Key('suggestion-$i')), findsOneWidget);
      }
    });

    testWidgets('the shading toggle swaps the legend', (tester) async {
      await pumpInsights(tester, const ZoneMapScreen(), size: const Size(390, 2400), extra: _noTiles);
      await settleInsights(tester);
      expect(find.text('More drops'), findsOneWidget);
      expect(find.text('Slower deliveries'), findsNothing);
      await tester.ensureVisible(find.text('Delivery time'));
      await tester.tap(find.text('Delivery time'));
      await settleInsights(tester);
      expect(find.text('Slower deliveries'), findsOneWidget);
      expect(find.text('More drops'), findsNothing);
    });

    testWidgets('the busiest areas open a cell sheet with its figures', (tester) async {
      await pumpInsights(tester, const ZoneMapScreen(), size: const Size(390, 2400), extra: _noTiles);
      await settleInsights(tester);
      await tester.ensureVisible(find.byKey(const Key('cell-2412:8790')));
      await tester.tap(find.byKey(const Key('cell-2412:8790')));
      await settleInsights(tester);
      expect(find.byKey(const Key('cell-sheet')), findsOneWidget);
      expect(find.text('Drops'), findsOneWidget);
      expect(find.text('64'), findsOneWidget);
      expect(find.text('Median delivery'), findsOneWidget);
      expect(find.text('22 min'), findsOneWidget);
      expect(find.text('Inside a zone'), findsOneWidget);
    });

    testWidgets('zones and cities are summarised', (tester) async {
      await pumpInsights(tester, const ZoneMapScreen(), size: const Size(390, 2600), extra: _noTiles);
      await settleInsights(tester);
      await tester.ensureVisible(find.byKey(const Key('city-$_c1')));
      expect(find.byKey(const Key('city-$_c1')), findsOneWidget);
      expect(find.byKey(const Key('zone-$_z1')), findsOneWidget);
      expect(find.byKey(const Key('zone-$_z2')), findsOneWidget);
      expect(find.textContaining('12% beyond its radius'), findsOneWidget);
    });

    testWidgets('picking 7 days asks for exactly the last seven IST days', (tester) async {
      final repo = FakeInsightsRepository();
      await pumpInsights(tester, const ZoneMapScreen(), repo: repo, extra: _noTiles);
      await settleInsights(tester);
      final today = istToday();
      expect(repo.zoneMapCalls.last.$2, _day(today));
      expect(repo.zoneMapCalls.last.$1, _day(today.subtract(const Duration(days: 27))));
      await tester.tap(find.byKey(const Key('range-7')));
      await settleInsights(tester);
      expect(repo.zoneMapCalls.last.$1, _day(today.subtract(const Duration(days: 6))));
      expect(repo.zoneMapCalls.last.$2, _day(today));
    });

    testWidgets('asks for the chosen area', (tester) async {
      final repo = FakeInsightsRepository();
      await pumpInsights(tester, const ZoneMapScreen(), repo: repo, extra: _noTiles);
      await settleInsights(tester);
      chooseCity(tester);
      await settleInsights(tester);
      expect(repo.zoneMapCalls.last.$3, 'city:c1');
    });

    testWidgets('a range that is too long is explained, not retried', (tester) async {
      final repo = FakeInsightsRepository()..nextError = ApiException(400, 'range_too_long');
      await pumpInsights(tester, const ZoneMapScreen(), repo: repo, extra: _noTiles);
      await settleInsights(tester);
      expect(find.text('Pick a range of a year or less.'), findsOneWidget);
    });

    testWidgets('on a tablet the map sits beside the suggestions', (tester) async {
      await pumpInsights(tester, const ZoneMapScreen(), size: const Size(1280, 900), extra: _noTiles);
      await settleInsights(tester);
      final map = tester.getTopLeft(find.byType(FlutterMap));
      final list = tester.getTopLeft(find.byKey(const Key('suggestion-0')));
      expect(map.dx, lessThan(list.dx));
    });

    testWidgets('no drops at all says so', (tester) async {
      final repo = FakeInsightsRepository();
      final z = repo.zoneMapValue;
      repo.zoneMapValue = ZoneMap(
        generatedAt: z.generatedAt,
        range: z.range,
        area: z.area,
        cellKm: z.cellKm,
        minCellDrops: z.minCellDrops,
        zones: z.zones,
        cities: z.cities,
        cells: const [],
        suggestions: const [],
      );
      await pumpInsights(tester, const ZoneMapScreen(), repo: repo, size: const Size(390, 2400), extra: _noTiles);
      await settleInsights(tester);
      expect(find.textContaining('No areas with enough deliveries'), findsOneWidget);
      expect(find.textContaining('Nothing to change'), findsOneWidget);
    });
  });

  group('vendor benchmarks', () {
    testWidgets('a vendor with too few orders says so instead of showing zeros', (tester) async {
      await pumpInsights(tester, const VendorBenchmarksScreen(), size: const Size(390, 3000));
      await settleInsights(tester);
      expect(find.byKey(const Key('vendor-row-$_chaat')), findsOneWidget);
      expect(find.byKey(const Key('verdict-$_chaat-prepMinutes')), findsOneWidget);
      expect(find.descendant(of: find.byKey(const Key('verdict-$_chaat-prepMinutes')), matching: find.text('Not enough data')), findsOneWidget);
      expect(find.textContaining('Fewer than 5 orders'), findsOneWidget);
    });

    testWidgets('verdicts are words with the difference, never colour alone', (tester) async {
      await pumpInsights(tester, const VendorBenchmarksScreen(), size: const Size(390, 3000));
      await settleInsights(tester);
      Finder v(String id, String m) => find.byKey(Key('verdict-$id-$m'));
      expect(find.descendant(of: v(_spice, 'prepMinutes'), matching: find.text('Worse · +22%')), findsOneWidget);
      expect(find.descendant(of: v(_spice, 'acceptMinutes'), matching: find.text('Better · −40%')), findsOneWidget);
      expect(find.descendant(of: v(_spice, 'repeatRate'), matching: find.text('In line')), findsOneWidget);
    });

    testWidgets('the zone medians head the list', (tester) async {
      await pumpInsights(tester, const VendorBenchmarksScreen(), size: const Size(390, 3000));
      await settleInsights(tester);
      expect(find.byKey(const Key('medians-$_z1')), findsOneWidget);
      expect(find.textContaining('14 vendors compared'), findsOneWidget);
    });

    testWidgets('sorting by prep time puts the quickest first and the unknown last', (tester) async {
      await pumpInsights(tester, const VendorBenchmarksScreen(), size: const Size(390, 3000));
      await settleInsights(tester);
      double top(String id) => tester.getTopLeft(find.byKey(Key('vendor-row-$id'))).dy;
      // By orders to start with: Spice Hub (230), Biryani (96), New Chaat (4).
      expect(top(_spice), lessThan(top(_biryani)));
      await tester.tap(find.byKey(const Key('sort-menu')));
      await settleInsights(tester);
      await tester.tap(find.byKey(const Key('sort-prepMinutes')));
      await settleInsights(tester);
      expect(top(_biryani), lessThan(top(_spice)));
      expect(top(_spice), lessThan(top(_chaat)));
    });

    testWidgets('Load more adds the next page without repeating a vendor', (tester) async {
      final repo = FakeInsightsRepository();
      final first = Map<String, dynamic>.from(apiFixture('insights/vendors'))
        ..['total'] = 5
        ..['pageSize'] = 3;
      final second = Map<String, dynamic>.from(first)
        ..['page'] = 2
        ..['vendors'] = [
          {
            'id': 'v0000009-0000-4000-8000-000000000000',
            'name': 'Hot Rotis',
            'zoneId': _z1,
            'orders': 60,
            'values': {'prepMinutes': 16.0},
            'verdicts': {'prepMinutes': 'in_line'},
            'deltaPct': {'prepMinutes': -5.0},
          },
          (first['vendors'] as List).first, // already on page 1
        ];
      repo.vendorsValue = VendorBenchmarks.fromJson(first);
      repo.vendorPages[2] = VendorBenchmarks.fromJson(second);
      await pumpInsights(tester, const VendorBenchmarksScreen(), repo: repo, size: const Size(390, 4000));
      await settleInsights(tester);
      expect(find.byKey(const Key('load-more')), findsOneWidget);
      await tester.ensureVisible(find.byKey(const Key('load-more')));
      await tester.tap(find.byKey(const Key('load-more')));
      await settleInsights(tester);
      expect(repo.vendorCalls.last.$4, 2);
      expect(find.text('Hot Rotis'), findsOneWidget);
      expect(find.text('Spice Hub'), findsOneWidget, reason: 'listed once, not twice');
      expect(find.byKey(const Key('vendor-row-$_spice')), findsOneWidget);
    });

    testWidgets('asks for the chosen area and range', (tester) async {
      final repo = FakeInsightsRepository();
      await pumpInsights(tester, const VendorBenchmarksScreen(), repo: repo);
      await settleInsights(tester);
      chooseCity(tester);
      await settleInsights(tester);
      expect(repo.vendorCalls.last.$3, 'city:c1');
      expect(repo.vendorCalls.last.$4, 1);
    });

    testWidgets('no vendors says so', (tester) async {
      final repo = FakeInsightsRepository();
      final b = repo.vendorsValue;
      repo.vendorsValue = VendorBenchmarks(
        generatedAt: b.generatedAt,
        range: b.range,
        area: b.area,
        minOrders: b.minOrders,
        metrics: b.metrics,
        zones: const [],
        cities: const [],
        vendors: const [],
        page: 1,
        pageSize: 50,
        total: 0,
      );
      await pumpInsights(tester, const VendorBenchmarksScreen(), repo: repo);
      await settleInsights(tester);
      expect(find.textContaining('No vendors had orders in this range'), findsOneWidget);
    });
  });

  group('service levels', () {
    testWidgets('four stage cards show the late share, the count and the median against target', (tester) async {
      await pumpInsights(tester, const SlaScreen(), size: const Size(390, 3000));
      await settleInsights(tester);
      for (final s in ['accept', 'prep', 'pickup', 'deliver']) {
        expect(find.byKey(Key('stage-$s')), findsOneWidget, reason: s);
      }
      final deliver = find.byKey(const Key('stage-deliver'));
      expect(find.descendant(of: deliver, matching: find.text('19%')), findsOneWidget);
      expect(find.descendant(of: deliver, matching: find.text('141 of 744 late')), findsOneWidget);
      expect(find.descendant(of: deliver, matching: find.text('Median 38 min · target 45 min')), findsOneWidget);
      expect(find.descendant(of: find.byKey(const Key('stage-accept')), matching: find.text('Median 3.2 min · target 5 min')), findsOneWidget);
    });

    test('the target for a zone is its own, else the default', () {
      final report = SlaReport.fromJson(apiFixture('insights/sla'));
      expect(targetFor(report, _z2).deliverMinutes, 60);
      expect(targetFor(report, _z2).inherited, isFalse);
      expect(targetFor(report, _z1).deliverMinutes, 45);
      expect(targetFor(report, 'no-such-zone').zoneId, isNull);
      expect(targetFor(report, null).zoneId, isNull);
    });

    testWidgets('the daily line draws one line for each stage', (tester) async {
      await pumpInsights(tester, const SlaScreen(), size: const Size(390, 3000));
      await settleInsights(tester);
      final line = tester.widget<LineChart>(find.descendant(of: find.byKey(const Key('sla-daily')), matching: find.byType(LineChart)));
      expect(line.data.lineBarsData, hasLength(4));
      expect(line.data.lineBarsData.every((l) => l.spots.length == 7), isTrue);
    });

    testWidgets('the worst vendors, riders, zones and cities are listed', (tester) async {
      await pumpInsights(tester, const SlaScreen(), size: const Size(390, 3600));
      await settleInsights(tester);
      await tester.ensureVisible(find.byKey(const Key('sla-rider-r0000004-0000-4000-8000-000000000000')));
      expect(find.byKey(const Key('sla-vendor-$_spice')), findsOneWidget);
      expect(find.byKey(const Key('sla-rider-r0000004-0000-4000-8000-000000000000')), findsOneWidget);
      expect(find.text('Ravi K · DR-0004'), findsOneWidget);
      expect(find.text('Imran S'), findsOneWidget, reason: 'a rider with no code shows the name alone');
      expect(find.byKey(const Key('sla-zone-$_z1')), findsOneWidget);
      expect(find.byKey(const Key('sla-city-$_c1')), findsOneWidget);
    });

    testWidgets('editing targets needs alerts.configure', (tester) async {
      await pumpInsights(tester, const SlaScreen(), size: const Size(390, 1800));
      await settleInsights(tester);
      expect(find.byKey(const Key('edit-targets')), findsNothing);
      await pumpInsights(tester, const SlaScreen(), permissions: {...insightsViewer, 'manager.alerts.configure'}, size: const Size(390, 1800));
      await settleInsights(tester);
      expect(find.byKey(const Key('edit-targets')), findsOneWidget);
    });

    Future<FakeInsightsRepository> openSheet(WidgetTester tester, {String role = 'manager', FakeInsightsRepository? repo}) async {
      final r = repo ?? FakeInsightsRepository();
      await pumpInsights(tester, const SlaScreen(), repo: r, permissions: {...insightsViewer, 'manager.alerts.configure'}, role: role, size: const Size(390, 1800));
      await settleInsights(tester);
      await tester.tap(find.byKey(const Key('edit-targets')));
      await settleInsights(tester);
      return r;
    }

    testWidgets('the sheet refuses prep 0 and a two-letter reason, and sends nothing', (tester) async {
      final repo = await openSheet(tester);
      await tester.enterText(find.byKey(const Key('sla-prep')), '0');
      await tester.enterText(find.byKey(const Key('sla-reason')), 'ab');
      await tester.tap(find.byKey(const Key('sla-save')));
      await settleInsights(tester);
      expect(find.text('Preparing: 1 to 180 minutes'), findsOneWidget);
      expect(find.text('Say why, in at least 3 characters'), findsOneWidget);
      expect(repo.slaChanges, isEmpty);
    });

    testWidgets('a valid change sends the numbers and the reason, then reloads', (tester) async {
      final repo = await openSheet(tester);
      final before = repo.slaCalls.length;
      await tester.enterText(find.byKey(const Key('sla-prep')), '25');
      await tester.enterText(find.byKey(const Key('sla-reason')), 'Festival week');
      await tester.tap(find.byKey(const Key('sla-save')));
      await settleInsights(tester);
      expect(repo.slaChanges, hasLength(1));
      final c = repo.slaChanges.single;
      expect(c.prepMinutes, 25);
      expect(c.reason, 'Festival week');
      expect(find.byKey(const Key('sla-save')), findsNothing, reason: 'the sheet closed');
      expect(repo.slaCalls.length, greaterThan(before));
    });

    testWidgets('a retry after a dropped connection is the same action; a changed reason is a new one', (tester) async {
      final repo = FakeInsightsRepository();
      await openSheet(tester, repo: repo);
      // The connection drops on the save, not on the page load.
      repo.nextError = ApiException(0, 'network');
      await tester.enterText(find.byKey(const Key('sla-reason')), 'Festival week');
      await tester.tap(find.byKey(const Key('sla-save')));
      await settleInsights(tester);
      expect(find.text('No connection. Check your internet and try again.'), findsOneWidget);
      expect(find.byKey(const Key('sla-save')), findsOneWidget, reason: 'still open');
      await tester.tap(find.byKey(const Key('sla-save')));
      await settleInsights(tester);
      expect(repo.slaChanges, hasLength(2));
      expect(repo.slaChanges[0].clientActionId, repo.slaChanges[1].clientActionId);
    });

    testWidgets('a refusal is explained and a changed reason is a fresh decision', (tester) async {
      final repo = FakeInsightsRepository();
      await openSheet(tester, repo: repo);
      await tester.enterText(find.byKey(const Key('sla-reason')), 'First try');
      // The server says no to this particular change.
      repo.nextOutcome = const Refused<SlaTarget>('bad_threshold');
      await tester.tap(find.byKey(const Key('sla-save')));
      await settleInsights(tester);
      expect(find.text('That number is outside the allowed range.'), findsOneWidget);
      await tester.enterText(find.byKey(const Key('sla-reason')), 'Second try');
      await tester.tap(find.byKey(const Key('sla-save')));
      await settleInsights(tester);
      expect(repo.slaChanges, hasLength(2));
      expect(repo.slaChanges[0].clientActionId, isNot(repo.slaChanges[1].clientActionId));
    });

    testWidgets('only an admin can change the platform default', (tester) async {
      await openSheet(tester);
      await tester.tap(find.byKey(const Key('sla-zone')));
      await settleInsights(tester);
      expect(find.text('Platform default (all zones)'), findsNothing);
      await tester.tapAt(const Offset(5, 5));
      await settleInsights(tester);

      await openSheet(tester, role: 'admin');
      await tester.tap(find.byKey(const Key('sla-zone')));
      await settleInsights(tester);
      expect(find.text('Platform default (all zones)'), findsWidgets);
    });

    testWidgets('asks for the chosen area', (tester) async {
      final repo = FakeInsightsRepository();
      await pumpInsights(tester, const SlaScreen(), repo: repo);
      await settleInsights(tester);
      chooseCity(tester);
      await settleInsights(tester);
      expect(repo.slaCalls.last.$3, 'city:c1');
    });

    testWidgets('opened from an SLA alert, it looks at the zone in the link', (tester) async {
      final repo = FakeInsightsRepository();
      await pumpInsights(tester, const SlaScreen(zoneId: 'z1'), repo: repo);
      await settleInsights(tester);
      expect(repo.slaCalls.last.$3, 'z1');
    });

    testWidgets('a zone this manager does not work is ignored, not trusted', (tester) async {
      final repo = FakeInsightsRepository();
      await pumpInsights(tester, const SlaScreen(zoneId: 'someone-elses-zone'), repo: repo);
      await settleInsights(tester);
      expect(repo.slaCalls.last.$3, isNull);
    });
  });
}
