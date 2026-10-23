import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../core/api.dart';
import '../../core/entity_routes.dart';
import '../../core/errors.dart';
import '../../core/format.dart' show placedAt;
import '../../models/insights.dart';
import '../../models/outcome.dart';
import '../../state/insights.dart';
import '../../state/providers.dart';
import '../../state/session.dart';
import '../../theme/app_theme.dart';
import '../../widgets/async_view.dart';
import 'fraud_screen.dart';
import 'insight_widgets.dart';

/// Where a case's subject opens, if it has a screen.
String? subjectRoute(FraudSubject s) {
  if (s.id.isEmpty) return null;
  final id = Uri.encodeComponent(s.id);
  return switch (s.type) {
    FraudSubjectType.customer => '/more/customers/$id',
    FraudSubjectType.rider => '/more/riders/$id',
    FraudSubjectType.order => '/orders/$id',
    FraudSubjectType.code => '/more/offers/$id',
    FraudSubjectType.unknown => null,
  };
}

/// Where a line of evidence opens, if it has a screen.
String? evidenceRoute(FraudEvidence e) => switch (e.kind) {
      'order' => e.id.isEmpty ? null : routeForEntity('order', e.id),
      'cash_day' => routeForEntity('cash_day', e.id),
      'refund' => '/finance/refunds',
      _ => null,
    };

/// One fraud case: who or what, what was found against the limit, the lines
/// of evidence (never a phone number, address or device), and — while it is
/// open — a way to dismiss it as a false positive.
class FraudCaseScreen extends ConsumerWidget {
  const FraudCaseScreen({super.key, required this.alertId});
  final String alertId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.colors;
    final value = ref.watch(fraudCaseProvider(alertId));
    return Scaffold(
      backgroundColor: c.bg,
      appBar: AppBar(title: const Text('Fraud case')),
      body: AsyncView<FraudCase?>(
        value: value,
        onRetry: () => ref.invalidate(fraudCaseProvider(alertId)),
        builder: (item) => item == null
            ? EmptyLine("This case isn't in your areas, or it has been removed.")
            : RefreshIndicator(onRefresh: () => ref.refresh(fraudCaseProvider(alertId).future), child: _Body(item: item)),
      ),
    );
  }
}

class _Body extends ConsumerWidget {
  const _Body({required this.item});
  final FraudCase item;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.colors;
    final me = ref.watch(managerMeProvider).value;
    final canDismiss = item.status == FraudStatus.open || item.status == FraudStatus.acknowledged;
    final route = subjectRoute(item.subject);
    final d = item.dismissal;
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
      children: [
        Row(children: [
          Expanded(child: Text(fraudRuleLabel(item.rule), style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: c.ink))),
          SeverityPill(severity: item.severity),
        ]),
        if (item.openedAt != null)
          Padding(
            padding: const EdgeInsets.only(top: 4, bottom: 12),
            child: Text('Found ${placedAt(item.openedAt)}${item.status == FraudStatus.resolved ? ' · resolved' : ''}',
                style: TextStyle(fontSize: 12.5, color: c.muted)),
          ),
        InsightCard(
          title: 'Who or what',
          child: InkWell(
            onTap: route == null ? null : () => GoRouter.maybeOf(context)?.push(route),
            child: Row(children: [
              Expanded(child: Text(item.subject.label, style: TextStyle(fontSize: 14.5, color: c.ink))),
              if (route != null) Icon(Icons.chevron_right, color: c.muted),
            ]),
          ),
        ),
        InsightCard(
          title: 'What was found',
          child: Text(measureWords(item.measure), style: TextStyle(fontSize: 14.5, color: c.ink)),
        ),
        InsightCard(
          title: 'Evidence',
          subtitle: 'Only what the rule used. No phone numbers, addresses or devices.',
          child: item.evidence.isEmpty
              ? Text('No lines of evidence were kept.', style: TextStyle(color: c.muted))
              : Column(children: [
                  for (final e in item.evidence)
                    ListTile(
                      key: Key('evidence-${e.kind}-${e.id}'),
                      contentPadding: EdgeInsets.zero,
                      dense: true,
                      title: Text(e.text, style: TextStyle(fontSize: 13.5, color: c.ink)),
                      subtitle: e.at == null ? null : Text(placedAt(e.at), style: TextStyle(fontSize: 12, color: c.muted)),
                      trailing: evidenceRoute(e) == null ? null : Icon(Icons.chevron_right, color: c.muted),
                      onTap: evidenceRoute(e) == null ? null : () => GoRouter.maybeOf(context)?.push(evidenceRoute(e)!),
                    ),
                ]),
        ),
        if (d != null)
          InsightBanner(
            key: const Key('dismissal'),
            warning: false,
            icon: Icons.check_circle_outline,
            text: 'Dismissed${d.by == null ? '' : ' by ${d.by!.name}'}: ${d.reason}'
                '${d.until == null ? '' : '. It stays quiet until ${DateFormat('d MMM y').format(d.until!.toLocal())}, unless it gets much worse.'}',
          ),
        if (canDismiss && me != null)
          FilledButton.tonalIcon(
            key: const Key('dismiss-case'),
            onPressed: () => showDismissSheet(context, item),
            icon: const Icon(Icons.flag_outlined),
            label: const Text('Dismiss as a false positive'),
          ),
      ],
    );
  }
}

Future<void> showDismissSheet(BuildContext context, FraudCase item) => showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (_) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
        child: _DismissSheet(item: item),
      ),
    );

class _DismissSheet extends ConsumerStatefulWidget {
  const _DismissSheet({required this.item});
  final FraudCase item;

  @override
  ConsumerState<_DismissSheet> createState() => _DismissSheetState();
}

class _DismissSheetState extends ConsumerState<_DismissSheet> {
  final _reason = TextEditingController();
  int _days = 30;
  bool _busy = false;
  String? _reasonError;
  String? _error;

  /// The last attempt, and whether it ended in a fault (the connection
  /// dropped) rather than an answer. A fault is retried as the same action.
  FraudDismissDraft? _draft;
  bool _lastWasFault = false;

  @override
  void dispose() {
    _reason.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final reason = _reason.text.trim();
    if (reason.length < 3) {
      setState(() => _reasonError = 'Say why, in at least 3 characters');
      return;
    }
    final prev = _draft;
    final same = prev != null && _lastWasFault && prev.reason == reason && prev.days == _days;
    final draft = same ? prev : FraudDismissDraft(alertId: widget.item.alertId, reason: reason, days: _days);
    _draft = draft;
    setState(() {
      _busy = true;
      _reasonError = null;
      _error = null;
    });
    try {
      final out = await ref.read(insightsRepoProvider).dismissFraud(draft);
      if (!mounted) return;
      switch (out) {
        case Applied<FraudCase>():
          ref.invalidate(fraudListProvider);
          ref.invalidate(fraudCaseProvider(widget.item.alertId));
          Navigator.of(context).pop();
          showSnack(context, 'Dismissed for $_days days.');
        case Refused<FraudCase>(:final code):
          _lastWasFault = false;
          setState(() {
            _busy = false;
            _error = friendlyError(code);
          });
      }
    } on ApiException catch (e) {
      if (!mounted) return;
      if (e.unauthorized) await handleUnauthorized(ref, e);
      _lastWasFault = true;
      setState(() {
        _busy = false;
        _error = e.friendly;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return SafeArea(
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Dismiss as a false positive', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: c.ink)),
          const SizedBox(height: 4),
          Text(
            'This case closes and the rule stays quiet about it for the time you choose, unless it gets much worse. The reason is recorded.',
            style: TextStyle(fontSize: 13, color: c.muted, height: 1.35),
          ),
          const SizedBox(height: 14),
          Text('Stay quiet for', style: TextStyle(fontWeight: FontWeight.w700, color: c.ink)),
          const SizedBox(height: 6),
          Wrap(spacing: 8, children: [
            for (final d in const [7, 30, 90])
              ChoiceChip(
                key: Key('dismiss-days-$d'),
                label: Text('$d days'),
                selected: _days == d,
                onSelected: _busy ? null : (_) => setState(() => _days = d),
              ),
          ]),
          const SizedBox(height: 12),
          TextField(
            key: const Key('dismiss-reason'),
            controller: _reason,
            enabled: !_busy,
            maxLength: 300,
            decoration: InputDecoration(labelText: 'Why is it a false positive?', errorText: _reasonError),
          ),
          if (_error != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Text(_error!, key: const Key('dismiss-error'), style: TextStyle(color: c.deal, fontWeight: FontWeight.w600)),
            ),
          Align(
            alignment: Alignment.centerRight,
            child: FilledButton(
              key: const Key('dismiss-save'),
              onPressed: _busy ? null : _save,
              child: _busy ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2)) : const Text('Dismiss'),
            ),
          ),
        ]),
      ),
    );
  }
}
