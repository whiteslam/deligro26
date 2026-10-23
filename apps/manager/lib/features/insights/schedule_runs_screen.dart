import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/format.dart' show count, placedAt;
import '../../models/insights.dart';
import '../../state/insights.dart';
import '../../theme/app_theme.dart';
import '../../widgets/async_view.dart';
import 'insight_format.dart';
import 'schedule_words.dart';

/// "21 Oct" or "20 – 21 Oct".
String periodWords(ReportRun r) => rangeWords(r.periodFrom, r.periodTo);

class StatusPill extends StatelessWidget {
  const StatusPill({super.key, required this.status});
  final RunStatus status;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final good = status == RunStatus.sent;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(color: good ? c.greenSoft : c.dealSoft, borderRadius: BorderRadius.circular(999)),
      child: Text(runStatusWords(status), style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800, color: good ? c.green : c.deal)),
    );
  }
}

/// Every run of one schedule, newest first.
class ScheduleRunsScreen extends ConsumerStatefulWidget {
  const ScheduleRunsScreen({super.key, required this.scheduleId});
  final String scheduleId;

  @override
  ConsumerState<ScheduleRunsScreen> createState() => _ScheduleRunsScreenState();
}

class _ScheduleRunsScreenState extends ConsumerState<ScheduleRunsScreen> {
  bool _loadingMore = false;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final value = ref.watch(runsProvider(widget.scheduleId));
    return Scaffold(
      backgroundColor: c.bg,
      appBar: AppBar(title: const Text('Report history')),
      body: AsyncView<RunPage>(
        value: value,
        onRetry: () => ref.invalidate(runsProvider(widget.scheduleId)),
        builder: (p) => RefreshIndicator(
          onRefresh: () => ref.refresh(runsProvider(widget.scheduleId).future),
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
            children: [
              if (p.items.isEmpty) EmptyLine('Nothing has been sent yet.'),
              for (final r in p.items) _RunRow(run: r),
              if (p.nextCursor != null)
                OutlinedButton(
                  key: const Key('runs-load-more'),
                  onPressed: _loadingMore
                      ? null
                      : () async {
                          setState(() => _loadingMore = true);
                          try {
                            await ref.read(runsProvider(widget.scheduleId).notifier).loadMore();
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
    );
  }
}

class _RunRow extends StatelessWidget {
  const _RunRow({required this.run});
  final ReportRun run;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Material(
        key: Key('run-${run.id}'),
        color: c.surface,
        clipBehavior: Clip.antiAlias,
        shape: RoundedRectangleBorder(side: BorderSide(color: c.line), borderRadius: BorderRadius.circular(radiusBlock)),
        child: InkWell(
          onTap: () => GoRouter.maybeOf(context)?.push('/more/insights/reports/runs/${run.id}'),
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Expanded(child: Text(periodWords(run), style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: c.ink))),
                StatusPill(status: run.status),
              ]),
              const SizedBox(height: 4),
              Text(
                '${count(run.rows)} rows · sent to ${run.recipientsSent} · made ${placedAt(run.createdAt)}',
                style: TextStyle(fontSize: 12.5, color: c.muted),
              ),
              for (final s in run.recipientsSkipped)
                Padding(
                  padding: const EdgeInsets.only(top: 2),
                  child: Text('${s.name} ${skipReasonWords(s.reason)}', style: TextStyle(fontSize: 12.5, color: c.deal)),
                ),
            ]),
          ),
        ),
      ),
    );
  }
}
