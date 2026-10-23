import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/format.dart' show placedAt, rupees;
import '../../models/insights.dart';
import '../../state/insights.dart';
import '../../theme/app_theme.dart';
import '../../widgets/async_view.dart';
import '../../widgets/zone_picker.dart';
import 'insight_format.dart';

/// What each rule looks for, in a few words.
String fraudRuleLabel(FraudRule r) => switch (r) {
      FraudRule.customerCancellations => 'Customer cancellations',
      FraudRule.codeSharing => 'Shared promo codes',
      FraudRule.refundRate => 'High refund rate',
      FraudRule.riderCashGap => 'Rider cash gap',
      FraudRule.unusualOrderValue => 'Unusual order value',
      FraudRule.unknown => 'Unusual activity',
    };

String _days(int n) => n == 1 ? '1 day' : '$n days';

/// "4 in 7 days (limit 3)", "62% in 30 days (limit 30%)",
/// "₹3,400 over 2 days (limit ₹2,000)", "3.4× the usual in 30 days (limit 3×)".
String measureWords(FraudMeasure m) {
  final d = _days(m.windowDays);
  return switch (m.unit) {
    MeasureUnit.count => '${plain(m.value)} in $d (limit ${plain(m.threshold)})',
    MeasureUnit.ratio => '${percentWord(m.value)} in $d (limit ${percentWord(m.threshold)})',
    MeasureUnit.rupees => '${rupees(m.value)} over $d (limit ${rupees(m.threshold)})',
    MeasureUnit.multiple => '${plain(double.parse(m.value.toStringAsFixed(1)))}× the usual in $d (limit ${plain(m.threshold)}×)',
  };
}

/// "3 in 7 days", "30% in 30 days", "₹2,000 over 2 days", "3× the usual in 30 days":
/// a rule's limit without a measured value.
String limitWords(MeasureUnit unit, double threshold, int windowDays) {
  final d = _days(windowDays);
  return switch (unit) {
    MeasureUnit.count => '${plain(threshold)} in $d',
    MeasureUnit.ratio => '${percentWord(threshold)} in $d',
    MeasureUnit.rupees => '${rupees(threshold)} over $d',
    MeasureUnit.multiple => '${plain(threshold)}× the usual in $d',
  };
}

String _statusPlural(FraudStatus s) => switch (s) {
      FraudStatus.open || FraudStatus.acknowledged => 'open',
      FraudStatus.dismissed => 'dismissed',
      FraudStatus.resolved => 'resolved',
    };

/// Fraud cases (§17.6): five rules watch cancellations, shared codes, refunds,
/// rider cash and unusually large orders. A case is a person or thing the rules
/// flagged — nothing is blocked automatically.
class FraudScreen extends ConsumerStatefulWidget {
  const FraudScreen({super.key});

  @override
  ConsumerState<FraudScreen> createState() => _FraudScreenState();
}

class _FraudScreenState extends ConsumerState<FraudScreen> {
  FraudStatus _status = FraudStatus.open;
  bool _loadingMore = false;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final value = ref.watch(fraudListProvider(_status));
    final counts = value.value?.counts;
    String label(String word, int? n) => n == null ? word : '$word $n';
    return Scaffold(
      backgroundColor: c.bg,
      appBar: AppBar(
        title: const Text('Fraud cases'),
        actions: [
          IconButton(
            key: const Key('fraud-rules-link'),
            tooltip: 'Fraud rules',
            icon: const Icon(Icons.tune_outlined),
            onPressed: () => GoRouter.maybeOf(context)?.push('/more/insights/fraud/rules'),
          ),
          const Padding(padding: EdgeInsets.only(right: 12), child: AreaPickerChip()),
        ],
      ),
      body: Column(children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
          child: Align(
            alignment: Alignment.centerLeft,
            child: Wrap(spacing: 8, runSpacing: 8, children: [
              ChoiceChip(
                key: const Key('fraud-tab-open'),
                label: Text(label('Open', counts?.open)),
                selected: _status == FraudStatus.open,
                onSelected: (_) => setState(() => _status = FraudStatus.open),
              ),
              ChoiceChip(
                key: const Key('fraud-tab-dismissed'),
                label: Text(label('Dismissed', counts?.dismissed)),
                selected: _status == FraudStatus.dismissed,
                onSelected: (_) => setState(() => _status = FraudStatus.dismissed),
              ),
              ChoiceChip(
                key: const Key('fraud-tab-resolved'),
                label: Text(label('Resolved', counts?.resolved)),
                selected: _status == FraudStatus.resolved,
                onSelected: (_) => setState(() => _status = FraudStatus.resolved),
              ),
            ]),
          ),
        ),
        Expanded(
          child: AsyncView<FraudPage>(
            value: value,
            onRetry: () => ref.invalidate(fraudListProvider(_status)),
            builder: (p) => RefreshIndicator(
              onRefresh: () => ref.refresh(fraudListProvider(_status).future),
              child: ListView(
                padding: const EdgeInsets.fromLTRB(16, 4, 16, 32),
                children: [
                  if (p.items.isEmpty) EmptyLine('No ${_statusPlural(_status)} cases${_status == FraudStatus.open ? ' right now' : ''}.'),
                  for (final item in p.items) FraudCaseCard(item: item),
                  if (p.nextCursor != null)
                    OutlinedButton(
                      key: const Key('fraud-load-more'),
                      onPressed: _loadingMore
                          ? null
                          : () async {
                              setState(() => _loadingMore = true);
                              try {
                                await ref.read(fraudListProvider(_status).notifier).loadMore();
                              } catch (_) {
                                if (context.mounted) showSnack(context, 'Could not load more. Try again.');
                              } finally {
                                if (mounted) setState(() => _loadingMore = false);
                              }
                            },
                      child: Text(_loadingMore ? 'Loading…' : 'Load more'),
                    ),
                ],
              ),
            ),
          ),
        ),
      ]),
    );
  }
}

/// A severity in a word and a colour.
class SeverityPill extends StatelessWidget {
  const SeverityPill({super.key, required this.severity});
  final FraudSeverity severity;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final critical = severity == FraudSeverity.critical;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(color: critical ? c.dealSoft : c.accentSoft, borderRadius: BorderRadius.circular(999)),
      child: Text(critical ? 'Critical' : 'Warning',
          style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800, color: critical ? c.deal : c.accentInk)),
    );
  }
}

class FraudCaseCard extends StatelessWidget {
  const FraudCaseCard({super.key, required this.item});
  final FraudCase item;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final d = item.dismissal;
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Material(
        key: Key('fraud-case-${item.alertId}'),
        color: c.surface,
        clipBehavior: Clip.antiAlias,
        shape: RoundedRectangleBorder(side: BorderSide(color: c.line), borderRadius: BorderRadius.circular(radiusBlock)),
        child: InkWell(
          onTap: () => GoRouter.maybeOf(context)?.push('/more/insights/fraud/${item.alertId}'),
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Expanded(child: Text(fraudRuleLabel(item.rule), style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: c.ink))),
                SeverityPill(severity: item.severity),
              ]),
              const SizedBox(height: 4),
              Text(item.subject.label, style: TextStyle(fontSize: 13.5, color: c.ink)),
              const SizedBox(height: 2),
              Text(measureWords(item.measure), style: TextStyle(fontSize: 12.5, color: c.muted)),
              if (item.openedAt != null) Text('Found ${placedAt(item.openedAt)}', style: TextStyle(fontSize: 12, color: c.muted)),
              if (d != null && item.status == FraudStatus.dismissed)
                Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Text('Dismissed: ${d.reason}', style: TextStyle(fontSize: 12.5, color: c.muted)),
                ),
            ]),
          ),
        ),
      ),
    );
  }
}
