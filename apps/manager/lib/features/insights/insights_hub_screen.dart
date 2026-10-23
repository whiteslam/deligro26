import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../models/manager_me.dart';
import '../../state/session.dart';
import '../../theme/app_theme.dart';

/// One tile of the Insights hub.
class InsightEntry {
  const InsightEntry(this.id, this.title, this.subtitle, this.icon, this.path, this.allowed);
  final String id;
  final String title;
  final String subtitle;
  final IconData icon;
  final String path;

  /// Whether this manager may open it. Tiles that are off are not drawn.
  final bool Function(ManagerMe me) allowed;
}

bool _insights(ManagerMe me) => me.isAdmin || me.can('manager.insights.view');

/// Everything in Insights, in the order of the hub. Fraud also needs the
/// customers permission, scheduled reports the reports one, and the accounting
/// export both its own switch and Finance.
final insightEntries = <InsightEntry>[
  InsightEntry('demand', 'Demand forecast', 'Orders expected hour by hour for the next 7 days', Icons.show_chart_rounded,
      '/more/insights/demand', _insights),
  InsightEntry('riders', 'Riders needed', 'How many riders each hour needs, against who is usually online', Icons.two_wheeler_outlined,
      '/more/insights/riders', _insights),
  InsightEntry('zones', 'Zone map', 'Where deliveries go, how long they take, and what to change', Icons.map_outlined,
      '/more/insights/zones', _insights),
  InsightEntry('vendors', 'Vendor benchmarks', 'Each vendor against the middle of its zone', Icons.leaderboard_outlined,
      '/more/insights/vendors', _insights),
  InsightEntry('sla', 'Service levels', 'How often accepting, preparing, pickup and delivery run late', Icons.timer_outlined,
      '/more/insights/sla', _insights),
  InsightEntry('dispatch', 'Dispatch mode', 'Offer orders to riders, or assign them automatically', Icons.alt_route_outlined,
      '/more/insights/dispatch', _insights),
  InsightEntry('fraud', 'Fraud cases', 'Unusual cancellations, refunds, codes and cash', Icons.shield_outlined,
      '/more/insights/fraud', (me) => _insights(me) && (me.isAdmin || me.can('manager.customers.view'))),
  InsightEntry('reports', 'Scheduled reports', 'Reports sent to you on a schedule', Icons.schedule_send_outlined,
      '/more/insights/reports', (me) => me.isAdmin || me.can('manager.reports.view')),
  InsightEntry('accounting', 'Accounting export', 'Tally and journal files that match Finance', Icons.receipt_long_outlined,
      '/more/insights/accounting', (me) => me.isAdmin || (me.can('manager.accounting.export') && me.can('manager.finance.view'))),
];

/// Insights (§17): the ten ways to look ahead and look sideways.
class InsightsHubScreen extends ConsumerWidget {
  const InsightsHubScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final me = ref.watch(managerMeProvider).value;
    final c = context.colors;
    final entries = me == null ? const <InsightEntry>[] : [for (final e in insightEntries) if (e.allowed(me)) e];
    return Scaffold(
      backgroundColor: c.bg,
      appBar: AppBar(title: const Text('Insights')),
      body: me == null
          ? const Center(child: CircularProgressIndicator())
          : ListView.separated(
              padding: const EdgeInsets.symmetric(vertical: 8),
              itemCount: entries.length,
              separatorBuilder: (_, _) => Divider(height: 1, indent: 72, color: c.line),
              itemBuilder: (context, i) {
                final e = entries[i];
                return ListTile(
                  key: Key('insight-${e.id}'),
                  minTileHeight: 68,
                  leading: Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(color: c.accentSoft, borderRadius: BorderRadius.circular(12)),
                    child: Icon(e.icon, color: c.accentInk, size: 22),
                  ),
                  title: Text(e.title, style: TextStyle(fontWeight: FontWeight.w700, color: c.ink)),
                  subtitle: Text(e.subtitle, style: TextStyle(fontSize: 12.5, color: c.muted)),
                  trailing: Icon(Icons.chevron_right, color: c.muted),
                  onTap: () => context.push(e.path),
                );
              },
            ),
    );
  }
}
