import 'dart:async';
import 'dart:math';

import 'package:shared_preferences/shared_preferences.dart';

/// Where the install id is kept.
const installIdKey = 'install-id';

final _uuid = RegExp(
  r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
  caseSensitive: false,
);

/// A random id made once per install and kept on the phone.
///
/// It is sent with every API call as `x-device-id`. Deligro uses it only to
/// notice one coupon being redeemed by several accounts from the same phone:
/// the server stores a salted hash of it with an order, never the id itself.
/// It is not tied to a person, a number or an advertising id, and uninstalling
/// the app discards it.
String installId(SharedPreferences prefs, {Random? random}) {
  final existing = prefs.getString(installIdKey);
  if (existing != null && _uuid.hasMatch(existing)) return existing;

  final rng = random ?? Random.secure();
  final b = List<int>.generate(16, (_) => rng.nextInt(256));
  b[6] = (b[6] & 0x0f) | 0x40; // version 4
  b[8] = (b[8] & 0x3f) | 0x80; // variant 1
  String h(int i) => b[i].toRadixString(16).padLeft(2, '0');
  final id = '${h(0)}${h(1)}${h(2)}${h(3)}-${h(4)}${h(5)}-${h(6)}${h(7)}-${h(8)}${h(9)}-'
      '${h(10)}${h(11)}${h(12)}${h(13)}${h(14)}${h(15)}';
  unawaited(prefs.setString(installIdKey, id));
  return id;
}
