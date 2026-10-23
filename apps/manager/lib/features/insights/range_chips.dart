import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/format.dart' show istToday;
import '../../state/insights.dart';
import '../../theme/app_theme.dart';
import 'insight_format.dart';

/// 7 days · 28 days · 90 days · Custom, with the dates they mean. The choice
/// is shared by the zone map, the benchmarks and the service levels.
class RangeChips extends ConsumerWidget {
  const RangeChips({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final r = ref.watch(insightRangeProvider);
    final c = context.colors;
    Widget chip(String key, String label, bool selected, VoidCallback onTap) => ChoiceChip(
          key: Key(key),
          label: Text(label),
          selected: selected,
          onSelected: (_) => onTap(),
        );
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Wrap(spacing: 8, runSpacing: 8, children: [
        chip('range-7', '7 days', r.choice == RangeChoice.days7, () => ref.read(insightRangeProvider.notifier).setDays(7)),
        chip('range-28', '28 days', r.choice == RangeChoice.days28, () => ref.read(insightRangeProvider.notifier).setDays(28)),
        chip('range-90', '90 days', r.choice == RangeChoice.days90, () => ref.read(insightRangeProvider.notifier).setDays(90)),
        chip('range-custom', 'Custom', r.choice == RangeChoice.custom, () async {
          // India's today, not the phone's: the server refuses a range that
          // ends after the IST day, or one longer than a year.
          final today = istToday();
          final picked = await showDateRangePicker(
            context: context,
            firstDate: today.subtract(const Duration(days: 365)),
            lastDate: today,
            initialDateRange: DateTimeRange(start: DateTime.parse(r.from), end: DateTime.parse(r.to)),
            helpText: 'Pick a range (a year at most)',
          );
          if (picked != null) ref.read(insightRangeProvider.notifier).setCustom(picked);
        }),
      ]),
      const SizedBox(height: 6),
      Text(rangeWords(r.from, r.to), key: const Key('range-words'), style: TextStyle(fontSize: 12.5, color: c.muted)),
    ]);
  }
}
