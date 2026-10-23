// The install id behind coupon-sharing detection: made once per install, sent
// on every API call, and never anything but a random uuid. No network.

import 'dart:math';

import 'package:deligro_customer/core/api.dart';
import 'package:deligro_customer/core/device_id.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

final _client = SupabaseClient(
  'http://localhost:1',
  'test-key',
  authOptions: const AuthClientOptions(autoRefreshToken: false),
);

final _v4 = RegExp(
  r'^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$',
);

void main() {
  group('installId', () {
    test('is a random version 4 uuid, kept for next time', () async {
      SharedPreferences.setMockInitialValues({});
      final prefs = await SharedPreferences.getInstance();
      final id = installId(prefs, random: Random(7));
      expect(_v4.hasMatch(id), isTrue, reason: id);
      expect(prefs.getString(installIdKey), id);
      // A second ask answers with the same id, whatever the random source.
      expect(installId(prefs, random: Random(99)), id);
    });

    test('two installs get different ids', () async {
      SharedPreferences.setMockInitialValues({});
      final a = installId(await SharedPreferences.getInstance(), random: Random(1));
      SharedPreferences.setMockInitialValues({});
      final b = installId(await SharedPreferences.getInstance(), random: Random(2));
      expect(a, isNot(b));
    });

    test('a damaged stored value is replaced, not sent', () async {
      SharedPreferences.setMockInitialValues({installIdKey: 'not-an-id'});
      final prefs = await SharedPreferences.getInstance();
      final id = installId(prefs, random: Random(3));
      expect(_v4.hasMatch(id), isTrue);
      expect(id, isNot('not-an-id'));
    });
  });

  group('ApiClient', () {
    Future<Map<String, String>> sentHeaders(String? deviceId) async {
      late Map<String, String> headers;
      final mock = MockClient((http.Request req) async {
        headers = req.headers;
        return http.Response('{}', 200, headers: {'content-type': 'application/json'});
      });
      await ApiClient(_client.auth, client: mock, deviceId: deviceId).get('/api/anything');
      return headers;
    }

    test('sends the install id as x-device-id', () async {
      final h = await sentHeaders('3f2a9c10-1111-4222-8333-444455556666');
      expect(h['x-device-id'], '3f2a9c10-1111-4222-8333-444455556666');
    });

    test('sends no header when there is no id', () async {
      final h = await sentHeaders(null);
      expect(h.containsKey('x-device-id'), isFalse);
    });
  });
}
