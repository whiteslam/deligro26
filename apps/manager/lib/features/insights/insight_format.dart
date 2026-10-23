import 'package:intl/intl.dart';

/// An instant on India's clock. Forecast hours are sent as UTC instants of IST
/// hour starts; the manager reads them in IST whatever the phone's zone is.
DateTime istOf(DateTime at) => at.toUtc().add(const Duration(hours: 5, minutes: 30));

/// 0 → "12 am", 13 → "1 pm".
String hourWord(int hour) {
  final h = hour % 12 == 0 ? 12 : hour % 12;
  return '$h ${hour < 12 ? 'am' : 'pm'}';
}

/// "Fri" for `2026-10-23`.
String weekdayShort(String date) {
  final d = DateTime.tryParse(date);
  return d == null ? date : DateFormat('EEE').format(d);
}

/// "Fri 23 Oct" for `2026-10-23`.
String dayWords(String date) {
  final d = DateTime.tryParse(date);
  return d == null ? date : DateFormat('EEE d MMM').format(d);
}

/// The IST day of an instant, `YYYY-MM-DD`.
String istDay(DateTime at) => DateFormat('yyyy-MM-dd').format(istOf(at));

/// "6.4" below ten, whole numbers above: a forecast is never more exact than that.
String ordersWord(double n) => n < 10 ? n.toStringAsFixed(1) : n.round().toString();

/// 0.22 → "22%".
String percentWord(double ratio) => '${(ratio * 100).round()}%';

/// "+8%" / "−5%" / "0%".
String signedPercent(int pct) => pct > 0 ? '+$pct%' : pct < 0 ? '−${pct.abs()}%' : '0%';

/// A number without a trailing ".0".
String plain(num n) => n == n.roundToDouble() ? n.round().toString() : n.toStringAsFixed(1);

/// "27 min", "3.2 min", or a dash when there is nothing to say.
String minutesWord(double? m) => m == null ? '—' : '${m < 10 ? plain(double.parse(m.toStringAsFixed(1))) : m.round()} min';

/// "1.8 km".
String kmWord(double? km) => km == null ? '—' : '${plain(double.parse(km.toStringAsFixed(1)))} km';

/// "25 Sep – 22 Oct" for two `YYYY-MM-DD` days.
String rangeWords(String from, String to) {
  final a = DateTime.tryParse(from);
  final b = DateTime.tryParse(to);
  if (a == null || b == null) return '$from – $to';
  final f = DateFormat('d MMM');
  return a == b ? f.format(a) : '${f.format(a)} – ${f.format(b)}';
}
