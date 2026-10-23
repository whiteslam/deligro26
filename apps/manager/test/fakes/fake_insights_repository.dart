import 'package:deligro_manager/data/insights_repository.dart';
import 'package:deligro_manager/models/insights.dart';
import 'package:deligro_manager/models/outcome.dart';

import '../fixtures/fixtures.dart';

Map<String, dynamic> _ins(String name) => apiFixture('insights/$name');

/// Insights held in memory: reads come from the contract fixtures, writes are
/// recorded, and a queued [Refused] (or error) is returned once.
class FakeInsightsRepository implements InsightsRepository {
  FakeInsightsRepository({String demandFixture = 'demand', String ridersFixture = 'riders'})
      : demandValue = DemandForecast.fromJson(_ins(demandFixture)),
        ridersValue = RidersNeeded.fromJson(_ins(ridersFixture));

  DemandForecast demandValue;
  RidersNeeded ridersValue;
  ZoneMap zoneMapValue = ZoneMap.fromJson(_ins('zones'));
  VendorBenchmarks vendorsValue = VendorBenchmarks.fromJson(_ins('vendors'));
  SlaReport slaValue = SlaReport.fromJson(_ins('sla'));
  DispatchOverview dispatchValue = DispatchOverview.fromJson(_ins('dispatch'));
  FraudPage fraudValue = FraudPage.fromJson(_ins('fraud'));
  FraudRulesView fraudRulesValue = FraudRulesView.fromJson(_ins('fraud_rules'));
  ScheduleList schedulesValue = ScheduleList.fromJson(_ins('schedules'));
  RunPage runsValue = RunPage.fromJson(_ins('runs'));
  AccountingSummary accountingValue = AccountingSummary.fromJson(_ins('accounting'));

  /// Thrown (once) by the next call of any method, then cleared.
  Object? nextError;

  /// Returned (once) by the next write.
  Outcome<dynamic>? nextOutcome;

  /// What the next [downloadUrl] answers, and what it throws.
  RunDownload download = RunDownload.fromJson(_ins('download'));
  Object? downloadError;

  final demandCalls = <String?>[];
  final ridersCalls = <String?>[];
  final zoneMapCalls = <(String, String, String?)>[];
  final vendorCalls = <(String, String, String?, int)>[];
  final slaCalls = <(String, String, String?)>[];
  final slaChanges = <SlaTargetChange>[];
  final slaResets = <String>[];
  final dispatchChanges = <DispatchChange>[];
  final fraudCalls = <(FraudStatus, String?, String?)>[];
  final dismissals = <FraudDismissDraft>[];
  final fraudRuleChanges = <FraudRuleChange>[];
  final created = <ScheduleDraft>[];
  final updated = <(String, ScheduleDraft)>[];
  final deleted = <String>[];
  final runNowCalls = <String>[];
  final downloadCalls = <String>[];
  final accountingCalls = <(String, String, String?)>[];
  final fileCalls = <({String format, String from, String to, bool masters})>[];

  AccountingFile? fileValue;
  Object? fileError;

  void _maybeThrow() {
    final e = nextError;
    if (e != null) {
      nextError = null;
      throw e;
    }
  }

  Outcome<T>? _queued<T>() {
    final o = nextOutcome;
    if (o == null) return null;
    nextOutcome = null;
    return o as Outcome<T>;
  }

  @override
  Future<DemandForecast> demand({String? zoneId}) async {
    demandCalls.add(zoneId);
    _maybeThrow();
    return demandValue;
  }

  @override
  Future<RidersNeeded> riders({String? zoneId}) async {
    ridersCalls.add(zoneId);
    _maybeThrow();
    return ridersValue;
  }

  @override
  Future<ZoneMap> zoneMap({required String from, required String to, String? zoneId}) async {
    zoneMapCalls.add((from, to, zoneId));
    _maybeThrow();
    return zoneMapValue;
  }

  @override
  Future<VendorBenchmarks> vendors({required String from, required String to, String? zoneId, int page = 1}) async {
    vendorCalls.add((from, to, zoneId, page));
    _maybeThrow();
    return vendorsValue;
  }

  @override
  Future<SlaReport> sla({required String from, required String to, String? zoneId}) async {
    slaCalls.add((from, to, zoneId));
    _maybeThrow();
    return slaValue;
  }

  @override
  Future<Outcome<SlaTarget>> setSlaTarget(SlaTargetChange c) async {
    slaChanges.add(c);
    _maybeThrow();
    final q = _queued<SlaTarget>();
    if (q != null) return q;
    return Applied(SlaTarget(
      zoneId: c.zoneId,
      inherited: false,
      acceptMinutes: c.acceptMinutes,
      prepMinutes: c.prepMinutes,
      pickupMinutes: c.pickupMinutes,
      deliverMinutes: c.deliverMinutes,
      updatedBy: (id: 'u1', name: 'Asha Verma'),
      updatedAt: DateTime.utc(2026, 10, 22),
    ));
  }

  @override
  Future<Outcome<void>> resetSlaTarget(String zoneId, {String? clientActionId}) async {
    slaResets.add(zoneId);
    _maybeThrow();
    return _queued<void>() ?? const Applied<void>();
  }

  @override
  Future<DispatchOverview> dispatch() async {
    _maybeThrow();
    return dispatchValue;
  }

  @override
  Future<Outcome<DispatchZone>> setDispatch(DispatchChange c) async {
    dispatchChanges.add(c);
    _maybeThrow();
    final q = _queued<DispatchZone>();
    if (q != null) return q;
    final old = dispatchValue.zones.firstWhere((z) => z.zoneId == c.zoneId);
    return Applied(DispatchZone(
      zoneId: old.zoneId,
      name: old.name,
      cityName: old.cityName,
      mode: c.mode,
      autoAssignMaxLoad: c.autoAssignMaxLoad,
      updatedBy: (id: 'u1', name: 'Asha Verma'),
      updatedAt: DateTime.utc(2026, 10, 22),
      last24h: old.last24h,
    ));
  }

  @override
  Future<FraudPage> fraud({required FraudStatus status, String? rule, String? zoneId, String? cursor}) async {
    fraudCalls.add((status, rule, zoneId));
    _maybeThrow();
    final items = [
      for (final c in fraudValue.items)
        if (c.status == status || (status == FraudStatus.open && c.status == FraudStatus.acknowledged))
          if (rule == null || fraudRuleWire(c.rule) == rule) c,
    ];
    return FraudPage(items: items, nextCursor: null, counts: fraudValue.counts);
  }

  @override
  Future<Outcome<FraudCase>> dismissFraud(FraudDismissDraft d) async {
    dismissals.add(d);
    _maybeThrow();
    final q = _queued<FraudCase>();
    if (q != null) return q;
    final old = fraudValue.items.firstWhere((c) => c.alertId == d.alertId);
    final dismissed = FraudCase(
      alertId: old.alertId,
      rule: old.rule,
      severity: old.severity,
      status: FraudStatus.dismissed,
      zoneId: old.zoneId,
      openedAt: old.openedAt,
      subject: old.subject,
      measure: old.measure,
      evidence: old.evidence,
      dismissal: FraudDismissal(by: (id: 'u1', name: 'Asha Verma'), reason: d.reason, until: DateTime.utc(2026, 11, 21)),
    );
    fraudValue = FraudPage(
      items: [for (final c in fraudValue.items) c.alertId == d.alertId ? dismissed : c],
      nextCursor: null,
      counts: FraudCounts(open: fraudValue.counts.open - 1, dismissed: fraudValue.counts.dismissed + 1, resolved: fraudValue.counts.resolved),
    );
    return Applied(dismissed);
  }

  @override
  Future<FraudRulesView> fraudRules({String? zoneId}) async {
    _maybeThrow();
    return fraudRulesValue;
  }

  @override
  Future<Outcome<FraudRuleSetting>> setFraudRule(FraudRuleChange c) async {
    fraudRuleChanges.add(c);
    _maybeThrow();
    final q = _queued<FraudRuleSetting>();
    if (q != null) return q;
    final old = fraudRulesValue.rules.firstWhere((r) => r.rule == c.rule);
    return Applied(FraudRuleSetting(
      rule: c.rule,
      zoneId: c.zoneId,
      inherited: false,
      enabled: c.enabled,
      threshold: c.threshold,
      windowDays: c.windowDays,
      unit: old.unit,
      label: old.label,
      description: old.description,
    ));
  }

  @override
  Future<ScheduleList> schedules() async {
    _maybeThrow();
    return schedulesValue;
  }

  @override
  Future<Outcome<Schedule>> createSchedule(ScheduleDraft d) async {
    created.add(d);
    _maybeThrow();
    final q = _queued<Schedule>();
    if (q != null) return q;
    final base = schedulesValue.items.first;
    final s = Schedule(
      id: 'new-${created.length}',
      name: d.name,
      kind: d.kind,
      filters: d.filters,
      frequency: d.frequency,
      weekday: d.weekday,
      hourIst: d.hourIst,
      rangePreset: d.rangePreset,
      zoneIds: d.zoneIds,
      recipients: [for (final r in base.recipients) if (d.recipientIds.contains(r.id)) r],
      active: d.active,
      owner: base.owner,
      nextRunAt: DateTime.utc(2026, 10, 24, 2, 30),
      lastRun: null,
    );
    schedulesValue = ScheduleList(items: [...schedulesValue.items, s], kinds: schedulesValue.kinds);
    return Applied(s);
  }

  @override
  Future<Outcome<Schedule>> updateSchedule(String id, ScheduleDraft d) async {
    updated.add((id, d));
    _maybeThrow();
    final q = _queued<Schedule>();
    if (q != null) return q;
    final old = schedulesValue.items.firstWhere((s) => s.id == id);
    final s = Schedule(
      id: id,
      name: d.name,
      kind: d.kind,
      filters: d.filters,
      frequency: d.frequency,
      weekday: d.weekday,
      hourIst: d.hourIst,
      rangePreset: d.rangePreset,
      zoneIds: d.zoneIds,
      recipients: old.recipients,
      active: d.active,
      owner: old.owner,
      nextRunAt: old.nextRunAt,
      lastRun: old.lastRun,
    );
    schedulesValue = ScheduleList(items: [for (final x in schedulesValue.items) x.id == id ? s : x], kinds: schedulesValue.kinds);
    return Applied(s);
  }

  @override
  Future<Outcome<void>> deleteSchedule(String id) async {
    deleted.add(id);
    _maybeThrow();
    final q = _queued<void>();
    if (q != null) return q;
    schedulesValue = ScheduleList(items: [for (final x in schedulesValue.items) if (x.id != id) x], kinds: schedulesValue.kinds);
    return const Applied<void>();
  }

  @override
  Future<RunPage> runs(String scheduleId, {String? cursor}) async {
    _maybeThrow();
    return runsValue;
  }

  @override
  Future<Outcome<String>> runNow(String scheduleId, {String? clientActionId}) async {
    runNowCalls.add(scheduleId);
    _maybeThrow();
    return _queued<String>() ?? const Applied('run-new');
  }

  @override
  Future<ReportRun> run(String runId) async {
    _maybeThrow();
    return runsValue.items.firstWhere((r) => r.id == runId, orElse: () => runsValue.items.first);
  }

  @override
  Future<RunDownload> downloadUrl(String runId) async {
    downloadCalls.add(runId);
    final e = downloadError;
    if (e != null) throw e;
    return download;
  }

  @override
  Future<AccountingSummary> accounting({required String from, required String to, String? zoneId}) async {
    accountingCalls.add((from, to, zoneId));
    _maybeThrow();
    return accountingValue;
  }

  @override
  Future<AccountingFile> accountingFile({
    required String format,
    required String from,
    required String to,
    String? zoneId,
    bool includeMasters = false,
  }) async {
    fileCalls.add((format: format, from: from, to: to, masters: includeMasters));
    final e = fileError;
    if (e != null) throw e;
    return fileValue ??
        AccountingFile(
          bytes: format == 'tally' ? '<ENVELOPE/>'.codeUnits : 'date,voucher_no\n'.codeUnits,
          fileName: format == 'tally' ? 'deligro-tally-$from-$to.xml' : 'deligro-journal-$from-$to.csv',
          mime: format == 'tally' ? 'application/xml' : 'text/csv',
        );
  }
}
