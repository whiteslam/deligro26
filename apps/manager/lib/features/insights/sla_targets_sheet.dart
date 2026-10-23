import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api.dart';
import '../../core/errors.dart';
import '../../models/insights.dart';
import '../../models/manager_me.dart';
import '../../models/outcome.dart';
import '../../state/area.dart';
import '../../state/insights.dart';
import '../../state/providers.dart';
import '../../state/session.dart';
import '../../theme/app_theme.dart';
import 'sla_screen.dart';

/// Opens the sheet that changes a zone's stage targets.
Future<void> showSlaTargetsSheet(BuildContext context, SlaReport report) => showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (_) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
        child: SlaTargetsSheet(report: report),
      ),
    );

/// Service-level targets for one zone — or the platform default, for an admin.
/// Each field has the server's bounds, and a change needs a reason.
class SlaTargetsSheet extends ConsumerStatefulWidget {
  const SlaTargetsSheet({super.key, required this.report});
  final SlaReport report;

  @override
  ConsumerState<SlaTargetsSheet> createState() => _SlaTargetsSheetState();
}

class _SlaTargetsSheetState extends ConsumerState<SlaTargetsSheet> {
  static const _fields = {
    SlaStage.accept: 'sla-accept',
    SlaStage.prep: 'sla-prep',
    SlaStage.pickup: 'sla-pickup',
    SlaStage.deliver: 'sla-deliver',
  };

  final _controllers = {for (final s in SlaStage.values) s: TextEditingController()};
  final _reason = TextEditingController();
  String? _zoneId;
  bool _chosen = false;
  bool _busy = false;
  String? _error;
  Map<String, String> _errors = {};

  /// The change last sent and how it ended. A fault (the connection dropped)
  /// is retried as the same action; a decision (the server said no, or it
  /// went through) is over, and the next try is a new one.
  SlaTargetChange? _draft;
  bool _lastWasFault = false;

  @override
  void dispose() {
    for (final c in _controllers.values) {
      c.dispose();
    }
    _reason.dispose();
    super.dispose();
  }

  void _load(String? zoneId) {
    final t = targetFor(widget.report, zoneId);
    for (final s in SlaStage.values) {
      _controllers[s]!.text = '${t.minutesFor(s)}';
    }
    _zoneId = zoneId;
    _errors = {};
    _error = null;
    _draft = null;
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final me = ref.watch(managerMeProvider).value;
    final admin = me?.isAdmin ?? false;
    final zones = me?.zones.zones ?? const <Zone>[];
    if (!_chosen) {
      _chosen = true;
      final active = ref.read(activeZoneProvider)?.id;
      _load(active ?? (admin || zones.isEmpty ? null : zones.first.id));
    }
    final target = targetFor(widget.report, _zoneId);
    final canReset = _zoneId != null && widget.report.targets.any((t) => t.zoneId == _zoneId && !t.inherited);
    return SafeArea(
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Edit service-level targets', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: c.ink)),
          const SizedBox(height: 4),
          Text('Minutes each stage is allowed. Past that, the stage counts as late.', style: TextStyle(fontSize: 13, color: c.muted)),
          const SizedBox(height: 14),
          DropdownButtonFormField<String?>(
            key: const Key('sla-zone'),
            isExpanded: true,
            initialValue: _zoneId,
            decoration: const InputDecoration(labelText: 'Applies to'),
            items: [
              if (admin) const DropdownMenuItem<String?>(value: null, child: Text('Platform default (all zones)')),
              for (final z in zones) DropdownMenuItem<String?>(value: z.id, child: Text(z.name)),
            ],
            onChanged: _busy ? null : (v) => setState(() => _load(v)),
          ),
          const SizedBox(height: 10),
          for (final s in SlaStage.values) ...[
            TextFormField(
              key: Key(_fields[s]!),
              controller: _controllers[s],
              enabled: !_busy,
              keyboardType: TextInputType.number,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              decoration: InputDecoration(
                labelText: '${stageName(s)} (minutes)',
                helperText: 'Now ${target.minutesFor(s)}',
                errorText: _errors[s.name],
              ),
            ),
            const SizedBox(height: 8),
          ],
          TextFormField(
            key: const Key('sla-reason'),
            controller: _reason,
            enabled: !_busy,
            maxLength: 300,
            decoration: InputDecoration(labelText: 'Why change it?', errorText: _errors['reason']),
          ),
          if (_error != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Text(_error!, key: const Key('sla-error'), style: TextStyle(color: c.deal, fontWeight: FontWeight.w600)),
            ),
          Row(children: [
            if (canReset)
              TextButton(key: const Key('sla-reset'), onPressed: _busy ? null : _reset, child: const Text('Use the default again')),
            const Spacer(),
            FilledButton(
              key: const Key('sla-save'),
              onPressed: _busy ? null : _save,
              child: _busy ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2)) : const Text('Save'),
            ),
          ]),
        ]),
      ),
    );
  }

  Map<String, String> _validate() {
    final errors = <String, String>{};
    for (final s in SlaStage.values) {
      final (lo, hi) = SlaTargetChange.bounds[s]!;
      final n = int.tryParse(_controllers[s]!.text.trim());
      if (n == null || n < lo || n > hi) errors[s.name] = '${stageName(s)}: $lo to $hi minutes';
    }
    if (_reason.text.trim().length < 3) errors['reason'] = 'Say why, in at least 3 characters';
    return errors;
  }

  Future<void> _save() async {
    final errors = _validate();
    setState(() {
      _errors = errors;
      _error = null;
    });
    if (errors.isNotEmpty) return;
    int v(SlaStage s) => int.parse(_controllers[s]!.text.trim());
    final prev = _draft;
    final same = prev != null &&
        _lastWasFault &&
        prev.zoneId == _zoneId &&
        prev.acceptMinutes == v(SlaStage.accept) &&
        prev.prepMinutes == v(SlaStage.prep) &&
        prev.pickupMinutes == v(SlaStage.pickup) &&
        prev.deliverMinutes == v(SlaStage.deliver) &&
        prev.reason == _reason.text.trim();
    final draft = same
        ? prev
        : SlaTargetChange(
            zoneId: _zoneId,
            acceptMinutes: v(SlaStage.accept),
            prepMinutes: v(SlaStage.prep),
            pickupMinutes: v(SlaStage.pickup),
            deliverMinutes: v(SlaStage.deliver),
            reason: _reason.text.trim(),
          );
    _draft = draft;
    setState(() => _busy = true);
    try {
      final out = await ref.read(insightsRepoProvider).setSlaTarget(draft);
      if (!mounted) return;
      switch (out) {
        case Applied<SlaTarget>():
          ref.invalidate(slaProvider);
          Navigator.of(context).pop();
        case Refused<SlaTarget>(:final code):
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

  Future<void> _reset() async {
    final zone = _zoneId;
    if (zone == null) return;
    final ok = await showDialog<bool>(
      context: context,
      builder: (d) => AlertDialog(
        title: const Text('Use the platform default?'),
        content: const Text('This zone goes back to the platform targets. The change is recorded.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(d, false), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(d, true), child: const Text('Use default')),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final out = await ref.read(insightsRepoProvider).resetSlaTarget(zone);
      if (!mounted) return;
      switch (out) {
        case Applied<void>():
          ref.invalidate(slaProvider);
          Navigator.of(context).pop();
        case Refused<void>(:final code):
          setState(() {
            _busy = false;
            _error = friendlyError(code);
          });
      }
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _busy = false;
        _error = e.friendly;
      });
    }
  }
}
