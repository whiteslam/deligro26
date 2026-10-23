import 'dart:convert';

import 'package:deligro_manager/core/api.dart';
import 'package:deligro_manager/core/errors.dart';
import 'package:deligro_manager/data/insights_repository.dart';
import 'package:deligro_manager/models/insights.dart';
import 'package:deligro_manager/models/outcome.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'fixtures/fixtures.dart';

({ApiInsightsRepository repo, List<http.Request> sent}) _rig(http.Response Function(http.Request) answer) {
  final sent = <http.Request>[];
  final client = MockClient((req) async {
    sent.add(req);
    return answer(req);
  });
  return (repo: ApiInsightsRepository(ApiClient(GoTrueClient(url: 'http://x'), client: client)), sent: sent);
}

http.Response _json(Object body, [int status = 200]) =>
    http.Response(jsonEncode(body), status, headers: {'content-type': 'application/json'});

void main() {
  test('reads go to the pinned paths with the area filter', () async {
    final r = _rig((_) => _json(apiFixture('insights/demand')));
    await r.repo.demand(zoneId: 'city:c-bem');
    expect(r.sent.single.url.path, '/api/manager/insights/demand');
    expect(r.sent.single.url.queryParameters, {'city': 'c-bem'});

    await r.repo.demand(zoneId: 'z1');
    expect(r.sent.last.url.queryParameters, {'zone': 'z1'});
    await r.repo.demand();
    expect(r.sent.last.url.queryParameters, isEmpty);
  });

  test('zones, vendors, sla and accounting carry the range', () async {
    final r = _rig((req) {
      final name = req.url.pathSegments.last;
      return _json(apiFixture('insights/$name'));
    });
    await r.repo.zoneMap(from: '2026-09-25', to: '2026-10-22');
    await r.repo.vendors(from: '2026-09-25', to: '2026-10-22', page: 2);
    await r.repo.sla(from: '2026-09-25', to: '2026-10-22', zoneId: 'z1');
    await r.repo.accounting(from: '2026-10-20', to: '2026-10-21');
    expect(r.sent[0].url.queryParameters, {'from': '2026-09-25', 'to': '2026-10-22'});
    expect(r.sent[1].url.queryParameters, {'from': '2026-09-25', 'to': '2026-10-22', 'page': '2'});
    expect(r.sent[2].url.queryParameters, {'from': '2026-09-25', 'to': '2026-10-22', 'zone': 'z1'});
    expect(r.sent[3].url.queryParameters, {'from': '2026-10-20', 'to': '2026-10-21', 'format': 'summary'});
  });

  test('a write sends its clientActionId and reads the changed row back', () async {
    final r = _rig((_) => _json({
          'target': {
            'zoneId': 'z1',
            'inherited': false,
            'acceptMinutes': 6,
            'prepMinutes': 20,
            'pickupMinutes': 10,
            'deliverMinutes': 45,
            'updatedBy': {'id': 'u1', 'name': 'Asha'},
            'updatedAt': '2026-10-22T10:00:00.000Z',
          }
        }));
    final change = SlaTargetChange(zoneId: 'z1', acceptMinutes: 6, prepMinutes: 20, pickupMinutes: 10, deliverMinutes: 45, reason: 'Busy season');
    final out = await r.repo.setSlaTarget(change);
    expect(out, isA<Applied<SlaTarget>>());
    expect((out as Applied<SlaTarget>).value!.acceptMinutes, 6);
    final body = jsonDecode(r.sent.single.body) as Map;
    expect(r.sent.single.method, 'PUT');
    expect(body['clientActionId'], change.clientActionId);
    expect(body['reason'], 'Busy season');
  });

  test('a refusal comes back as Refused, a fault throws', () async {
    final refused = _rig((_) => _json({'error': 'bad_threshold', 'field': 'prepMinutes'}, 400));
    final out = await refused.repo.setSlaTarget(
        SlaTargetChange(zoneId: 'z1', acceptMinutes: 5, prepMinutes: 0, pickupMinutes: 10, deliverMinutes: 45, reason: 'Testing'));
    expect(out, isA<Refused<SlaTarget>>());
    expect((out as Refused<SlaTarget>).code, 'bad_threshold');
    expect(out.field, 'prepMinutes');

    final fault = _rig((_) => _json({'error': 'action_failed'}, 500));
    await expectLater(
      fault.repo.setDispatch(DispatchChange(zoneId: 'z1', mode: DispatchMode.autoAssign, autoAssignMaxLoad: 0, reason: 'Night shift')),
      throwsA(isA<ApiException>()),
    );
  });

  test('a range that is too long is a typed error with plain words', () async {
    final r = _rig((_) => _json({'error': 'range_too_long'}, 400));
    try {
      await r.repo.zoneMap(from: '2024-01-01', to: '2026-10-22');
      fail('should have thrown');
    } on ApiException catch (e) {
      expect(e.code, 'range_too_long');
      expect(e.friendly, 'Pick a range of a year or less.');
    }
    expect(friendlyError('range_in_future'), contains('after today'));
    expect(friendlyError('unbalanced'), contains('nothing was exported'));
  });

  test('dismissing a case posts days and reason to its alert', () async {
    final r = _rig((_) => _json({'case': (apiFixture('insights/fraud')['items'] as List).first}));
    final d = FraudDismissDraft(alertId: 'a1', reason: 'Known family order', days: 30);
    final out = await r.repo.dismissFraud(d);
    expect(out, isA<Applied<FraudCase>>());
    expect(r.sent.single.url.path, '/api/manager/insights/fraud/a1/dismiss');
    final body = jsonDecode(r.sent.single.body) as Map;
    expect(body, {'reason': 'Known family order', 'days': 30, 'clientActionId': d.clientActionId});
  });

  test('a schedule draft keeps one id across retries and drops the weekday when daily', () {
    final d = ScheduleDraft(
      name: 'Daily sales',
      kind: 'sales',
      filters: const ScheduleFilters(),
      frequency: ScheduleFrequency.daily,
      weekday: 3,
      hourIst: 8,
      rangePreset: RangePreset.lastWeek,
      zoneIds: null,
      recipientIds: const ['u1'],
    );
    final a = d.toJson();
    final b = d.toJson();
    expect(a['clientActionId'], b['clientActionId']);
    expect(a['weekday'], isNull);
    expect(a['rangePreset'], 'last_week');
    expect(a['recipients'], ['u1']);
  });

  test('the accounting file keeps the server file name, or falls back to the contract name', () async {
    final named = _rig((_) => http.Response('<ENVELOPE/>', 200,
        headers: {'content-type': 'application/xml; charset=utf-8', 'content-disposition': 'attachment; filename="deligro-tally-2026-10-20-2026-10-21.xml"'}));
    final f = await named.repo.accountingFile(format: 'tally', from: '2026-10-20', to: '2026-10-21', includeMasters: true);
    expect(f.fileName, 'deligro-tally-2026-10-20-2026-10-21.xml');
    expect(named.sent.single.url.queryParameters, {'from': '2026-10-20', 'to': '2026-10-21', 'format': 'tally', 'includeMasters': '1'});

    final bare = _rig((_) => http.Response('date,voucher_no\n', 200, headers: {'content-type': 'text/csv'}));
    final g = await bare.repo.accountingFile(format: 'journal', from: '2026-10-20', to: '2026-10-21');
    expect(g.fileName, 'deligro-journal-2026-10-20-2026-10-21.csv');
    expect(bare.sent.single.url.queryParameters.containsKey('includeMasters'), isFalse);
  });

  test('an unbalanced export is refused as JSON, never a partial file', () async {
    final r = _rig((_) => _json({'error': 'unbalanced', 'voucher': 'DLG-SALES-20261020-bemetara'}, 409));
    try {
      await r.repo.accountingFile(format: 'tally', from: '2026-10-20', to: '2026-10-21');
      fail('should have thrown');
    } on ApiException catch (e) {
      expect(e.status, 409);
      expect(e.code, 'unbalanced');
      expect(e.body['voucher'], 'DLG-SALES-20261020-bemetara');
    }
  });

  test('a SLA target reset names the zone and an action id in the query', () async {
    final r = _rig((_) => _json({'ok': true}));
    await r.repo.resetSlaTarget('z1', clientActionId: 'abc');
    expect(r.sent.single.method, 'DELETE');
    expect(r.sent.single.url.queryParameters, {'zone': 'z1', 'clientActionId': 'abc'});
  });
}
