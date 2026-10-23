import 'package:go_router/go_router.dart';

import '../router.dart' show rootNavigatorKey;
import 'insights/demand_screen.dart';
import 'insights/insights_hub_screen.dart';
import 'insights/riders_needed_screen.dart';

/// Insights (§17) — the routes under `/more/insights`, kept in their own list
/// so the router changes by one line. Each task of the phase adds its screens.
List<RouteBase> phase9Routes() => [
      GoRoute(
        path: 'insights',
        parentNavigatorKey: rootNavigatorKey,
        builder: (_, _) => const InsightsHubScreen(),
        routes: [
          GoRoute(path: 'demand', parentNavigatorKey: rootNavigatorKey, builder: (_, _) => const DemandScreen()),
          GoRoute(path: 'riders', parentNavigatorKey: rootNavigatorKey, builder: (_, _) => const RidersNeededScreen()),
        ],
      ),
    ];
