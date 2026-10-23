import 'package:uuid/uuid.dart';

import '../core/api.dart';
import '../models/insights.dart';
import '../models/outcome.dart';

/// Insights (§17) — `/api/manager/insights/*`, `/api/manager/report-schedules*`
/// and `/api/manager/report-runs/*`.
///
/// Every read takes [zoneId], the area filter: a zone id, a `city:<id>` token
/// (turned into `city=` by the API client), or null for everything the manager
/// works. Writes that fail for a reason the manager can read come back as
/// [Refused]; faults throw, so the caller can retry with the same draft.
abstract interface class InsightsRepository {
  Future<DemandForecast> demand({String? zoneId});
  Future<RidersNeeded> riders({String? zoneId});

  Future<ZoneMap> zoneMap({required String from, required String to, String? zoneId});
  Future<VendorBenchmarks> vendors({required String from, required String to, String? zoneId, int page = 1});

  Future<SlaReport> sla({required String from, required String to, String? zoneId});
  Future<Outcome<SlaTarget>> setSlaTarget(SlaTargetChange c);

  /// Drops a zone's own targets so it inherits the default again.
  Future<Outcome<void>> resetSlaTarget(String zoneId, {String? clientActionId});

  Future<DispatchOverview> dispatch();
  Future<Outcome<DispatchZone>> setDispatch(DispatchChange c);

  Future<FraudPage> fraud({required FraudStatus status, String? rule, String? zoneId, String? cursor});
  Future<Outcome<FraudCase>> dismissFraud(FraudDismissDraft d);
  Future<FraudRulesView> fraudRules({String? zoneId});
  Future<Outcome<FraudRuleSetting>> setFraudRule(FraudRuleChange c);

  Future<ScheduleList> schedules();
  Future<Outcome<Schedule>> createSchedule(ScheduleDraft d);
  Future<Outcome<Schedule>> updateSchedule(String id, ScheduleDraft d);
  Future<Outcome<void>> deleteSchedule(String id);
  Future<RunPage> runs(String scheduleId, {String? cursor});

  /// Starts a run now; the value is the new run's id.
  Future<Outcome<String>> runNow(String scheduleId, {String? clientActionId});
  Future<ReportRun> run(String runId);

  /// A fresh 5-minute link; ask again each time, never keep one.
  Future<RunDownload> downloadUrl(String runId);

  Future<AccountingSummary> accounting({required String from, required String to, String? zoneId});

  /// [format] is `tally` or `journal`.
  Future<AccountingFile> accountingFile({
    required String format,
    required String from,
    required String to,
    String? zoneId,
    bool includeMasters = false,
  });
}

class ApiInsightsRepository implements InsightsRepository {
  ApiInsightsRepository(this._api);
  final ApiClient _api;

  static const _base = '/api/manager/insights';

  Map<String, String> _q({String? zoneId, String? from, String? to, Map<String, String?> extra = const {}}) => {
        'from': ?from,
        'to': ?to,
        'zone': ?zoneId,
        for (final e in extra.entries)
          if (e.value != null) e.key: e.value!,
      };

  static T? _pick<T>(Map<String, dynamic> res, String key, T Function(Map<String, dynamic>) parse) {
    final v = res[key];
    return v is Map ? parse(v.cast<String, dynamic>()) : null;
  }

  @override
  Future<DemandForecast> demand({String? zoneId}) async =>
      DemandForecast.fromJson(await _api.get('$_base/demand', query: _q(zoneId: zoneId)));

  @override
  Future<RidersNeeded> riders({String? zoneId}) async =>
      RidersNeeded.fromJson(await _api.get('$_base/riders', query: _q(zoneId: zoneId)));

  @override
  Future<ZoneMap> zoneMap({required String from, required String to, String? zoneId}) async =>
      ZoneMap.fromJson(await _api.get('$_base/zones', query: _q(zoneId: zoneId, from: from, to: to)));

  @override
  Future<VendorBenchmarks> vendors({required String from, required String to, String? zoneId, int page = 1}) async =>
      VendorBenchmarks.fromJson(
          await _api.get('$_base/vendors', query: _q(zoneId: zoneId, from: from, to: to, extra: {'page': '$page'})));

  @override
  Future<SlaReport> sla({required String from, required String to, String? zoneId}) async =>
      SlaReport.fromJson(await _api.get('$_base/sla', query: _q(zoneId: zoneId, from: from, to: to)));

  @override
  Future<Outcome<SlaTarget>> setSlaTarget(SlaTargetChange c) =>
      runAction<SlaTarget>(() => _api.put('$_base/sla-targets', c.toJson()), (r) => _pick(r, 'target', SlaTarget.fromJson));

  @override
  Future<Outcome<void>> resetSlaTarget(String zoneId, {String? clientActionId}) => runAction<void>(
        () => _api.delete('$_base/sla-targets?zone=${Uri.encodeQueryComponent(zoneId)}'
            '&clientActionId=${Uri.encodeQueryComponent(clientActionId ?? const Uuid().v4())}'),
        (_) {},
      );

  @override
  Future<DispatchOverview> dispatch() async => DispatchOverview.fromJson(await _api.get('$_base/dispatch'));

  @override
  Future<Outcome<DispatchZone>> setDispatch(DispatchChange c) =>
      runAction<DispatchZone>(() => _api.put('$_base/dispatch', c.toJson()), (r) => _pick(r, 'zone', DispatchZone.fromJson));

  @override
  Future<FraudPage> fraud({required FraudStatus status, String? rule, String? zoneId, String? cursor}) async =>
      FraudPage.fromJson(await _api.get('$_base/fraud',
          query: _q(zoneId: zoneId, extra: {'status': status.name, 'rule': rule, 'cursor': cursor})));

  @override
  Future<Outcome<FraudCase>> dismissFraud(FraudDismissDraft d) => runAction<FraudCase>(
        () => _api.post('$_base/fraud/${Uri.encodeComponent(d.alertId)}/dismiss', d.toJson()),
        (r) => _pick(r, 'case', FraudCase.fromJson),
      );

  @override
  Future<FraudRulesView> fraudRules({String? zoneId}) async =>
      FraudRulesView.fromJson(await _api.get('$_base/fraud-rules', query: _q(zoneId: zoneId)));

  @override
  Future<Outcome<FraudRuleSetting>> setFraudRule(FraudRuleChange c) => runAction<FraudRuleSetting>(
        () => _api.put('$_base/fraud-rules', c.toJson()),
        (r) => _pick(r, 'rule', FraudRuleSetting.fromJson),
      );

  @override
  Future<ScheduleList> schedules() async => ScheduleList.fromJson(await _api.get('/api/manager/report-schedules'));

  @override
  Future<Outcome<Schedule>> createSchedule(ScheduleDraft d) => runAction<Schedule>(
        () => _api.post('/api/manager/report-schedules', d.toJson()),
        (r) => _pick(r, 'schedule', Schedule.fromJson),
      );

  @override
  Future<Outcome<Schedule>> updateSchedule(String id, ScheduleDraft d) => runAction<Schedule>(
        () => _api.patch('/api/manager/report-schedules/${Uri.encodeComponent(id)}', d.toJson()),
        (r) => _pick(r, 'schedule', Schedule.fromJson),
      );

  @override
  Future<Outcome<void>> deleteSchedule(String id) =>
      runAction<void>(() => _api.delete('/api/manager/report-schedules/${Uri.encodeComponent(id)}'), (_) {});

  @override
  Future<RunPage> runs(String scheduleId, {String? cursor}) async => RunPage.fromJson(await _api.get(
        '/api/manager/report-schedules/${Uri.encodeComponent(scheduleId)}/runs',
        query: {'cursor': ?cursor},
      ));

  @override
  Future<Outcome<String>> runNow(String scheduleId, {String? clientActionId}) => runAction<String>(
        () => _api.post('/api/manager/report-schedules/${Uri.encodeComponent(scheduleId)}/run-now',
            {'clientActionId': clientActionId ?? const Uuid().v4()}),
        (r) => r['runId'] is String ? r['runId'] as String : null,
      );

  @override
  Future<ReportRun> run(String runId) async {
    final res = await _api.get('/api/manager/report-runs/${Uri.encodeComponent(runId)}');
    return ReportRun.fromJson((res['run'] as Map?)?.cast<String, dynamic>() ?? const {});
  }

  @override
  Future<RunDownload> downloadUrl(String runId) async =>
      RunDownload.fromJson(await _api.get('/api/manager/report-runs/${Uri.encodeComponent(runId)}/download'));

  @override
  Future<AccountingSummary> accounting({required String from, required String to, String? zoneId}) async =>
      AccountingSummary.fromJson(await _api.get('$_base/accounting',
          query: _q(zoneId: zoneId, from: from, to: to, extra: {'format': 'summary'})));

  @override
  Future<AccountingFile> accountingFile({
    required String format,
    required String from,
    required String to,
    String? zoneId,
    bool includeMasters = false,
  }) async {
    final f = await _api.getFile('$_base/accounting',
        query: _q(zoneId: zoneId, from: from, to: to, extra: {'format': format, 'includeMasters': includeMasters ? '1' : null}));
    final fallback = format == 'tally' ? 'deligro-tally-$from-$to.xml' : 'deligro-journal-$from-$to.csv';
    return AccountingFile(bytes: f.bytes, fileName: f.fileName ?? fallback, mime: f.contentType);
  }
}
