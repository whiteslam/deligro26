import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/manager_me.dart';
import 'prefs.dart';
import 'session.dart';

/// What every screen is filtered to: everything this manager works, one city,
/// or one zone (§17.8). The server narrows every list to it; a city or zone
/// the manager does not hold narrows to nothing, never to more.
sealed class Area {
  const Area();

  /// The query a route takes for this area: `{}`, `{city: id}` or `{zone: id}`.
  Map<String, String> toQuery();

  /// The word on the picker chip.
  String get label;

  /// How the choice is saved on the phone: `scope`, `city:<id>` or `zone:<id>`.
  String get saved;
}

/// "All my zones" (or "All zones" for an admin).
class AreaScope extends Area {
  const AreaScope({this.admin = false});
  final bool admin;

  @override
  Map<String, String> toQuery() => const {};

  @override
  String get label => admin ? 'All zones' : 'All my zones';

  @override
  String get saved => 'scope';

  @override
  bool operator ==(Object other) => other is AreaScope;

  @override
  int get hashCode => 0;
}

class AreaCity extends Area {
  const AreaCity(this.id, this.name);
  final String id;
  final String name;

  @override
  Map<String, String> toQuery() => {'city': id};

  @override
  String get label => 'All of $name';

  @override
  String get saved => 'city:$id';

  @override
  bool operator ==(Object other) => other is AreaCity && other.id == id;

  @override
  int get hashCode => Object.hash('city', id);
}

class AreaZone extends Area {
  const AreaZone(this.id, this.name, this.cityName);
  final String id;
  final String name;
  final String cityName;

  @override
  Map<String, String> toQuery() => {'zone': id};

  @override
  String get label => name;

  @override
  String get saved => 'zone:$id';

  @override
  bool operator ==(Object other) => other is AreaZone && other.id == id;

  @override
  int get hashCode => Object.hash('zone', id);
}

/// An [Area] a saved string names, if [me] still holds it; else null. A saved
/// zone or city the manager no longer has is ignored rather than trusted — the
/// server would refuse it anyway.
Area? areaFromSaved(String? saved, ManagerMe me) {
  if (saved == null) return null;
  if (saved.startsWith('zone:')) {
    final id = saved.substring(5);
    for (final z in me.zones.zones) {
      if (z.id == id) return AreaZone(z.id, z.name, z.cityName);
    }
  } else if (saved.startsWith('city:')) {
    final id = saved.substring(5);
    for (final c in me.zones.cities) {
      if (c.id == id) return AreaCity(c.id, c.name);
    }
  }
  return null;
}

class AreaNotifier extends Notifier<Area> {
  static const _key = 'manager-area';
  static const _legacyZoneKey = 'manager-zone';

  @override
  Area build() {
    // Signed out, or still loading who this is: "all". The manager profile
    // goes empty on sign-out and is rebuilt on the next sign-in, which starts
    // this over — one person's choice never carries to the next.
    final me = ref.watch(managerMeProvider).value;
    if (me == null) return const AreaScope();
    final prefs = ref.read(prefsProvider);
    final saved = prefs.getString(_key) ?? (prefs.getString(_legacyZoneKey) == null ? null : 'zone:${prefs.getString(_legacyZoneKey)}');
    return areaFromSaved(saved, me) ?? AreaScope(admin: me.zones.all);
  }

  void set(Area area) {
    state = area;
    final prefs = ref.read(prefsProvider);
    prefs.remove(_legacyZoneKey);
    if (area is AreaScope) {
      prefs.remove(_key);
    } else {
      prefs.setString(_key, area.saved);
    }
  }
}

final areaProvider = NotifierProvider<AreaNotifier, Area>(AreaNotifier.new);

/// The one zone every screen is filtered to, or null. This is a real zone —
/// the one to prefill when a screen creates something. A city is not a zone,
/// so a city choice reads as null here; use [areaFilterProvider] to read.
final activeZoneProvider = Provider<Zone?>((ref) {
  final area = ref.watch(areaProvider);
  final me = ref.watch(managerMeProvider).value;
  if (me == null || area is! AreaZone) return null;
  for (final z in me.zones.zones) {
    if (z.id == area.id) return z;
  }
  return null;
});

/// The prefix that carries a city through the code that passes "the zone
/// filter" around (filters, family keys, refetch triggers). The API client
/// turns `zone=city:<id>` into `city=<id>` just before the request is sent.
const cityFilterPrefix = 'city:';

/// What a list or figure is filtered to: the chosen zone, or the chosen city
/// as a [Zone] whose id is `city:<id>`, or null for everything. Screens that
/// only *read* use this; anything that creates something needs a real zone
/// and uses [activeZoneProvider].
final areaFilterProvider = Provider<Zone?>((ref) {
  final area = ref.watch(areaProvider);
  if (area is AreaCity) {
    return Zone(id: '$cityFilterPrefix${area.id}', name: area.name, slug: '', cityName: area.name);
  }
  return ref.watch(activeZoneProvider);
});

/// `zone=city:<id>` → `city=<id>`; everything else unchanged. The one place
/// the city token is understood.
Map<String, String> applyCityFilter(Map<String, String> query) {
  final zone = query['zone'];
  if (zone == null || !zone.startsWith(cityFilterPrefix)) return query;
  return {
    for (final e in query.entries)
      if (e.key != 'zone') e.key: e.value,
    'city': zone.substring(cityFilterPrefix.length),
  };
}
