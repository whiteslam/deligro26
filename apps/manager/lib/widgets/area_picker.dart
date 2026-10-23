import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/manager_me.dart';
import '../state/area.dart';
import '../state/session.dart';
import '../theme/app_theme.dart';

/// "All my zones ▾" — opens a sheet of this manager's cities and zones. The
/// choice is shared by every tab: pick Bemetara on Home and Orders, Finance
/// and the Insights screens are Bemetara too.
class AreaPickerChip extends ConsumerWidget {
  const AreaPickerChip({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final me = ref.watch(managerMeProvider).value;
    final area = ref.watch(areaProvider);
    final c = context.colors;
    if (me == null || me.hasNoZones) return const SizedBox.shrink();
    return Semantics(
      button: true,
      label: 'Area: ${area.label}',
      child: InkWell(
        key: const Key('zone-picker'),
        borderRadius: BorderRadius.circular(999),
        onTap: () => showAreaSheet(context, ref, me),
        child: Container(
          constraints: const BoxConstraints(minHeight: 36),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: c.surface,
            border: Border.all(color: c.line),
            borderRadius: BorderRadius.circular(999),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(area is AreaCity ? Icons.location_city_outlined : Icons.place_outlined, size: 16, color: c.accent),
              const SizedBox(width: 6),
              Flexible(
                child: Text(area.label,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: c.ink)),
              ),
              Icon(Icons.expand_more, size: 18, color: c.muted),
            ],
          ),
        ),
      ),
    );
  }
}

/// The rows of the sheet, in order: "All my zones", then each city by name
/// with "All of `City`" (only when it has more than one zone) and its zones.
/// A city with a single zone shows just the zone — two rows would mean the
/// same thing.
List<Area> areaChoices(ManagerMe me) {
  final cities = [...me.zones.cities]..sort((a, b) => a.name.toLowerCase().compareTo(b.name.toLowerCase()));
  return [
    AreaScope(admin: me.zones.all),
    for (final city in cities) ...[
      if (city.zones.length > 1) AreaCity(city.id, city.name),
      for (final z in city.zones) AreaZone(z.id, z.name, city.name),
    ],
  ];
}

void showAreaSheet(BuildContext context, WidgetRef ref, ManagerMe me) {
  showModalBottomSheet<void>(
    context: context,
    showDragHandle: true,
    isScrollControlled: true,
    builder: (sheet) {
      final current = ref.read(areaProvider);
      void pick(Area a) {
        ref.read(areaProvider.notifier).set(a);
        Navigator.pop(sheet);
      }

      String? lastCity;
      final rows = <Widget>[];
      for (final a in areaChoices(me)) {
        if (a is AreaScope) {
          rows.add(ListTile(
            key: const Key('area-scope'),
            leading: const Icon(Icons.layers_outlined),
            title: Text(a.label),
            trailing: current == a ? const Icon(Icons.check) : null,
            onTap: () => pick(a),
          ));
          continue;
        }
        final city = a is AreaCity ? a.name : (a as AreaZone).cityName;
        if (city != lastCity) {
          lastCity = city;
          rows.add(Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
            child: Text(city.toUpperCase(),
                style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, letterSpacing: 0.6, color: context.colors.muted)),
          ));
        }
        rows.add(ListTile(
          key: Key(a is AreaCity ? 'area-city-${a.id}' : 'area-zone-${(a as AreaZone).id}'),
          leading: Icon(a is AreaCity ? Icons.location_city_outlined : Icons.place_outlined),
          title: Text(a is AreaCity ? 'All of ${a.name}' : (a as AreaZone).name),
          trailing: current == a ? const Icon(Icons.check) : null,
          onTap: () => pick(a),
        ));
      }
      return SafeArea(child: ListView(shrinkWrap: true, children: rows));
    },
  );
}
