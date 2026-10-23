import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../theme/app_theme.dart';

// The area picker replaced the zone picker (a city is a choice too). Screens
// that import this file for the chip or the filters keep working.
export '../state/area.dart' show Area, AreaCity, AreaScope, AreaZone, activeZoneProvider, areaFilterProvider, areaProvider;
export 'area_picker.dart';

/// Shown wherever data would be, for a manager with no zones assigned.
class NoZonesNotice extends ConsumerWidget {
  const NoZonesNotice({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.colors;
    return Container(
      key: const Key('no-zones'),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: c.dealSoft,
        borderRadius: BorderRadius.circular(radiusBlock),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.location_off_outlined, color: c.deal),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('No zones assigned',
                    style: TextStyle(fontWeight: FontWeight.w800, color: c.deal, fontSize: 15)),
                const SizedBox(height: 4),
                Text(
                  'You won\'t see any orders, riders or vendors until an admin assigns you a zone on Team.',
                  style: TextStyle(color: c.ink, fontSize: 13.5, height: 1.4),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
