import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api.dart';
import '../../core/format.dart' show rupees, rupeesPaise;
import '../../models/insights.dart';
import '../../state/insight_files.dart';
import '../../state/insights.dart';
import '../../state/providers.dart';
import '../../state/session.dart';
import '../../theme/app_theme.dart';
import '../../widgets/async_view.dart';
import '../../widgets/zone_picker.dart';
import 'insight_format.dart';
import 'insight_widgets.dart';
import 'range_chips.dart';

String voucherTypeWords(VoucherType t) => switch (t) {
      VoucherType.sales => 'Sales',
      VoucherType.commission => 'Commission',
      VoucherType.refunds => 'Refunds',
      VoucherType.vendorPayout => 'Vendor payout',
      VoucherType.riderSalary => 'Rider salary',
      VoucherType.unknown => 'Other',
    };

String figureWords(String figure) => switch (figure) {
      'customerPaid' => 'Customer paid',
      'deliveryFees' => 'Delivery fees',
      'platformCommission' => 'Platform commission',
      'refunds' => 'Refunds',
      'vendorPaymentsCompleted' => 'Vendor payments completed',
      'riderPayoutsCompleted' => 'Rider payouts completed',
      _ => figure,
    };

/// Accounting export (§17.10): vouchers for sales, commission, refunds, vendor
/// payouts and rider salary, as Tally XML or a journal CSV. Every voucher
/// balances or nothing is exported, and the totals are checked against Finance.
class AccountingScreen extends ConsumerStatefulWidget {
  const AccountingScreen({super.key});

  @override
  ConsumerState<AccountingScreen> createState() => _AccountingScreenState();
}

class _AccountingScreenState extends ConsumerState<AccountingScreen> {
  bool _masters = false;
  String? _busyFormat;
  String? _error;
  String? _done;

  Future<void> _download(String format, AccountingSummary s) async {
    if ((s.totals.debit - s.totals.credit).abs() > 0.005) {
      setState(() {
        _error = 'Debit and credit differ, so nothing was exported.';
        _done = null;
      });
      return;
    }
    final r = ref.read(accountingRangeProvider);
    setState(() {
      _busyFormat = format;
      _error = null;
      _done = null;
    });
    try {
      final file = await ref.read(insightsRepoProvider).accountingFile(
            format: format,
            from: r.from,
            to: r.to,
            zoneId: ref.read(areaFilterProvider)?.id,
            includeMasters: format == 'tally' && _masters,
          );
      await ref.read(fileSharerProvider)(file.bytes, file.fileName, file.mime);
      if (mounted) {
        setState(() {
          _busyFormat = null;
          _done = 'Prepared ${file.fileName}.';
        });
      }
    } on ApiException catch (e) {
      if (!mounted) return;
      if (e.unauthorized) await handleUnauthorized(ref, e);
      setState(() {
        _busyFormat = null;
        _error = e.code == 'unbalanced'
            ? 'Voucher ${e.body['voucher'] ?? ''} did not balance, so nothing was exported.'.replaceAll('  ', ' ')
            : e.friendly;
      });
    } catch (_) {
      if (mounted) {
        setState(() {
          _busyFormat = null;
          _error = 'Could not prepare the file. Try again.';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final me = ref.watch(managerMeProvider).value;
    final allowed = me != null && (me.isAdmin || (me.can('manager.accounting.export') && me.can('manager.finance.view')));
    final value = ref.watch(accountingProvider);
    return Scaffold(
      backgroundColor: c.bg,
      appBar: AppBar(
        title: const Text('Accounting export'),
        actions: const [Padding(padding: EdgeInsets.only(right: 12), child: AreaPickerChip())],
      ),
      body: me == null
          ? const Center(child: CircularProgressIndicator())
          : !allowed
              ? EmptyLine("You don't have access to the accounting export. It needs the export switch and Finance access.")
              : Column(children: [
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
                    child: Align(alignment: Alignment.centerLeft, child: RangeChips(provider: accountingRangeProvider)),
                  ),
                  Expanded(
                    child: AsyncView<AccountingSummary>(
                      value: value,
                      onRetry: () => ref.invalidate(accountingProvider),
                      builder: (s) => RefreshIndicator(
                        onRefresh: () => ref.refresh(accountingProvider.future),
                        child: _content(context, s),
                      ),
                    ),
                  ),
                ]),
    );
  }

  Widget _content(BuildContext context, AccountingSummary s) {
    final c = context.colors;
    final balanced = (s.totals.debit - s.totals.credit).abs() <= 0.005;
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 32),
      children: [
        InsightCard(
          title: s.company.isEmpty ? 'Vouchers' : '${s.company} · vouchers',
          subtitle: '${s.vouchers.length} ${s.vouchers.length == 1 ? 'voucher' : 'vouchers'} for ${rangeWords(s.range.from, s.range.to)}',
          child: Text(
            balanced
                ? 'Debit and credit both ${rupeesPaise(s.totals.debit)}.'
                : 'Debit ${rupeesPaise(s.totals.debit)} and credit ${rupeesPaise(s.totals.credit)} should be equal. They are not.',
            style: TextStyle(color: balanced ? c.green : c.deal, fontWeight: FontWeight.w700),
          ),
        ),
        InsightCard(
          title: 'Checked against Finance',
          subtitle: 'Each figure in the export, next to the same figure on the Finance tab.',
          child: Column(children: [
            for (final r in s.reconciliation)
              ListTile(
                key: Key('recon-${r.figure}'),
                contentPadding: EdgeInsets.zero,
                dense: true,
                leading: Icon(r.match ? Icons.check_circle_outline : Icons.error_outline, color: r.match ? c.green : c.deal),
                title: Text(figureWords(r.figure), style: TextStyle(fontWeight: FontWeight.w700, color: c.ink)),
                subtitle: Text(
                  r.match
                      ? 'Matches Finance'
                      : r.difference > 0
                          ? 'Finance shows ${rupees(r.difference.abs())} more'
                          : 'Finance shows ${rupees(r.difference.abs())} less',
                  style: TextStyle(color: r.match ? c.muted : c.deal, fontSize: 12.5),
                ),
                trailing: Text(rupeesPaise(r.export), style: dataStyle(context, size: 13)),
              ),
          ]),
        ),
        for (final v in s.vouchers) _VoucherCard(voucher: v),
        InsightCard(
          title: 'Download',
          subtitle: 'Each file is prepared by the server and shared from this phone.',
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            CheckboxListTile(
              key: const Key('tally-masters'),
              contentPadding: EdgeInsets.zero,
              controlAffinity: ListTileControlAffinity.leading,
              title: const Text('Include ledger masters in the Tally file'),
              value: _masters,
              onChanged: _busyFormat != null ? null : (v) => setState(() => _masters = v ?? false),
            ),
            const SizedBox(height: 4),
            Wrap(spacing: 10, runSpacing: 10, children: [
              FilledButton.icon(
                key: const Key('dl-tally'),
                onPressed: _busyFormat != null ? null : () => _download('tally', s),
                icon: _busyFormat == 'tally' ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.code),
                label: const Text('Download Tally XML'),
              ),
              OutlinedButton.icon(
                key: const Key('dl-journal'),
                onPressed: _busyFormat != null ? null : () => _download('journal', s),
                icon: _busyFormat == 'journal' ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.table_chart_outlined),
                label: const Text('Download journal CSV'),
              ),
            ]),
            if (_error != null)
              Padding(
                padding: const EdgeInsets.only(top: 10),
                child: Text(_error!, key: const Key('acct-error'), style: TextStyle(color: c.deal, fontWeight: FontWeight.w600)),
              ),
            if (_done != null)
              Padding(
                padding: const EdgeInsets.only(top: 10),
                child: Text(_done!, style: TextStyle(color: c.green, fontWeight: FontWeight.w600)),
              ),
          ]),
        ),
      ],
    );
  }
}

class _VoucherCard extends StatelessWidget {
  const _VoucherCard({required this.voucher});
  final Voucher voucher;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Material(
        key: Key('voucher-${voucher.number}'),
        color: c.surface,
        clipBehavior: Clip.antiAlias,
        shape: RoundedRectangleBorder(side: BorderSide(color: c.line), borderRadius: BorderRadius.circular(radiusBlock)),
        child: ExpansionTile(
          shape: const Border(),
          collapsedShape: const Border(),
          title: Text(voucherTypeWords(voucher.type), style: TextStyle(fontWeight: FontWeight.w800, color: c.ink)),
          subtitle: Text('${voucher.number} · ${voucher.date}', style: TextStyle(fontSize: 12, color: c.muted)),
          trailing: Text(rupeesPaise(voucher.debit), style: dataStyle(context, size: 13)),
          childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
          expandedCrossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(voucher.narration, style: TextStyle(fontSize: 13, color: c.muted)),
            if (voucher.reference != null) Text('Reference ${voucher.reference}', style: TextStyle(fontSize: 12.5, color: c.muted)),
            const SizedBox(height: 8),
            for (final l in voucher.lines)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 3),
                child: Row(children: [
                  Expanded(child: Text(l.ledger, style: TextStyle(fontSize: 13, color: c.ink))),
                  SizedBox(width: 92, child: Text(l.debit > 0 ? 'Dr ${rupeesPaise(l.debit)}' : '', textAlign: TextAlign.right, style: dataStyle(context, size: 12))),
                  SizedBox(width: 92, child: Text(l.credit > 0 ? 'Cr ${rupeesPaise(l.credit)}' : '', textAlign: TextAlign.right, style: dataStyle(context, size: 12))),
                ]),
              ),
          ],
        ),
      ),
    );
  }
}
