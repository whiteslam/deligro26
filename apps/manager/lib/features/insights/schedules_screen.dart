import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api.dart';
import '../../core/errors.dart';
import '../../models/insights.dart';
import '../../models/outcome.dart';
import '../../state/insights.dart';
import '../../state/providers.dart';
import '../../state/session.dart';
import '../../theme/app_theme.dart';
import '../../widgets/async_view.dart';
import 'schedule_words.dart';

/// Scheduled reports (§17.7): a report built on a schedule and sent to chosen
/// people as a notification. The PDF is fetched when they open it, so what they
/// can see is checked again at that moment.
class SchedulesScreen extends ConsumerWidget {
  const SchedulesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.colors;
    final value = ref.watch(schedulesProvider);
    final canMake = value.value?.kinds.isNotEmpty ?? false;
    return Scaffold(
      backgroundColor: c.bg,
      appBar: AppBar(
        title: const Text('Scheduled reports'),
        actions: [
          if (canMake)
            IconButton(
              key: const Key('new-schedule'),
              tooltip: 'New schedule',
              icon: const Icon(Icons.add),
              onPressed: () => GoRouter.maybeOf(context)?.push('/more/insights/reports/new'),
            ),
        ],
      ),
      body: AsyncView<ScheduleList>(
        value: value,
        onRetry: () => ref.invalidate(schedulesProvider),
        builder: (list) => RefreshIndicator(
          onRefresh: () => ref.refresh(schedulesProvider.future),
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
            children: [
              if (list.items.isEmpty)
                EmptyLine(canMake
                    ? 'No scheduled reports yet. Tap + to make one.'
                    : 'No scheduled reports. You can only schedule reports you are allowed to run.'),
              for (final s in list.items) _ScheduleCard(schedule: s, kinds: list.kinds),
            ],
          ),
        ),
      ),
    );
  }
}

class _ScheduleCard extends ConsumerStatefulWidget {
  const _ScheduleCard({required this.schedule, required this.kinds});
  final Schedule schedule;
  final List<ScheduleKind> kinds;

  @override
  ConsumerState<_ScheduleCard> createState() => _ScheduleCardState();
}

class _ScheduleCardState extends ConsumerState<_ScheduleCard> {
  bool _busy = false;

  Schedule get s => widget.schedule;

  String get _kindLabel {
    for (final k in widget.kinds) {
      if (k.kind == s.kind) return k.label;
    }
    return s.kind;
  }

  Future<void> _run(Future<Outcome<Object?>> Function() call, {String? done}) async {
    setState(() => _busy = true);
    try {
      final out = await call();
      if (!mounted) return;
      switch (out) {
        case Applied<Object?>():
          ref.invalidate(schedulesProvider);
          if (done != null) showSnack(context, done);
        case Refused<Object?>(:final code):
          showSnack(context, friendlyError(code));
      }
    } on ApiException catch (e) {
      if (!mounted) return;
      if (e.unauthorized) await handleUnauthorized(ref, e);
      if (!mounted) return;
      showSnack(context, e.friendly);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _delete() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (d) => AlertDialog(
        title: const Text('Delete this schedule?'),
        content: Text('"${s.name}" will stop being sent. Reports already sent are kept.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(d, false), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(d, true), child: const Text('Delete')),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    await _run(() => ref.read(insightsRepoProvider).deleteSchedule(s.id), done: 'Schedule deleted.');
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final me = ref.watch(managerMeProvider).value;
    final mine = me != null && (me.isAdmin || s.owner?.id == me.profile.id);
    final last = s.lastRun;
    final next = s.nextRunAt;
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Material(
        key: Key('schedule-${s.id}'),
        color: c.surface,
        clipBehavior: Clip.antiAlias,
        shape: RoundedRectangleBorder(side: BorderSide(color: c.line), borderRadius: BorderRadius.circular(radiusBlock)),
        child: InkWell(
          onTap: () => GoRouter.maybeOf(context)?.push('/more/insights/reports/${s.id}'),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(14, 12, 8, 8),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Expanded(child: Text(s.name, style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: c.ink))),
                Switch(
                  key: Key('pause-${s.id}'),
                  value: s.active,
                  onChanged: _busy ? null : (v) => _run(() => ref.read(insightsRepoProvider).updateSchedule(s.id, ScheduleDraft.from(s, active: v))),
                ),
              ]),
              Text(_kindLabel, style: TextStyle(fontSize: 13, color: c.muted)),
              const SizedBox(height: 6),
              Text(cadenceWords(s), style: TextStyle(fontSize: 13.5, color: c.ink)),
              Text('Period: ${presetWords(s.rangePreset)}', style: TextStyle(fontSize: 12.5, color: c.muted)),
              Text('${s.recipients.length} ${s.recipients.length == 1 ? 'person' : 'people'}', style: TextStyle(fontSize: 12.5, color: c.muted)),
              const SizedBox(height: 6),
              Wrap(spacing: 8, runSpacing: 4, crossAxisAlignment: WrapCrossAlignment.center, children: [
                if (!s.active)
                  Text('Paused', style: TextStyle(fontWeight: FontWeight.w700, color: c.muted))
                else if (next != null)
                  Text('Next: ${istStamp(next)}', style: TextStyle(fontSize: 12.5, color: c.muted)),
                if (last != null)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: last.status == RunStatus.sent ? c.greenSoft : c.dealSoft,
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Text(runStatusWords(last.status),
                        style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800, color: last.status == RunStatus.sent ? c.green : c.deal)),
                  ),
              ]),
              Row(children: [
                TextButton(
                  key: Key('run-now-${s.id}'),
                  onPressed: _busy
                      ? null
                      : () async {
                          setState(() => _busy = true);
                          try {
                            final out = await ref.read(insightsRepoProvider).runNow(s.id);
                            if (!context.mounted) return;
                            switch (out) {
                              case Applied<String>(:final value):
                                showSnack(context, 'The report is on its way. You will get a notification when it is ready.');
                                ref.invalidate(schedulesProvider);
                                if (value != null) GoRouter.maybeOf(context)?.push('/more/insights/reports/runs/$value');
                              case Refused<String>(:final code):
                                showSnack(context, friendlyError(code));
                            }
                          } on ApiException catch (e) {
                            if (context.mounted) showSnack(context, e.friendly);
                          } finally {
                            if (mounted) setState(() => _busy = false);
                          }
                        },
                  child: const Text('Run now'),
                ),
                TextButton(
                  key: Key('history-${s.id}'),
                  onPressed: () => GoRouter.maybeOf(context)?.push('/more/insights/reports/${s.id}/runs'),
                  child: const Text('History'),
                ),
                const Spacer(),
                if (mine)
                  IconButton(
                    key: Key('delete-${s.id}'),
                    tooltip: 'Delete schedule',
                    icon: Icon(Icons.delete_outline, color: c.muted),
                    onPressed: _busy ? null : _delete,
                  ),
              ]),
            ]),
          ),
        ),
      ),
    );
  }
}
