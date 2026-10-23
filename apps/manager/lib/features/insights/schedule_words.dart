import 'package:intl/intl.dart';

import '../../models/insights.dart';
import 'insight_format.dart';

const weekdayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/// "Every day at 8 am", "Every Monday at 9 am".
String cadenceWords(Schedule s) {
  final at = hourWord(s.hourIst);
  if (s.frequency == ScheduleFrequency.daily) return 'Every day at $at';
  final d = s.weekday;
  final name = d == null || d < 1 || d > 7 ? 'week' : weekdayNames[d - 1];
  return 'Every $name at $at';
}

/// What period each report covers, as the schedule's preset names it.
String presetWords(RangePreset p) => switch (p) {
      RangePreset.yesterday => 'Yesterday',
      RangePreset.last7Days => 'The last 7 days',
      RangePreset.lastWeek => 'The previous week (Monday to Sunday)',
      RangePreset.monthToDate => 'This month so far',
      RangePreset.lastMonth => 'The previous month',
    };

String runStatusWords(RunStatus s) => switch (s) {
      RunStatus.sent => 'Sent',
      RunStatus.partial => 'Partly sent',
      RunStatus.tooLarge => 'Too big to send',
      RunStatus.failed => 'Failed',
    };

/// "Fri 23 Oct, 8:00 am" on India's clock.
String istStamp(DateTime at) => DateFormat('EEE d MMM, h:mm a').format(istOf(at)).replaceAll('AM', 'am').replaceAll('PM', 'pm');

/// Why a recipient was skipped when a run went out.
String skipReasonWords(String reason) => switch (reason) {
      'permission' => 'no longer has permission for this report',
      'zone' => 'no longer covers every area of this report',
      _ => 'could not receive it',
    };
