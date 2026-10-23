import 'package:deligro_manager/core/api.dart';
import 'package:deligro_manager/core/entity_routes.dart' show safeAppPath;
import 'package:deligro_manager/core/format.dart' show istToday;
import 'package:deligro_manager/core/push.dart' show inAppPathFrom;
import 'package:deligro_manager/features/insights/accounting_screen.dart';
import 'package:deligro_manager/features/insights/report_run_screen.dart';
import 'package:deligro_manager/features/insights/schedule_form_screen.dart';
import 'package:deligro_manager/features/insights/schedule_runs_screen.dart';
import 'package:deligro_manager/features/insights/schedules_screen.dart';
import 'package:deligro_manager/models/insights.dart';
import 'package:deligro_manager/models/outcome.dart';
import 'package:deligro_manager/state/insight_files.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:intl/intl.dart';

import 'fakes/fake_insights_repository.dart';
import 'insights_helpers.dart';

const _s1 = 's0000001-0000-4000-8000-000000000000';
const _s2 = 's0000002-0000-4000-8000-000000000000';
const _run1 = 'run00001-0000-4000-8000-000000000000';
const _run3 = 'run00003-0000-4000-8000-000000000000';

const _reporter = {...insightsViewer, 'manager.reports.view'};
const _accountant = {...insightsViewer, 'manager.accounting.export', 'manager.finance.view'};

/// Records what the app asked the phone to share.
class _Shared {
  final files = <({List<int> bytes, String name, String mime})>[];
  final downloads = <String>[];
  Object? downloadError;

  List<dynamic> get overrides => [
        fileSharerProvider.overrideWithValue((bytes, name, mime) async => files.add((bytes: bytes, name: name, mime: mime))),
        urlDownloaderProvider.overrideWithValue((url) async {
          downloads.add(url);
          final e = downloadError;
          if (e != null) throw e;
          return [1, 2, 3];
        }),
      ];
}

String _day(DateTime d) => DateFormat('yyyy-MM-dd').format(d);

void main() {
  group('scheduled reports list', () {
    testWidgets('each schedule says when it runs, what it covers and how the last run went', (tester) async {
      await pumpInsights(tester, const SchedulesScreen(), permissions: _reporter, size: const Size(390, 1600));
      await settleInsights(tester);
      final first = find.byKey(const Key('schedule-$_s1'));
      expect(find.descendant(of: first, matching: find.text('Daily sales')), findsOneWidget);
      expect(find.descendant(of: first, matching: find.text('Every day at 8 am')), findsOneWidget);
      expect(find.descendant(of: first, matching: find.textContaining('Yesterday')), findsOneWidget);
      expect(find.descendant(of: first, matching: find.text('Partly sent')), findsOneWidget);
      expect(find.descendant(of: first, matching: find.textContaining('Next: ')), findsOneWidget);

      final second = find.byKey(const Key('schedule-$_s2'));
      expect(find.descendant(of: second, matching: find.text('Every Monday at 9 am')), findsOneWidget);
      expect(find.descendant(of: second, matching: find.text('Paused')), findsOneWidget);
      expect(find.descendant(of: second, matching: find.textContaining('Next: ')), findsNothing);
    });

    testWidgets('pausing sends the same schedule with active off', (tester) async {
      final repo = FakeInsightsRepository();
      await pumpInsights(tester, const SchedulesScreen(), repo: repo, permissions: _reporter, size: const Size(390, 1600));
      await settleInsights(tester);
      await tester.tap(find.byKey(const Key('pause-$_s1')));
      await settleInsights(tester);
      expect(repo.updated, hasLength(1));
      expect(repo.updated.single.$1, _s1);
      expect(repo.updated.single.$2.active, isFalse);
      expect(repo.updated.single.$2.name, 'Daily sales');
      expect(repo.updated.single.$2.recipientIds, ['u1', 'u2']);
    });

    testWidgets('Run now starts a run for that schedule', (tester) async {
      final repo = FakeInsightsRepository();
      await pumpInsights(tester, const SchedulesScreen(), repo: repo, permissions: _reporter, size: const Size(390, 1600));
      await settleInsights(tester);
      await tester.tap(find.byKey(const Key('run-now-$_s1')));
      await settleInsights(tester);
      expect(repo.runNowCalls, [_s1]);
      expect(find.textContaining('on its way'), findsOneWidget);
    });

    testWidgets('only the owner or an admin can delete, and it asks first', (tester) async {
      final repo = FakeInsightsRepository();
      final sch = repo.schedulesValue;
      // Schedule 2 belongs to someone else.
      final other = Schedule(
        id: sch.items[1].id,
        name: sch.items[1].name,
        kind: sch.items[1].kind,
        filters: sch.items[1].filters,
        frequency: sch.items[1].frequency,
        weekday: sch.items[1].weekday,
        hourIst: sch.items[1].hourIst,
        rangePreset: sch.items[1].rangePreset,
        zoneIds: null,
        recipients: sch.items[1].recipients,
        active: sch.items[1].active,
        owner: (id: 'u9', name: 'Someone Else'),
        nextRunAt: null,
        lastRun: null,
      );
      repo.schedulesValue = ScheduleList(items: [sch.items[0], other], kinds: sch.kinds);
      await pumpInsights(tester, const SchedulesScreen(), repo: repo, permissions: _reporter, size: const Size(390, 1600));
      await settleInsights(tester);
      expect(find.byKey(const Key('delete-$_s1')), findsOneWidget, reason: 'mine');
      expect(find.byKey(const Key('delete-$_s2')), findsNothing, reason: "someone else's");

      await tester.tap(find.byKey(const Key('delete-$_s1')));
      await settleInsights(tester);
      expect(repo.deleted, isEmpty, reason: 'asks first');
      await tester.tap(find.text('Delete'));
      await settleInsights(tester);
      expect(repo.deleted, [_s1]);

      await pumpInsights(tester, const SchedulesScreen(), repo: repo, permissions: _reporter, role: 'admin', size: const Size(390, 1600));
      await settleInsights(tester);
      expect(find.byKey(const Key('delete-$_s2')), findsOneWidget, reason: 'an admin can');
    });

    testWidgets('a manager who can run no report cannot make a schedule', (tester) async {
      final repo = FakeInsightsRepository();
      repo.schedulesValue = ScheduleList(items: const [], kinds: const []);
      await pumpInsights(tester, const SchedulesScreen(), repo: repo, permissions: _reporter);
      await settleInsights(tester);
      expect(find.byKey(const Key('new-schedule')), findsNothing);
      expect(find.textContaining('No scheduled reports'), findsOneWidget);
    });
  });

  group('schedule form', () {
    testWidgets('offers only the reports this person may run', (tester) async {
      await pumpInsights(tester, const ScheduleFormScreen(), permissions: _reporter, size: const Size(390, 2200));
      await settleInsights(tester);
      await tester.tap(find.byKey(const Key('sch-kind')));
      await settleInsights(tester);
      expect(find.text('Sales report'), findsWidgets);
      expect(find.text('Order report'), findsWidgets);
      expect(find.text('Cancellation report'), findsWidgets);
      expect(find.text('Cash reconciliation report'), findsNothing);
    });

    testWidgets('weekly asks for a weekday; daily does not', (tester) async {
      await pumpInsights(tester, const ScheduleFormScreen(), permissions: _reporter, size: const Size(390, 2200));
      await settleInsights(tester);
      expect(find.byKey(const Key('sch-weekday')), findsNothing);
      await tester.tap(find.byKey(const Key('sch-weekly')));
      await settleInsights(tester);
      expect(find.byKey(const Key('sch-weekday')), findsOneWidget);
      await tester.tap(find.byKey(const Key('sch-daily')));
      await settleInsights(tester);
      expect(find.byKey(const Key('sch-weekday')), findsNothing);
    });

    testWidgets('a recipient who can no longer receive it is disabled, with the reason', (tester) async {
      await pumpInsights(tester, ScheduleFormScreen(scheduleId: _s1), permissions: _reporter, size: const Size(390, 2600));
      await settleInsights(tester);
      final box = tester.widget<CheckboxListTile>(find.byKey(const Key('rcpt-u2')));
      expect(box.onChanged, isNull);
      expect(find.textContaining('can no longer receive this report'), findsOneWidget);
      expect(tester.widget<CheckboxListTile>(find.byKey(const Key('rcpt-u1'))).onChanged, isNotNull);
    });

    testWidgets('a new schedule is sent with its choices and one action id', (tester) async {
      final repo = FakeInsightsRepository();
      await pumpInsights(tester, const ScheduleFormScreen(), repo: repo, permissions: _reporter, size: const Size(390, 2800));
      await settleInsights(tester);
      await tester.enterText(find.byKey(const Key('sch-name')), 'Weekly orders');
      await tester.tap(find.byKey(const Key('sch-weekly')));
      await settleInsights(tester);
      await tester.tap(find.byKey(const Key('rcpt-u1')));
      await settleInsights(tester);
      await tester.ensureVisible(find.byKey(const Key('sch-save')));
      await tester.tap(find.byKey(const Key('sch-save')));
      await settleInsights(tester);
      expect(repo.created, hasLength(1));
      final d = repo.created.single;
      expect(d.name, 'Weekly orders');
      expect(d.frequency, ScheduleFrequency.weekly);
      expect(d.weekday, isNotNull);
      expect(d.recipientIds, ['u1']);
      expect(d.kind, 'sales');
    });

    testWidgets('a name and a recipient are required', (tester) async {
      final repo = FakeInsightsRepository();
      await pumpInsights(tester, const ScheduleFormScreen(), repo: repo, permissions: _reporter, size: const Size(390, 2800));
      await settleInsights(tester);
      await tester.ensureVisible(find.byKey(const Key('sch-save')));
      await tester.tap(find.byKey(const Key('sch-save')));
      await settleInsights(tester);
      expect(find.text('Give it a name'), findsOneWidget);
      expect(find.text('Choose at least one person to send it to'), findsOneWidget);
      expect(repo.created, isEmpty);
    });

    testWidgets('a dropped connection retries as the same action', (tester) async {
      final repo = FakeInsightsRepository();
      await pumpInsights(tester, const ScheduleFormScreen(), repo: repo, permissions: _reporter, size: const Size(390, 2800));
      await settleInsights(tester);
      await tester.enterText(find.byKey(const Key('sch-name')), 'Weekly orders');
      await tester.tap(find.byKey(const Key('rcpt-u1')));
      await tester.ensureVisible(find.byKey(const Key('sch-save')));
      repo.nextError = ApiException(0, 'network');
      await tester.tap(find.byKey(const Key('sch-save')));
      await settleInsights(tester);
      await tester.tap(find.byKey(const Key('sch-save')));
      await settleInsights(tester);
      expect(repo.created, hasLength(2));
      expect(repo.created[0].clientActionId, repo.created[1].clientActionId);
    });

    testWidgets('when the server says someone cannot receive it, that person is disabled', (tester) async {
      final repo = FakeInsightsRepository();
      await pumpInsights(tester, const ScheduleFormScreen(), repo: repo, permissions: _reporter, size: const Size(390, 2800));
      await settleInsights(tester);
      await tester.enterText(find.byKey(const Key('sch-name')), 'Weekly orders');
      await tester.tap(find.byKey(const Key('rcpt-u1')));
      await tester.ensureVisible(find.byKey(const Key('sch-save')));
      repo.nextOutcome = const Refused<Schedule>('recipient_ineligible', [], null, {'ids': ['u1']});
      await tester.tap(find.byKey(const Key('sch-save')));
      await settleInsights(tester);
      expect(find.text("Someone you chose can't receive this report."), findsOneWidget);
      expect(tester.widget<CheckboxListTile>(find.byKey(const Key('rcpt-u1'))).onChanged, isNull);
    });

    testWidgets('editing saves to that schedule', (tester) async {
      final repo = FakeInsightsRepository();
      await pumpInsights(tester, ScheduleFormScreen(scheduleId: _s1), repo: repo, permissions: _reporter, size: const Size(390, 2800));
      await settleInsights(tester);
      await tester.enterText(find.byKey(const Key('sch-name')), 'Daily sales (new name)');
      await tester.ensureVisible(find.byKey(const Key('sch-save')));
      await tester.tap(find.byKey(const Key('sch-save')));
      await settleInsights(tester);
      expect(repo.updated.single.$1, _s1);
      expect(repo.updated.single.$2.name, 'Daily sales (new name)');
    });
  });

  group('run history and one run', () {
    testWidgets('runs show their status in words, with who was skipped and why', (tester) async {
      await pumpInsights(tester, const ScheduleRunsScreen(scheduleId: _s1), permissions: _reporter, size: const Size(390, 1600));
      await settleInsights(tester);
      expect(find.text('Partly sent'), findsOneWidget);
      expect(find.text('Sent'), findsOneWidget);
      expect(find.text('Too big to send'), findsOneWidget);
      expect(find.textContaining('Imran S'), findsOneWidget);
    });

    testWidgets('the run screen opens the PDF with a fresh link each time', (tester) async {
      final repo = FakeInsightsRepository();
      final shared = _Shared();
      await pumpInsights(tester, const ReportRunScreen(runId: _run1), repo: repo, permissions: _reporter, extra: shared.overrides);
      await settleInsights(tester);
      await tester.tap(find.byKey(const Key('open-pdf')));
      await settleInsights(tester);
      await tester.tap(find.byKey(const Key('open-pdf')));
      await settleInsights(tester);
      expect(repo.downloadCalls, [_run1, _run1], reason: 'a link is never kept');
      expect(shared.downloads, hasLength(2));
      expect(shared.files, hasLength(2));
      expect(shared.files.first.mime, 'application/pdf');
      expect(shared.files.first.name, endsWith('.pdf'));
    });

    testWidgets('a removed file is explained', (tester) async {
      final repo = FakeInsightsRepository()..downloadError = ApiException(410, 'expired');
      await pumpInsights(tester, const ReportRunScreen(runId: _run1), repo: repo, permissions: _reporter, extra: _Shared().overrides);
      await settleInsights(tester);
      await tester.tap(find.byKey(const Key('open-pdf')));
      await settleInsights(tester);
      expect(find.text('This file has been removed (reports are kept for 90 days).'), findsOneWidget);
    });

    testWidgets('someone who can no longer open it is told so', (tester) async {
      final repo = FakeInsightsRepository()..downloadError = ApiException(403, 'permission_denied');
      await pumpInsights(tester, const ReportRunScreen(runId: _run1), repo: repo, permissions: _reporter, extra: _Shared().overrides);
      await settleInsights(tester);
      await tester.tap(find.byKey(const Key('open-pdf')));
      await settleInsights(tester);
      expect(find.text("You can no longer open this report. Ask an admin if that's a mistake."), findsOneWidget);
    });

    testWidgets('a report too big to send has no file, and says what to do', (tester) async {
      await pumpInsights(tester, const ReportRunScreen(runId: _run3), permissions: _reporter, extra: _Shared().overrides);
      await settleInsights(tester);
      expect(find.byKey(const Key('open-pdf')), findsNothing);
      expect(find.textContaining('too big to send'), findsWidgets);
      expect(find.textContaining('narrow'), findsOneWidget);
    });
  });

  group('accounting export', () {
    testWidgets('needs both the export switch and Finance', (tester) async {
      await pumpInsights(tester, const AccountingScreen(), permissions: {...insightsViewer, 'manager.accounting.export'});
      await settleInsights(tester);
      expect(find.textContaining("don't have access"), findsOneWidget);
      expect(find.byKey(const Key('dl-tally')), findsNothing);
    });

    testWidgets('shows the vouchers, the totals, and every reconciliation line', (tester) async {
      await pumpInsights(tester, const AccountingScreen(), permissions: _accountant, size: const Size(390, 3000), extra: _Shared().overrides);
      await settleInsights(tester);
      for (final n in [
        'DLG-SALES-20261020-bemetara',
        'DLG-COMMISSION-20261020-bemetara',
        'DLG-VENDORPAYOUT-20261021-bemetara',
        'DLG-RIDERSALARY-20261021-bemetara',
      ]) {
        expect(find.byKey(Key('voucher-$n')), findsOneWidget, reason: n);
      }
      expect(find.byKey(const Key('recon-customerPaid')), findsOneWidget);
      expect(find.descendant(of: find.byKey(const Key('recon-customerPaid')), matching: find.text('Matches Finance')), findsOneWidget);
      expect(find.descendant(of: find.byKey(const Key('recon-riderPayoutsCompleted')), matching: find.textContaining('Finance shows ₹500 more')), findsOneWidget);
      expect(find.textContaining('Debit and credit both'), findsOneWidget);
    });

    testWidgets('Tally XML downloads with the masters option and the contract file name', (tester) async {
      final repo = FakeInsightsRepository();
      final shared = _Shared();
      await pumpInsights(tester, const AccountingScreen(), repo: repo, permissions: _accountant, size: const Size(390, 3000), extra: shared.overrides);
      await settleInsights(tester);
      final r = repo.fileCalls;
      await tester.ensureVisible(find.byKey(const Key('tally-masters')));
      await tester.tap(find.byKey(const Key('tally-masters')));
      await tester.tap(find.byKey(const Key('dl-tally')));
      await settleInsights(tester);
      expect(r.single.format, 'tally');
      expect(r.single.masters, isTrue);
      final from = r.single.from;
      final to = r.single.to;
      expect(shared.files.single.name, 'deligro-tally-$from-$to.xml');
      expect(shared.files.single.mime, 'application/xml');
    });

    testWidgets('the journal CSV downloads under its contract name', (tester) async {
      final repo = FakeInsightsRepository();
      final shared = _Shared();
      await pumpInsights(tester, const AccountingScreen(), repo: repo, permissions: _accountant, size: const Size(390, 3000), extra: shared.overrides);
      await settleInsights(tester);
      await tester.ensureVisible(find.byKey(const Key('dl-journal')));
      await tester.tap(find.byKey(const Key('dl-journal')));
      await settleInsights(tester);
      expect(repo.fileCalls.single.format, 'journal');
      expect(repo.fileCalls.single.masters, isFalse);
      expect(shared.files.single.name, startsWith('deligro-journal-'));
      expect(shared.files.single.name, endsWith('.csv'));
    });

    testWidgets('an unbalanced voucher names itself and nothing is exported', (tester) async {
      final repo = FakeInsightsRepository()
        ..fileError = ApiException(409, 'unbalanced', body: {'voucher': 'DLG-SALES-20261020-bemetara'});
      final shared = _Shared();
      await pumpInsights(tester, const AccountingScreen(), repo: repo, permissions: _accountant, size: const Size(390, 3000), extra: shared.overrides);
      await settleInsights(tester);
      await tester.ensureVisible(find.byKey(const Key('dl-tally')));
      await tester.tap(find.byKey(const Key('dl-tally')));
      await settleInsights(tester);
      expect(find.textContaining('DLG-SALES-20261020-bemetara'), findsWidgets);
      expect(find.textContaining('nothing was exported'), findsOneWidget);
      expect(shared.files, isEmpty);
    });

    testWidgets('a range over a year is explained; picking 7 days asks for exactly those days', (tester) async {
      final repo = FakeInsightsRepository();
      await pumpInsights(tester, const AccountingScreen(), repo: repo, permissions: _accountant, size: const Size(390, 3000), extra: _Shared().overrides);
      await settleInsights(tester);
      await tester.tap(find.byKey(const Key('range-7')));
      await settleInsights(tester);
      final today = istToday();
      expect(repo.accountingCalls.last.$1, _day(today.subtract(const Duration(days: 6))));
      expect(repo.accountingCalls.last.$2, _day(today));

      repo.nextError = ApiException(400, 'range_too_long');
      await tester.tap(find.byKey(const Key('range-90')));
      await settleInsights(tester);
      expect(find.text('Pick a range of a year or less.'), findsOneWidget);
    });

    testWidgets('asks for the chosen area', (tester) async {
      final repo = FakeInsightsRepository();
      await pumpInsights(tester, const AccountingScreen(), repo: repo, permissions: _accountant, extra: _Shared().overrides);
      await settleInsights(tester);
      chooseCity(tester);
      await settleInsights(tester);
      expect(repo.accountingCalls.last.$3, 'city:c1');
    });
  });

  group('a delivered report opens its run', () {
    test('from a push and from an inbox row', () {
      const url = '/more/insights/reports/runs/run00001-0000-4000-8000-000000000000';
      expect(inAppPathFrom(null, {'url': url}), url);
      expect(inAppPathFrom(url, null), url);
      expect(safeAppPath(url), url);
    });

    test('a link to anywhere else is still refused', () {
      expect(safeAppPath('https://example.test/more/insights/reports/runs/x'), isNull);
      expect(safeAppPath('/more/../admin'), isNull);
    });
  });
}
