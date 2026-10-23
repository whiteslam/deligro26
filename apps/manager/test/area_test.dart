import 'package:deligro_manager/core/api.dart';
import 'package:deligro_manager/models/manager_me.dart';
import 'package:deligro_manager/state/area.dart';
import 'package:deligro_manager/state/prefs.dart';
import 'package:deligro_manager/state/providers.dart';
import 'package:deligro_manager/state/session.dart';
import 'package:deligro_manager/widgets/area_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'auth_test.dart' show meJson;
import 'helpers.dart';

/// Two cities: Bemetara has two zones, Durg has one.
final _twoCities = {
  ...meJson,
  'zones': {
    'all': false,
    'cities': [
      {
        'id': 'c-durg',
        'name': 'Durg',
        'zones': [
          {'id': 'z-durg', 'name': 'Durg Central', 'slug': 'durg'},
        ],
      },
      {
        'id': 'c-bem',
        'name': 'Bemetara',
        'zones': [
          {'id': 'z-bem1', 'name': 'Bemetara Town', 'slug': 'bem-town'},
          {'id': 'z-bem2', 'name': 'Bemetara North', 'slug': 'bem-north'},
        ],
      },
    ],
  },
};

class _Me extends ManagerMeNotifier {
  _Me(this.json);
  final Map<String, dynamic> json;
  @override
  Future<ManagerMe?> build() async => ref.watch(signedInProvider) ? ManagerMe.fromJson(json) : null;
}

class _SignedIn extends Notifier<bool> {
  @override
  bool build() => true;
  void set(bool v) => state = v;
}

final _signedInSwitch = NotifierProvider<_SignedIn, bool>(_SignedIn.new);

Future<ProviderContainer> _container({Map<String, Object> prefs = const {}, Map<String, dynamic>? me}) async {
  SharedPreferences.setMockInitialValues(prefs);
  final p = await SharedPreferences.getInstance();
  final c = ProviderContainer(overrides: [
    prefsProvider.overrideWithValue(p),
    managerMeProvider.overrideWith(() => _Me(me ?? _twoCities)),
    signedInProvider.overrideWith((ref) => ref.watch(_signedInSwitch)),
  ]);
  addTearDown(c.dispose);
  await c.read(managerMeProvider.future);
  return c;
}

void main() {
  group('Area', () {
    test('toQuery: scope is empty, a city sends city, a zone sends zone', () {
      expect(const AreaScope().toQuery(), isEmpty);
      expect(const AreaCity('c1', 'Bemetara').toQuery(), {'city': 'c1'});
      expect(const AreaZone('z1', 'Town', 'Bemetara').toQuery(), {'zone': 'z1'});
    });

    test('labels read in words', () {
      expect(const AreaScope().label, 'All my zones');
      expect(const AreaScope(admin: true).label, 'All zones');
      expect(const AreaCity('c1', 'Bemetara').label, 'All of Bemetara');
      expect(const AreaZone('z1', 'Bemetara Town', 'Bemetara').label, 'Bemetara Town');
    });

    test('a saved area the manager no longer holds is ignored', () {
      final me = ManagerMe.fromJson(_twoCities);
      expect(areaFromSaved('zone:z-bem2', me), const AreaZone('z-bem2', 'Bemetara North', 'Bemetara'));
      expect(areaFromSaved('city:c-durg', me), const AreaCity('c-durg', 'Durg'));
      expect(areaFromSaved('zone:gone', me), isNull);
      expect(areaFromSaved('city:gone', me), isNull);
      expect(areaFromSaved('nonsense', me), isNull);
      expect(areaFromSaved(null, me), isNull);
    });
  });

  group('the city filter on the wire', () {
    test('zone=city:<id> becomes city=<id>; a real zone is untouched', () {
      expect(applyCityFilter({'zone': 'city:c1', 'from': '2026-10-01'}), {'from': '2026-10-01', 'city': 'c1'});
      expect(applyCityFilter({'zone': 'z1', 'from': '2026-10-01'}), {'zone': 'z1', 'from': '2026-10-01'});
      expect(applyCityFilter({'from': '2026-10-01'}), {'from': '2026-10-01'});
    });

    test('the API client sends city=, never zone=city:', () async {
      late Uri sent;
      final client = MockClient((req) async {
        sent = req.url;
        return http.Response('{}', 200);
      });
      final api = ApiClient(GoTrueClient(url: 'http://x'), client: client);
      await api.get('/api/manager/orders', query: {'zone': 'city:c-bem', 'status': 'today'});
      expect(sent.queryParameters, {'city': 'c-bem', 'status': 'today'});
      await api.get('/api/manager/orders', query: {'zone': 'z-bem1'});
      expect(sent.queryParameters, {'zone': 'z-bem1'});
    });
  });

  group('areaProvider', () {
    test('starts at all, remembers a choice, and drops it on sign-out', () async {
      final c = await _container();
      expect(c.read(areaProvider), const AreaScope());
      c.read(areaProvider.notifier).set(const AreaCity('c-bem', 'Bemetara'));
      expect(c.read(areaProvider).label, 'All of Bemetara');
      expect(c.read(prefsProvider).getString('manager-area'), 'city:c-bem');

      c.read(_signedInSwitch.notifier).set(false);
      await c.read(managerMeProvider.future);
      expect(c.read(areaProvider), const AreaScope());
    });

    test('a city is read as a city token and no zone; a zone is a real zone', () async {
      final c = await _container();
      c.read(areaProvider.notifier).set(const AreaCity('c-bem', 'Bemetara'));
      expect(c.read(activeZoneProvider), isNull);
      expect(c.read(areaFilterProvider)!.id, 'city:c-bem');

      c.read(areaProvider.notifier).set(const AreaZone('z-bem1', 'Bemetara Town', 'Bemetara'));
      expect(c.read(activeZoneProvider)!.id, 'z-bem1');
      expect(c.read(areaFilterProvider)!.id, 'z-bem1');
    });

    test('an area saved on the phone is restored, if still held', () async {
      final held = await _container(prefs: {'manager-area': 'zone:z-bem2'});
      expect(held.read(areaProvider), const AreaZone('z-bem2', 'Bemetara North', 'Bemetara'));
      final gone = await _container(prefs: {'manager-area': 'zone:z-elsewhere'});
      expect(gone.read(areaProvider), const AreaScope());
    });

    test('the old single-zone setting still opens on that zone', () async {
      final c = await _container(prefs: {'manager-zone': 'z-durg'});
      expect(c.read(areaProvider), const AreaZone('z-durg', 'Durg Central', 'Durg'));
    });
  });

  group('the picker', () {
    test('lists cities by name, "All of" only for a city with several zones', () {
      final rows = areaChoices(ManagerMe.fromJson(_twoCities));
      expect(rows.map((a) => a.label).toList(), [
        'All my zones',
        'All of Bemetara',
        'Bemetara Town',
        'Bemetara North',
        'Durg Central',
      ]);
    });

    testWidgets('picking a city on one screen carries to the next', (tester) async {
      final overrides = [
        managerMeProvider.overrideWith(() => _Me(_twoCities)),
        signedInProvider.overrideWithValue(true),
      ];
      // Two "screens" under one scope: each reads the shared choice.
      await tester.pumpWidget(await themed(
        Consumer(builder: (context, ref, _) {
          final other = ref.watch(areaProvider);
          return Scaffold(
            body: Column(children: [
              const AreaPickerChip(),
              Text('other screen: ${other.label}', key: const Key('other')),
            ]),
          );
        }),
        overrides: overrides,
      ));
      await tester.pump();
      await tester.pump();
      expect(find.text('All my zones'), findsOneWidget);

      await tester.tap(find.byKey(const Key('zone-picker')));
      await tester.pumpAndSettle();
      expect(find.text('BEMETARA'), findsOneWidget);
      expect(find.text('DURG'), findsOneWidget);
      await tester.tap(find.byKey(const Key('area-city-c-bem')));
      await tester.pumpAndSettle();

      expect(find.text('other screen: All of Bemetara'), findsOneWidget);
      expect(find.text('All of Bemetara'), findsOneWidget); // the chip
    });
  });
}
