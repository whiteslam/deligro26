import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api.dart';
import '../../core/errors.dart';
import '../../core/format.dart' show rupees;
import '../../models/insights.dart';
import '../../models/outcome.dart';
import '../../state/insights.dart';
import '../../state/providers.dart';
import '../../state/session.dart';
import '../../theme/app_theme.dart';
import '../../widgets/async_view.dart';
import '../../widgets/zone_picker.dart';
import 'fraud_screen.dart';
import 'insight_format.dart';
import 'insight_widgets.dart';

/// Fraud rules (§17.6): the limit each of the five rules uses, per zone. A zone
/// that has set nothing uses the platform default. The master switch for fraud
/// checks lives with the alert thresholds and is only shown here.
class FraudRulesScreen extends ConsumerWidget {
  const FraudRulesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.colors;
    final me = ref.watch(managerMeProvider).value;
    final zoneId = ref.watch(activeZoneProvider)?.id;
    final value = ref.watch(fraudRulesProvider(zoneId));
    final admin = me?.isAdmin ?? false;
    final canConfigure = me != null && (admin || me.can('manager.alerts.configure'));
    // The platform default is an admin's to change; a manager changes a zone.
    final canEditHere = canConfigure && (zoneId != null || admin);
    return Scaffold(
      backgroundColor: c.bg,
      appBar: AppBar(
        title: const Text('Fraud rules'),
        actions: const [Padding(padding: EdgeInsets.only(right: 12), child: AreaPickerChip())],
      ),
      body: AsyncView<FraudRulesView>(
        value: value,
        onRetry: () => ref.invalidate(fraudRulesProvider(zoneId)),
        builder: (v) => RefreshIndicator(
          onRefresh: () => ref.refresh(fraudRulesProvider(zoneId).future),
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
            children: [
              if (!v.enabled)
                const InsightBanner(
                  key: Key('master-off'),
                  text: 'Fraud checks are switched off for everyone, so no new cases will appear. The master switch is under Alert thresholds (More → Alert thresholds).',
                )
              else
                Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: Text('Fraud checks are on. The master switch is with the alert settings.', style: TextStyle(fontSize: 12.5, color: c.muted)),
                ),
              Text(
                zoneId == null ? 'These are the platform defaults every zone starts from.' : 'Rules for this zone. A rule marked "Uses the default" has not been changed here.',
                style: TextStyle(fontSize: 13, color: c.muted),
              ),
              if (canConfigure && !canEditHere)
                Padding(
                  padding: const EdgeInsets.only(top: 6),
                  child: Text('Pick a single zone to change its rules.', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: c.accentInk)),
                ),
              const SizedBox(height: 12),
              for (final r in v.rules) _RuleCard(setting: r, canEdit: canEditHere, zoneId: zoneId),
            ],
          ),
        ),
      ),
    );
  }
}

class _RuleCard extends StatelessWidget {
  const _RuleCard({required this.setting, required this.canEdit, required this.zoneId});
  final FraudRuleSetting setting;
  final bool canEdit;
  final String? zoneId;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final wire = fraudRuleWire(setting.rule);
    return InsightCard(
      key: Key('fraud-rule-$wire'),
      title: setting.label.isEmpty ? fraudRuleLabel(setting.rule) : setting.label,
      trailing: canEdit
          ? IconButton(
              key: Key('edit-rule-$wire'),
              tooltip: 'Change this rule',
              icon: const Icon(Icons.edit_outlined),
              onPressed: () => showRuleSheet(context, setting, zoneId),
            )
          : null,
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(setting.description, style: TextStyle(fontSize: 13, color: c.muted, height: 1.35)),
        const SizedBox(height: 8),
        Wrap(spacing: 12, runSpacing: 4, crossAxisAlignment: WrapCrossAlignment.center, children: [
          Text(setting.enabled ? limitWords(setting.unit, setting.threshold, setting.windowDays) : 'Off',
              style: dataStyle(context, size: 14, weight: FontWeight.w700)),
          if (setting.inherited) Text('Uses the default', style: TextStyle(fontSize: 12, color: c.muted)),
        ]),
      ]),
    );
  }
}

Future<void> showRuleSheet(BuildContext context, FraudRuleSetting setting, String? zoneId) => showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (_) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
        child: _RuleSheet(setting: setting, zoneId: zoneId),
      ),
    );

class _RuleSheet extends ConsumerStatefulWidget {
  const _RuleSheet({required this.setting, required this.zoneId});
  final FraudRuleSetting setting;
  final String? zoneId;

  @override
  ConsumerState<_RuleSheet> createState() => _RuleSheetState();
}

class _RuleSheetState extends ConsumerState<_RuleSheet> {
  late final _threshold = TextEditingController(text: _show(widget.setting.threshold));
  late final _window = TextEditingController(text: '${widget.setting.windowDays}');
  late bool _enabled = widget.setting.enabled;
  bool _busy = false;
  String? _thresholdError;
  String? _windowError;
  String? _error;
  FraudRuleChange? _draft;
  bool _lastWasFault = false;

  MeasureUnit get _unit => widget.setting.unit;

  /// A ratio is typed as a percentage; everything else as it is.
  String _show(double t) => _unit == MeasureUnit.ratio ? plain(double.parse((t * 100).toStringAsFixed(1))) : plain(t);

  double? _parse(String s) {
    final v = double.tryParse(s.trim());
    if (v == null) return null;
    return _unit == MeasureUnit.ratio ? v / 100 : v;
  }

  String get _boundsWords {
    final (lo, hi) = widget.setting.bounds;
    return switch (_unit) {
      MeasureUnit.count => 'Between ${plain(lo)} and ${plain(hi)}',
      MeasureUnit.ratio => 'Between ${percentWord(lo)} and ${percentWord(hi)}',
      MeasureUnit.rupees => 'Between ${rupees(lo)} and ${rupees(hi)}',
      MeasureUnit.multiple => 'Between ${plain(lo)} and ${plain(hi)}',
    };
  }

  @override
  void dispose() {
    _threshold.dispose();
    _window.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final t = _parse(_threshold.text);
    final (lo, hi) = widget.setting.bounds;
    final w = int.tryParse(_window.text.trim());
    final tBad = t == null || t < lo - 1e-9 || t > hi + 1e-9;
    final wBad = w == null || w < 1 || w > 90;
    setState(() {
      _thresholdError = tBad ? _boundsWords : null;
      _windowError = wBad ? 'Between 1 and 90 days' : null;
      _error = null;
    });
    if (tBad || wBad) return;
    final prev = _draft;
    final same = prev != null && _lastWasFault && prev.enabled == _enabled && prev.threshold == t && prev.windowDays == w;
    final draft = same
        ? prev
        : FraudRuleChange(rule: widget.setting.rule, zoneId: widget.zoneId, enabled: _enabled, threshold: t, windowDays: w);
    _draft = draft;
    setState(() => _busy = true);
    try {
      final out = await ref.read(insightsRepoProvider).setFraudRule(draft);
      if (!mounted) return;
      switch (out) {
        case Applied<FraudRuleSetting>():
          ref.invalidate(fraudRulesProvider(widget.zoneId));
          Navigator.of(context).pop();
        case Refused<FraudRuleSetting>(:final code):
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
    final unitSuffix = switch (_unit) {
      MeasureUnit.ratio => '%',
      MeasureUnit.rupees => '₹',
      MeasureUnit.multiple => '×',
      MeasureUnit.count => '',
    };
    return SafeArea(
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(widget.setting.label.isEmpty ? fraudRuleLabel(widget.setting.rule) : widget.setting.label,
              style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: c.ink)),
          const SizedBox(height: 4),
          Text(widget.setting.description, style: TextStyle(fontSize: 13, color: c.muted, height: 1.35)),
          const SizedBox(height: 10),
          SwitchListTile(
            key: const Key('rule-enabled'),
            contentPadding: EdgeInsets.zero,
            title: const Text('Check this rule'),
            value: _enabled,
            onChanged: _busy ? null : (v) => setState(() => _enabled = v),
          ),
          TextField(
            key: const Key('rule-threshold'),
            controller: _threshold,
            enabled: !_busy,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[0-9.]'))],
            decoration: InputDecoration(labelText: 'Limit${unitSuffix.isEmpty ? '' : ' ($unitSuffix)'}', helperText: _boundsWords, errorText: _thresholdError),
          ),
          const SizedBox(height: 8),
          TextField(
            key: const Key('rule-window'),
            controller: _window,
            enabled: !_busy,
            keyboardType: TextInputType.number,
            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
            decoration: InputDecoration(labelText: 'Look back (days)', errorText: _windowError),
          ),
          if (_error != null)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(_error!, key: const Key('rule-error'), style: TextStyle(color: c.deal, fontWeight: FontWeight.w600)),
            ),
          const SizedBox(height: 12),
          Align(
            alignment: Alignment.centerRight,
            child: FilledButton(
              key: const Key('rule-save'),
              onPressed: _busy ? null : _save,
              child: _busy ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2)) : const Text('Save'),
            ),
          ),
        ]),
      ),
    );
  }
}
