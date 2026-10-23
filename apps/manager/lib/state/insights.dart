import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/insights.dart';
import '../widgets/zone_picker.dart' show areaFilterProvider;
import 'providers.dart';

// Every read follows the area picker: a zone id, a `city:<id>` token or null.
// The API client turns the token into `city=` on the way out.

/// Demand for the next 7 days and how wrong the forecast has been (§17.1).
final demandProvider = FutureProvider.autoDispose<DemandForecast>(
  (ref) => ref.read(insightsRepoProvider).demand(zoneId: ref.watch(areaFilterProvider)?.id),
  retry: (_, _) => null,
);

/// Riders needed each hour against riders usually online (§17.2).
final ridersNeededProvider = FutureProvider.autoDispose<RidersNeeded>(
  (ref) => ref.read(insightsRepoProvider).riders(zoneId: ref.watch(areaFilterProvider)?.id),
  retry: (_, _) => null,
);
