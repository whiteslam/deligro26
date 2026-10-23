import 'package:go_router/go_router.dart';

import '../router.dart' show rootNavigatorKey;
import 'insights/demand_screen.dart';
import 'insights/dispatch_screen.dart';
import 'insights/fraud_case_screen.dart';
import 'insights/fraud_rules_screen.dart';
import 'insights/fraud_screen.dart';
import 'insights/insights_hub_screen.dart';
import 'insights/accounting_screen.dart';
import 'insights/report_run_screen.dart';
import 'insights/riders_needed_screen.dart';
import 'insights/schedule_form_screen.dart';
import 'insights/schedule_runs_screen.dart';
import 'insights/schedules_screen.dart';
import 'insights/sla_screen.dart';
import 'insights/vendor_benchmarks_screen.dart';
import 'insights/zone_map_screen.dart';

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
          GoRoute(path: 'zones', parentNavigatorKey: rootNavigatorKey, builder: (_, _) => const ZoneMapScreen()),
          GoRoute(path: 'vendors', parentNavigatorKey: rootNavigatorKey, builder: (_, _) => const VendorBenchmarksScreen()),
          GoRoute(path: 'sla', parentNavigatorKey: rootNavigatorKey, builder: (_, _) => const SlaScreen()),
          GoRoute(path: 'accounting', parentNavigatorKey: rootNavigatorKey, builder: (_, _) => const AccountingScreen()),
          GoRoute(
            path: 'reports',
            parentNavigatorKey: rootNavigatorKey,
            builder: (_, _) => const SchedulesScreen(),
            routes: [
              // Fixed paths before ':id', or "new" and "runs" would read as a schedule.
              GoRoute(path: 'new', parentNavigatorKey: rootNavigatorKey, builder: (_, _) => const ScheduleFormScreen()),
              GoRoute(
                path: 'runs/:runId',
                parentNavigatorKey: rootNavigatorKey,
                builder: (_, state) => ReportRunScreen(runId: state.pathParameters['runId']!),
              ),
              GoRoute(
                path: ':id',
                parentNavigatorKey: rootNavigatorKey,
                builder: (_, state) => ScheduleFormScreen(scheduleId: state.pathParameters['id']),
                routes: [
                  GoRoute(
                    path: 'runs',
                    parentNavigatorKey: rootNavigatorKey,
                    builder: (_, state) => ScheduleRunsScreen(scheduleId: state.pathParameters['id']!),
                  ),
                ],
              ),
            ],
          ),
          GoRoute(path: 'dispatch', parentNavigatorKey: rootNavigatorKey, builder: (_, _) => const DispatchScreen()),
          GoRoute(
            path: 'fraud',
            parentNavigatorKey: rootNavigatorKey,
            builder: (_, _) => const FraudScreen(),
            routes: [
              // Before ':alertId', or "rules" would read as a case.
              GoRoute(path: 'rules', parentNavigatorKey: rootNavigatorKey, builder: (_, _) => const FraudRulesScreen()),
              GoRoute(
                path: ':alertId',
                parentNavigatorKey: rootNavigatorKey,
                builder: (_, state) => FraudCaseScreen(alertId: state.pathParameters['alertId']!),
              ),
            ],
          ),
        ],
      ),
    ];
