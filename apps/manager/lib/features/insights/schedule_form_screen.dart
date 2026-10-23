import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api.dart';
import '../../core/errors.dart';
import '../../models/insights.dart';
import '../../models/orders.dart' show VendorRef;
import '../../models/outcome.dart';
import '../../state/insights.dart';
import '../../state/providers.dart';
import '../../state/session.dart';
import '../../state/support.dart';
import '../../state/vendors.dart';
import '../../theme/app_theme.dart';
import '../../widgets/async_view.dart';
import 'insight_format.dart';
import 'schedule_words.dart';

/// Make or change a scheduled report: which report, how often, for which
/// period and area, and who gets it. People who can no longer receive it (the
/// report or an area was taken from them) are shown but cannot be chosen.
class ScheduleFormScreen extends ConsumerStatefulWidget {
  const ScheduleFormScreen({super.key, this.scheduleId});

  /// Null for a new schedule.
  final String? scheduleId;

  @override
  ConsumerState<ScheduleFormScreen> createState() => _ScheduleFormScreenState();
}

class _ScheduleFormScreenState extends ConsumerState<ScheduleFormScreen> {
  final _name = TextEditingController();
  bool _hydrated = false;
  String? _kind;
  ScheduleFrequency _frequency = ScheduleFrequency.daily;
  int _weekday = 1;
  int _hour = 8;
  RangePreset _preset = RangePreset.yesterday;
  String _payment = 'all';
  String? _vendor;
  ScheduleFilters _carried = const ScheduleFilters();
  final _zones = <String>{};
  final _recipients = <String>{};
  final _ineligible = <String, String>{};

  String? _nameError;
  String? _recipientError;
  String? _error;
  bool _busy = false;
  ScheduleDraft? _draft;
  bool _lastWasFault = false;

  @override
  void dispose() {
    _name.dispose();
    super.dispose();
  }

  void _hydrate(ScheduleList list) {
    if (_hydrated) return;
    _hydrated = true;
    final existing = widget.scheduleId == null ? null : _find(list);
    if (existing == null) {
      _kind = list.kinds.isEmpty ? null : list.kinds.first.kind;
      return;
    }
    _name.text = existing.name;
    _kind = existing.kind;
    _frequency = existing.frequency;
    _weekday = existing.weekday ?? 1;
    _hour = existing.hourIst;
    _preset = existing.rangePreset;
    _payment = existing.filters.payment;
    _vendor = existing.filters.vendor;
    _carried = existing.filters;
    _zones.addAll(existing.zoneIds ?? const []);
    for (final r in existing.recipients) {
      if (r.eligible) {
        _recipients.add(r.id);
      } else {
        _ineligible[r.id] = 'They can no longer receive this report (permission or area). Saving removes them.';
      }
    }
  }

  Schedule? _find(ScheduleList list) {
    for (final s in list.items) {
      if (s.id == widget.scheduleId) return s;
    }
    return null;
  }

  Future<void> _save() async {
    final nameBad = _name.text.trim().length < 2;
    final noOne = _recipients.isEmpty;
    setState(() {
      _nameError = nameBad ? 'Give it a name' : null;
      _recipientError = noOne ? 'Choose at least one person to send it to' : null;
      _error = null;
    });
    if (nameBad || noOne || _kind == null) return;
    final weekday = _frequency == ScheduleFrequency.weekly ? _weekday : null;
    final filters = ScheduleFilters(vendor: _vendor, rider: _carried.rider, status: _carried.status, payment: _payment);
    final recipientIds = _recipients.toList()..sort();
    final zoneIds = _zones.isEmpty ? null : (_zones.toList()..sort());
    final prev = _draft;
    final same = prev != null &&
        _lastWasFault &&
        prev.name == _name.text.trim() &&
        prev.kind == _kind &&
        prev.frequency == _frequency &&
        prev.weekday == weekday &&
        prev.hourIst == _hour &&
        prev.rangePreset == _preset &&
        prev.filters.payment == filters.payment &&
        prev.filters.vendor == filters.vendor &&
        prev.recipientIds.join(',') == recipientIds.join(',') &&
        (prev.zoneIds?.join(',') ?? '') == (zoneIds?.join(',') ?? '');
    final draft = same
        ? prev
        : ScheduleDraft(
            name: _name.text.trim(),
            kind: _kind!,
            filters: filters,
            frequency: _frequency,
            weekday: weekday,
            hourIst: _hour,
            rangePreset: _preset,
            zoneIds: zoneIds,
            recipientIds: recipientIds,
          );
    _draft = draft;
    setState(() => _busy = true);
    final repo = ref.read(insightsRepoProvider);
    try {
      final out = widget.scheduleId == null ? await repo.createSchedule(draft) : await repo.updateSchedule(widget.scheduleId!, draft);
      if (!mounted) return;
      switch (out) {
        case Applied<Schedule>():
          ref.invalidate(schedulesProvider);
          await Navigator.of(context).maybePop();
        case Refused<Schedule>(:final code, :final extra):
          _lastWasFault = false;
          final ids = extra['ids'];
          setState(() {
            _busy = false;
            _error = friendlyError(code);
            if (code == 'recipient_ineligible' && ids is List) {
              for (final id in ids) {
                if (id is String) {
                  _recipients.remove(id);
                  _ineligible[id] = 'They can no longer receive this report (permission or area).';
                }
              }
            }
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
    final value = ref.watch(schedulesProvider);
    return Scaffold(
      backgroundColor: c.bg,
      appBar: AppBar(title: Text(widget.scheduleId == null ? 'New schedule' : 'Edit schedule')),
      body: AsyncView<ScheduleList>(
        value: value,
        onRetry: () => ref.invalidate(schedulesProvider),
        builder: (list) {
          if (widget.scheduleId != null && _find(list) == null) return EmptyLine('This schedule no longer exists.');
          if (list.kinds.isEmpty && widget.scheduleId == null) {
            return EmptyLine('You can only schedule reports you are allowed to run, and there are none for you.');
          }
          _hydrate(list);
          return _form(context, list);
        },
      ),
    );
  }

  Widget _form(BuildContext context, ScheduleList list) {
    final c = context.colors;
    final me = ref.watch(managerMeProvider).value;
    final zones = me?.zones.zones ?? const [];
    final staff = ref.watch(ticketAssigneesProvider(null)).value?.staff ?? const [];
    final vendors = ref.watch(vendorDirectoryProvider).value ?? const <VendorRef>[];
    final existing = widget.scheduleId == null ? null : _find(list);

    // Everyone who could be chosen: staff in reach, plus whoever is already on it.
    final people = <String, String>{for (final s in staff) s.id: s.name};
    for (final r in existing?.recipients ?? const <ScheduleRecipient>[]) {
      people.putIfAbsent(r.id, () => r.name);
    }
    for (final id in _ineligible.keys) {
      people.putIfAbsent(id, () => 'Someone');
    }

    final kinds = [...list.kinds];
    if (_kind != null && !kinds.any((k) => k.kind == _kind)) {
      kinds.add(ScheduleKind(kind: _kind!, label: '$_kind (you can no longer run this)'));
    }

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
      children: [
        TextField(
          key: const Key('sch-name'),
          controller: _name,
          enabled: !_busy,
          maxLength: 60,
          decoration: InputDecoration(labelText: 'Name', errorText: _nameError),
        ),
        const SizedBox(height: 8),
        DropdownButtonFormField<String>(
          key: const Key('sch-kind'),
          isExpanded: true,
          initialValue: _kind,
          decoration: const InputDecoration(labelText: 'Report'),
          items: [for (final k in kinds) DropdownMenuItem(value: k.kind, child: Text(k.label, overflow: TextOverflow.ellipsis))],
          onChanged: _busy ? null : (v) => setState(() => _kind = v),
        ),
        const SizedBox(height: 16),
        Text('How often', style: TextStyle(fontWeight: FontWeight.w800, color: c.ink)),
        const SizedBox(height: 6),
        Wrap(spacing: 8, children: [
          ChoiceChip(
            key: const Key('sch-daily'),
            label: const Text('Every day'),
            selected: _frequency == ScheduleFrequency.daily,
            onSelected: _busy ? null : (_) => setState(() => _frequency = ScheduleFrequency.daily),
          ),
          ChoiceChip(
            key: const Key('sch-weekly'),
            label: const Text('Every week'),
            selected: _frequency == ScheduleFrequency.weekly,
            onSelected: _busy ? null : (_) => setState(() => _frequency = ScheduleFrequency.weekly),
          ),
        ]),
        const SizedBox(height: 8),
        Row(children: [
          if (_frequency == ScheduleFrequency.weekly)
            Expanded(
              child: DropdownButtonFormField<int>(
                key: const Key('sch-weekday'),
                isExpanded: true,
                initialValue: _weekday,
                decoration: const InputDecoration(labelText: 'On'),
                items: [for (var d = 1; d <= 7; d++) DropdownMenuItem(value: d, child: Text(weekdayNames[d - 1]))],
                onChanged: _busy ? null : (v) => setState(() => _weekday = v ?? 1),
              ),
            ),
          if (_frequency == ScheduleFrequency.weekly) const SizedBox(width: 12),
          Expanded(
            child: DropdownButtonFormField<int>(
              key: const Key('sch-hour'),
              isExpanded: true,
              initialValue: _hour,
              decoration: const InputDecoration(labelText: 'At (India time)'),
              items: [for (var h = 0; h < 24; h++) DropdownMenuItem(value: h, child: Text(hourWord(h)))],
              onChanged: _busy ? null : (v) => setState(() => _hour = v ?? 8),
            ),
          ),
        ]),
        const SizedBox(height: 12),
        DropdownButtonFormField<RangePreset>(
          key: const Key('sch-range'),
          isExpanded: true,
          initialValue: _preset,
          decoration: const InputDecoration(labelText: 'Period it covers'),
          items: [for (final p in RangePreset.values) DropdownMenuItem(value: p, child: Text(presetWords(p), overflow: TextOverflow.ellipsis))],
          onChanged: _busy ? null : (v) => setState(() => _preset = v ?? RangePreset.yesterday),
        ),
        const SizedBox(height: 16),
        Text('Only include', style: TextStyle(fontWeight: FontWeight.w800, color: c.ink)),
        const SizedBox(height: 6),
        SegmentedButton<String>(
          key: const Key('sch-payment'),
          showSelectedIcon: false,
          segments: const [
            ButtonSegment(value: 'all', label: Text('All orders')),
            ButtonSegment(value: 'cod', label: Text('Cash')),
            ButtonSegment(value: 'online', label: Text('Online')),
          ],
          selected: {_payment},
          onSelectionChanged: _busy ? null : (s) => setState(() => _payment = s.first),
        ),
        const SizedBox(height: 10),
        DropdownButtonFormField<String?>(
          key: const Key('sch-vendor'),
          isExpanded: true,
          initialValue: _vendor,
          decoration: const InputDecoration(labelText: 'Vendor'),
          items: [
            const DropdownMenuItem<String?>(value: null, child: Text('Any vendor')),
            for (final v in vendors) DropdownMenuItem<String?>(value: v.id, child: Text(v.name, overflow: TextOverflow.ellipsis)),
            if (_vendor != null && !vendors.any((v) => v.id == _vendor))
              DropdownMenuItem<String?>(value: _vendor, child: const Text('The vendor already chosen')),
          ],
          onChanged: _busy ? null : (v) => setState(() => _vendor = v),
        ),
        const SizedBox(height: 16),
        Text('Area', style: TextStyle(fontWeight: FontWeight.w800, color: c.ink)),
        Text(_zones.isEmpty ? 'Everything you can see.' : 'Only the zones chosen.', style: TextStyle(fontSize: 12.5, color: c.muted)),
        const SizedBox(height: 6),
        Wrap(spacing: 8, runSpacing: 8, children: [
          for (final z in zones)
            FilterChip(
              key: Key('sch-zone-${z.id}'),
              label: Text(z.name),
              selected: _zones.contains(z.id),
              onSelected: _busy ? null : (on) => setState(() => on ? _zones.add(z.id) : _zones.remove(z.id)),
            ),
        ]),
        const SizedBox(height: 16),
        Text('Send it to', style: TextStyle(fontWeight: FontWeight.w800, color: c.ink)),
        Text('Each person is checked again when it is sent.', style: TextStyle(fontSize: 12.5, color: c.muted)),
        if (_recipientError != null)
          Padding(
            padding: const EdgeInsets.only(top: 4),
            child: Text(_recipientError!, style: TextStyle(color: c.deal, fontSize: 12.5, fontWeight: FontWeight.w600)),
          ),
        for (final e in people.entries)
          CheckboxListTile(
            key: Key('rcpt-${e.key}'),
            contentPadding: EdgeInsets.zero,
            controlAffinity: ListTileControlAffinity.leading,
            title: Text(e.value),
            subtitle: _ineligible.containsKey(e.key) ? Text(_ineligible[e.key]!, style: TextStyle(color: c.deal, fontSize: 12.5)) : null,
            value: _recipients.contains(e.key),
            onChanged: _busy || _ineligible.containsKey(e.key)
                ? null
                : (on) => setState(() => on == true ? _recipients.add(e.key) : _recipients.remove(e.key)),
          ),
        if (_error != null)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Text(_error!, key: const Key('sch-error'), style: TextStyle(color: c.deal, fontWeight: FontWeight.w600)),
          ),
        const SizedBox(height: 16),
        FilledButton(
          key: const Key('sch-save'),
          onPressed: _busy ? null : _save,
          child: _busy ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2)) : Text(widget.scheduleId == null ? 'Create schedule' : 'Save changes'),
        ),
      ],
    );
  }
}
