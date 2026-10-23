import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api.dart';
import '../../core/format.dart' show count, placedAt;
import '../../models/insights.dart';
import '../../state/insight_files.dart';
import '../../state/insights.dart';
import '../../state/providers.dart';
import '../../state/session.dart';
import '../../theme/app_theme.dart';
import '../../widgets/async_view.dart';
import 'insight_widgets.dart';
import 'schedule_runs_screen.dart' show StatusPill, periodWords;
import 'schedule_words.dart';

/// One run of a scheduled report: what it covered, how it went, who got it, and
/// the PDF. The file is never kept: each tap asks for a fresh five-minute link,
/// which the server only gives to someone who may still read this report.
class ReportRunScreen extends ConsumerStatefulWidget {
  const ReportRunScreen({super.key, required this.runId});
  final String runId;

  @override
  ConsumerState<ReportRunScreen> createState() => _ReportRunScreenState();
}

class _ReportRunScreenState extends ConsumerState<ReportRunScreen> {
  bool _busy = false;
  String? _error;

  Future<void> _open(ReportRun run) async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final link = await ref.read(insightsRepoProvider).downloadUrl(widget.runId);
      final bytes = await ref.read(urlDownloaderProvider)(link.url);
      final name = 'deligro-${run.kind ?? 'report'}-${run.periodFrom}-to-${run.periodTo}.pdf';
      await ref.read(fileSharerProvider)(bytes, name, 'application/pdf');
      if (mounted) setState(() => _busy = false);
    } on ApiException catch (e) {
      if (!mounted) return;
      if (e.unauthorized) await handleUnauthorized(ref, e);
      setState(() {
        _busy = false;
        _error = switch (e.status) {
          410 => 'This file has been removed (reports are kept for 90 days).',
          403 => "You can no longer open this report. Ask an admin if that's a mistake.",
          _ => e.friendly,
        };
      });
    } catch (_) {
      if (mounted) {
        setState(() {
          _busy = false;
          _error = 'Could not open the file. Try again.';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final value = ref.watch(runDetailProvider(widget.runId));
    return Scaffold(
      backgroundColor: c.bg,
      appBar: AppBar(title: const Text('Report')),
      body: AsyncView<ReportRun>(
        value: value,
        onRetry: () => ref.invalidate(runDetailProvider(widget.runId)),
        builder: (run) => ListView(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
          children: [
            Row(children: [
              Expanded(child: Text(run.scheduleName ?? 'Report', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: c.ink))),
              StatusPill(status: run.status),
            ]),
            const SizedBox(height: 4),
            Text('${periodWords(run)} · ${count(run.rows)} rows · made ${placedAt(run.createdAt)}', style: TextStyle(fontSize: 12.5, color: c.muted)),
            const SizedBox(height: 14),
            if (run.status == RunStatus.tooLarge)
              InsightBanner(
                text: 'This report was too big to send (${count(run.rows)} rows). Change the schedule to a shorter period or add filters to narrow it, then run it again.',
              )
            else if (run.status == RunStatus.failed)
              const InsightBanner(text: 'This report could not be built. Run it again, or ask an admin if it keeps failing.')
            else
              FilledButton.icon(
                key: const Key('open-pdf'),
                onPressed: _busy ? null : () => _open(run),
                icon: _busy ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.picture_as_pdf_outlined),
                label: const Text('Open the PDF'),
              ),
            if (_error != null)
              Padding(
                padding: const EdgeInsets.only(top: 10),
                child: Text(_error!, key: const Key('pdf-error'), style: TextStyle(color: c.deal, fontWeight: FontWeight.w600)),
              ),
            const SizedBox(height: 16),
            InsightCard(
              title: 'Who got it',
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(
                  run.recipientsSent == 0 ? 'Nobody yet.' : 'Sent to ${run.recipientsSent} ${run.recipientsSent == 1 ? 'person' : 'people'}.',
                  style: TextStyle(color: c.ink),
                ),
                for (final s in run.recipientsSkipped)
                  Padding(
                    padding: const EdgeInsets.only(top: 6),
                    child: Text('${s.name} was skipped: ${skipReasonWords(s.reason)}.', style: TextStyle(fontSize: 13, color: c.deal)),
                  ),
              ]),
            ),
          ],
        ),
      ),
    );
  }
}
