import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../core/api.dart';
import '../../core/errors.dart';
import '../../models/insights.dart';
import '../../models/outcome.dart';
import '../../state/insights.dart';
import '../../state/providers.dart';
import '../../state/session.dart';
import '../../theme/app_theme.dart';
import '../../widgets/async_view.dart';
import 'insight_widgets.dart';

String modeWords(DispatchMode m) => m == DispatchMode.autoAssign ? 'Assigned automatically' : 'Offered to riders';

/// "Only riders with no delivery in hand" / "Riders may already hold up to 2 deliveries".
String loadWords(int maxLoad) => maxLoad <= 0
    ? 'Only riders with no delivery in hand'
    : 'Riders may already hold up to $maxLoad ${maxLoad == 1 ? 'delivery' : 'deliveries'}';

/// Dispatch mode (§17.4): per zone, orders are either offered to the best
/// riders (they accept) or assigned straight to the best eligible rider. The
/// same eligibility rules apply either way; if no rider qualifies for an
/// automatic assignment, the order falls back to an offer.
class DispatchScreen extends ConsumerWidget {
  const DispatchScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.colors;
    final me = ref.watch(managerMeProvider).value;
    final value = ref.watch(dispatchProvider);
    return Scaffold(
      backgroundColor: c.bg,
      appBar: AppBar(title: const Text('Dispatch mode')),
      body: AsyncView<DispatchOverview>(
        value: value,
        onRetry: () => ref.invalidate(dispatchProvider),
        builder: (o) {
          final canEdit = o.canConfigure && me != null && (me.isAdmin || me.can('manager.dispatch.configure'));
          return RefreshIndicator(
            onRefresh: () => ref.refresh(dispatchProvider.future),
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
              children: [
                Text(
                  'Offered to riders: the best riders get the order and one accepts. Assigned automatically: the best eligible rider is given the order straight away, and if none qualifies it is offered as usual.',
                  style: TextStyle(fontSize: 13, color: c.muted, height: 1.4),
                ),
                const SizedBox(height: 12),
                if (o.zones.isEmpty) EmptyLine('No zones to show.'),
                for (final z in o.zones) _ZoneCard(zone: z, canEdit: canEdit),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _ZoneCard extends StatelessWidget {
  const _ZoneCard({required this.zone, required this.canEdit});
  final DispatchZone zone;
  final bool canEdit;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final n = zone.last24h;
    final auto = zone.mode == DispatchMode.autoAssign;
    return KeyedSubtree(
      key: Key('dispatch-${zone.zoneId}'),
      child: InsightCard(
        title: '${zone.name} · ${zone.cityName}',
        trailing: canEdit
            ? TextButton(key: Key('dispatch-edit-${zone.zoneId}'), onPressed: () => showDispatchSheet(context, zone), child: const Text('Change'))
            : null,
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(modeWords(zone.mode), style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: auto ? c.accentInk : c.ink)),
          if (auto) Text(loadWords(zone.autoAssignMaxLoad), style: TextStyle(fontSize: 12.5, color: c.muted)),
          const SizedBox(height: 8),
          Text(
            'Last 24 hours: ${n.auto} assigned automatically · ${n.offerAccepted} offers accepted · ${n.ops} by your team · ${n.fellBackToOffer} fell back to an offer',
            style: TextStyle(fontSize: 12.5, color: c.muted, height: 1.35),
          ),
          if (zone.updatedBy != null && zone.updatedAt != null)
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text('Changed by ${zone.updatedBy!.name} on ${DateFormat('d MMM').format(zone.updatedAt!.toLocal())}',
                  style: TextStyle(fontSize: 12, color: c.muted)),
            ),
        ]),
      ),
    );
  }
}

Future<void> showDispatchSheet(BuildContext context, DispatchZone zone) => showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (_) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
        child: _DispatchSheet(zone: zone),
      ),
    );

class _DispatchSheet extends ConsumerStatefulWidget {
  const _DispatchSheet({required this.zone});
  final DispatchZone zone;

  @override
  ConsumerState<_DispatchSheet> createState() => _DispatchSheetState();
}

class _DispatchSheetState extends ConsumerState<_DispatchSheet> {
  late DispatchMode _mode = widget.zone.mode;
  late int _load = widget.zone.autoAssignMaxLoad.clamp(0, 3);
  final _reason = TextEditingController();
  bool _busy = false;
  String? _reasonError;
  String? _error;
  DispatchChange? _draft;
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
    setState(() => _reasonError = null);
    // Turning automatic assignment on changes what riders see; ask first.
    if (_mode == DispatchMode.autoAssign && widget.zone.mode != DispatchMode.autoAssign) {
      final ok = await showDialog<bool>(
        context: context,
        builder: (d) => AlertDialog(
          title: const Text('Assign orders automatically?'),
          content: Text(
            'In ${widget.zone.name}, a ready order goes straight to the best eligible rider instead of being offered. '
            '${loadWords(_load)}. If no rider qualifies, it is offered as before.',
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(d, false), child: const Text('Cancel')),
            FilledButton(onPressed: () => Navigator.pop(d, true), child: const Text('Yes, assign automatically')),
          ],
        ),
      );
      if (ok != true || !mounted) return;
    }
    final prev = _draft;
    final same = prev != null && _lastWasFault && prev.mode == _mode && prev.autoAssignMaxLoad == _load && prev.reason == reason;
    final draft = same
        ? prev
        : DispatchChange(zoneId: widget.zone.zoneId, mode: _mode, autoAssignMaxLoad: _load, reason: reason);
    _draft = draft;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final out = await ref.read(insightsRepoProvider).setDispatch(draft);
      if (!mounted) return;
      switch (out) {
        case Applied<DispatchZone>():
          ref.invalidate(dispatchProvider);
          Navigator.of(context).pop();
          showSnack(context, '${widget.zone.name}: ${modeWords(_mode).toLowerCase()}.');
        case Refused<DispatchZone>(:final code):
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

  Widget _option(DispatchMode m, String key, String title, String body) {
    final c = context.colors;
    final selected = _mode == m;
    return ListTile(
      key: Key(key),
      contentPadding: EdgeInsets.zero,
      selected: selected,
      selectedColor: c.accentInk,
      title: Text(title, style: const TextStyle(fontWeight: FontWeight.w800)),
      subtitle: Text(body, style: TextStyle(fontSize: 12.5, color: c.muted, height: 1.3)),
      trailing: Icon(selected ? Icons.radio_button_checked : Icons.radio_button_off, color: selected ? c.accent : c.muted),
      onTap: _busy ? null : () => setState(() => _mode = m),
    );
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return SafeArea(
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('${widget.zone.name} · dispatch mode', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: c.ink)),
          const SizedBox(height: 6),
          _option(DispatchMode.offer, 'mode-offer', 'Offered to riders', 'The best riders are offered the order; one accepts. This is how it works today.'),
          _option(DispatchMode.autoAssign, 'mode-auto', 'Assigned automatically',
              'The best eligible rider is given the order at once. If none qualifies, it is offered as usual.'),
          if (_mode == DispatchMode.autoAssign) ...[
            const SizedBox(height: 8),
            Text('How busy a rider can be and still get an order', style: TextStyle(fontWeight: FontWeight.w700, color: c.ink)),
            const SizedBox(height: 6),
            Wrap(spacing: 8, children: [
              for (var n = 0; n <= 3; n++)
                ChoiceChip(
                  key: Key('load-$n'),
                  label: Text(n == 0 ? 'Free riders only' : 'Up to $n in hand'),
                  selected: _load == n,
                  onSelected: _busy ? null : (_) => setState(() => _load = n),
                ),
            ]),
          ],
          const SizedBox(height: 12),
          TextField(
            key: const Key('dispatch-reason'),
            controller: _reason,
            enabled: !_busy,
            maxLength: 300,
            decoration: InputDecoration(labelText: 'Why change it?', errorText: _reasonError),
          ),
          if (_error != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Text(_error!, key: const Key('dispatch-error'), style: TextStyle(color: c.deal, fontWeight: FontWeight.w600)),
            ),
          Align(
            alignment: Alignment.centerRight,
            child: FilledButton(
              key: const Key('dispatch-save'),
              onPressed: _busy ? null : _save,
              child: _busy ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2)) : const Text('Save'),
            ),
          ),
        ]),
      ),
    );
  }
}
