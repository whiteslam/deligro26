import 'package:latlong2/latlong.dart';
import 'package:uuid/uuid.dart';

import 'json_util.dart';

const _uuid = Uuid();

// ─── Shared ────────────────────────────────────────────────────────────

/// Which part of the business a payload covers: everything this manager works,
/// one city, or one zone.
class InsightArea {
  const InsightArea({required this.type, required this.id, required this.name});
  final String type;
  final String? id;
  final String name;

  factory InsightArea.fromJson(Object? j) {
    final m = jMap(j) ?? const {};
    return InsightArea(type: jStrOr(m['type'], 'scope'), id: jStr(m['id']), name: jStrOr(m['name'], 'All my zones'));
  }
}

class InsightRange {
  const InsightRange({required this.from, required this.to});
  final String from;
  final String to;

  factory InsightRange.fromJson(Object? j) {
    final m = jMap(j) ?? const {};
    return InsightRange(from: jStrOr(m['from']), to: jStrOr(m['to']));
  }
}

LatLng? _latLng(Object? j) {
  final m = jMap(j);
  if (m == null || m['lat'] is! num || m['lng'] is! num) return null;
  return LatLng((m['lat'] as num).toDouble(), (m['lng'] as num).toDouble());
}

typedef PersonRef = ({String id, String name});

// ─── Demand forecast (§17.1) ───────────────────────────────────────────

class ForecastHour {
  const ForecastHour({
    required this.hourStart,
    required this.date,
    required this.weekday,
    required this.hour,
    required this.orders,
    required this.low,
    required this.high,
  });
  final DateTime? hourStart;

  /// The IST day, `YYYY-MM-DD`.
  final String date;

  /// 1 = Monday … 7 = Sunday.
  final int weekday;
  final int hour;
  final double orders;
  final double low;
  final double high;

  factory ForecastHour.fromJson(Map<String, dynamic> j) => ForecastHour(
        hourStart: jDate(j['hourStart']),
        date: jStrOr(j['date']),
        weekday: jInt(j['weekday']),
        hour: jInt(j['hour']),
        orders: jDouble(j['orders']),
        low: jDouble(j['low']),
        high: jDouble(j['high']),
      );
}

class ForecastDay {
  const ForecastDay({required this.date, required this.orders});
  final String date;
  final double orders;
  factory ForecastDay.fromJson(Map<String, dynamic> j) => ForecastDay(date: jStrOr(j['date']), orders: jDouble(j['orders']));
}

class DemandTrend {
  const DemandTrend({required this.factor, required this.last4Weeks, required this.prior4Weeks});
  final double factor;
  final int last4Weeks;
  final int prior4Weeks;

  /// "+8% vs the previous 4 weeks".
  int get changePct => ((factor - 1) * 100).round();

  factory DemandTrend.fromJson(Object? j) {
    final m = jMap(j) ?? const {};
    return DemandTrend(
      factor: m['factor'] is num ? jDouble(m['factor']) : 1,
      last4Weeks: jInt(m['last4Weeks']),
      prior4Weeks: jInt(m['prior4Weeks']),
    );
  }
}

class BacktestDay {
  const BacktestDay({required this.date, required this.forecast, required this.actual});
  final String date;
  final double forecast;
  final double actual;
  factory BacktestDay.fromJson(Map<String, dynamic> j) =>
      BacktestDay(date: jStrOr(j['date']), forecast: jDouble(j['forecast']), actual: jDouble(j['actual']));
}

/// How wrong the forecast was on the last 14 days, said honestly: [mape] and
/// [wape] are null — never zero — when there was nothing to compare.
class Backtest {
  const Backtest({required this.days, required this.hoursCompared, required this.mape, required this.wape, required this.byDay});
  final int days;
  final int hoursCompared;
  final double? mape;
  final double? wape;
  final List<BacktestDay> byDay;

  factory Backtest.fromJson(Object? j) {
    final m = jMap(j) ?? const {};
    return Backtest(
      days: jInt(m['days']),
      hoursCompared: jInt(m['hoursCompared']),
      mape: jDoubleOrNull(m['mape']),
      wape: jDoubleOrNull(m['wape']),
      byDay: [for (final d in jMaps(m['byDay'])) BacktestDay.fromJson(d)],
    );
  }
}

class DemandForecast {
  const DemandForecast({
    required this.generatedAt,
    required this.area,
    required this.insufficientHistory,
    required this.weeksOfHistory,
    required this.trend,
    required this.forecast,
    required this.daily,
    required this.peak,
    required this.backtest,
  });
  final DateTime? generatedAt;
  final InsightArea area;
  final bool insufficientHistory;
  final int weeksOfHistory;
  final DemandTrend trend;
  final List<ForecastHour> forecast;
  final List<ForecastDay> daily;
  final ({DateTime? hourStart, double orders})? peak;
  final Backtest backtest;

  /// The hours of one IST day, in order.
  List<ForecastHour> hoursOn(String date) => [for (final h in forecast) if (h.date == date) h];

  factory DemandForecast.fromJson(Map<String, dynamic> j) {
    final p = jMap(j['peak']);
    return DemandForecast(
      generatedAt: jDate(j['generatedAt']),
      area: InsightArea.fromJson(j['area']),
      insufficientHistory: jBool(j['insufficientHistory']),
      weeksOfHistory: jInt(j['weeksOfHistory']),
      trend: DemandTrend.fromJson(j['trend']),
      forecast: [for (final h in jMaps(j['forecast'])) ForecastHour.fromJson(h)],
      daily: [for (final d in jMaps(j['daily'])) ForecastDay.fromJson(d)],
      peak: p == null ? null : (hourStart: jDate(p['hourStart']), orders: jDouble(p['orders'])),
      backtest: Backtest.fromJson(j['backtest']),
    );
  }
}

// ─── Riders needed (§17.2) ─────────────────────────────────────────────

/// Where the deliveries-per-rider-hour figure came from.
enum ProductivitySource {
  zone,
  platform,

  /// The wire word is `default`.
  fallback,
}

class Productivity {
  const Productivity({required this.deliveriesPerRiderHour, required this.sampleHours, required this.source});
  final double deliveriesPerRiderHour;
  final int sampleHours;
  final ProductivitySource source;

  factory Productivity.fromJson(Object? j) {
    final m = jMap(j) ?? const {};
    return Productivity(
      deliveriesPerRiderHour: m['deliveriesPerRiderHour'] is num ? jDouble(m['deliveriesPerRiderHour']) : 2,
      sampleHours: jInt(m['sampleHours']),
      source: jEnum(ProductivitySource.values, m['source'], ProductivitySource.fallback, (s) => s == ProductivitySource.fallback ? 'default' : s.name),
    );
  }
}

class RiderHour {
  const RiderHour({required this.hourStart, required this.forecastOrders, required this.ridersNeeded, required this.ridersUsuallyOnline, required this.gap});
  final DateTime? hourStart;
  final double forecastOrders;
  final int ridersNeeded;
  final double ridersUsuallyOnline;

  /// Needed minus usually online; positive = short.
  final double gap;

  factory RiderHour.fromJson(Map<String, dynamic> j) => RiderHour(
        hourStart: jDate(j['hourStart']),
        forecastOrders: jDouble(j['forecastOrders']),
        ridersNeeded: jInt(j['ridersNeeded']),
        ridersUsuallyOnline: jDouble(j['ridersUsuallyOnline']),
        gap: jDouble(j['gap']),
      );
}

class RiderDay {
  const RiderDay({required this.date, required this.peakNeeded, required this.peakUsual, required this.shortHours});
  final String date;
  final int peakNeeded;
  final double peakUsual;
  final int shortHours;
  factory RiderDay.fromJson(Map<String, dynamic> j) => RiderDay(
        date: jStrOr(j['date']),
        peakNeeded: jInt(j['peakNeeded']),
        peakUsual: jDouble(j['peakUsual']),
        shortHours: jInt(j['shortHours']),
      );
}

class RidersNeeded {
  const RidersNeeded({required this.generatedAt, required this.area, required this.productivity, required this.hours, required this.daily, required this.shortHours});
  final DateTime? generatedAt;
  final InsightArea area;
  final Productivity productivity;
  final List<RiderHour> hours;
  final List<RiderDay> daily;
  final int shortHours;

  factory RidersNeeded.fromJson(Map<String, dynamic> j) => RidersNeeded(
        generatedAt: jDate(j['generatedAt']),
        area: InsightArea.fromJson(j['area']),
        productivity: Productivity.fromJson(j['productivity']),
        hours: [for (final h in jMaps(j['hours'])) RiderHour.fromJson(h)],
        daily: [for (final d in jMaps(j['daily'])) RiderDay.fromJson(d)],
        shortHours: jInt(j['shortHours']),
      );
}

// ─── Zone map (§17.3) ──────────────────────────────────────────────────

class ZoneStat {
  const ZoneStat({
    required this.id,
    required this.name,
    required this.cityId,
    required this.cityName,
    required this.center,
    required this.radiusKm,
    required this.drops,
    required this.avgDeliveryMinutes,
    required this.medianDeliveryMinutes,
    required this.avgDistanceKm,
    required this.outsideRadiusShare,
    required this.ordersPerDay,
  });
  final String id;
  final String name;
  final String cityId;
  final String cityName;
  final LatLng? center;
  final double radiusKm;
  final int drops;
  final double? avgDeliveryMinutes;
  final double? medianDeliveryMinutes;
  final double? avgDistanceKm;
  final double outsideRadiusShare;
  final double ordersPerDay;

  factory ZoneStat.fromJson(Map<String, dynamic> j) => ZoneStat(
        id: jStrOr(j['id']),
        name: jStrOr(j['name']),
        cityId: jStrOr(j['cityId']),
        cityName: jStrOr(j['cityName']),
        center: _latLng(j['center']),
        radiusKm: jDouble(j['radiusKm']),
        drops: jInt(j['drops']),
        avgDeliveryMinutes: jDoubleOrNull(j['avgDeliveryMinutes']),
        medianDeliveryMinutes: jDoubleOrNull(j['medianDeliveryMinutes']),
        avgDistanceKm: jDoubleOrNull(j['avgDistanceKm']),
        outsideRadiusShare: jDouble(j['outsideRadiusShare']),
        ordersPerDay: jDouble(j['ordersPerDay']),
      );
}

class CityStat {
  const CityStat({
    required this.id,
    required this.name,
    required this.drops,
    required this.avgDeliveryMinutes,
    required this.medianDeliveryMinutes,
    required this.avgDistanceKm,
    required this.outsideRadiusShare,
    required this.ordersPerDay,
  });
  final String id;
  final String name;
  final int drops;
  final double? avgDeliveryMinutes;
  final double? medianDeliveryMinutes;
  final double? avgDistanceKm;
  final double outsideRadiusShare;
  final double ordersPerDay;

  factory CityStat.fromJson(Map<String, dynamic> j) => CityStat(
        id: jStrOr(j['id']),
        name: jStrOr(j['name']),
        drops: jInt(j['drops']),
        avgDeliveryMinutes: jDoubleOrNull(j['avgDeliveryMinutes']),
        medianDeliveryMinutes: jDoubleOrNull(j['medianDeliveryMinutes']),
        avgDistanceKm: jDoubleOrNull(j['avgDistanceKm']),
        outsideRadiusShare: jDouble(j['outsideRadiusShare']),
        ordersPerDay: jDouble(j['ordersPerDay']),
      );
}

class CellBounds {
  const CellBounds({required this.south, required this.west, required this.north, required this.east});
  final double south;
  final double west;
  final double north;
  final double east;
  factory CellBounds.fromJson(Object? j) {
    final m = jMap(j) ?? const {};
    return CellBounds(south: jDouble(m['south']), west: jDouble(m['west']), north: jDouble(m['north']), east: jDouble(m['east']));
  }
}

/// One 1 km square of drop-offs. Cells with fewer than three drops are never
/// sent, so no single household is a marker.
class GridCell {
  const GridCell({
    required this.key,
    required this.bounds,
    required this.center,
    required this.drops,
    required this.avgDeliveryMinutes,
    required this.medianDeliveryMinutes,
    required this.avgDistanceKm,
    required this.nearestZoneId,
    required this.distanceToZoneCenterKm,
    required this.insideZone,
  });
  final String key;
  final CellBounds bounds;
  final LatLng? center;
  final int drops;
  final double? avgDeliveryMinutes;
  final double? medianDeliveryMinutes;
  final double? avgDistanceKm;
  final String? nearestZoneId;
  final double? distanceToZoneCenterKm;
  final bool insideZone;

  factory GridCell.fromJson(Map<String, dynamic> j) => GridCell(
        key: jStrOr(j['key']),
        bounds: CellBounds.fromJson(j['bounds']),
        center: _latLng(j['center']),
        drops: jInt(j['drops']),
        avgDeliveryMinutes: jDoubleOrNull(j['avgDeliveryMinutes']),
        medianDeliveryMinutes: jDoubleOrNull(j['medianDeliveryMinutes']),
        avgDistanceKm: jDoubleOrNull(j['avgDistanceKm']),
        nearestZoneId: jStr(j['nearestZoneId']),
        distanceToZoneCenterKm: jDoubleOrNull(j['distanceToZoneCenterKm']),
        insideZone: jBool(j['insideZone']),
      );
}

enum SuggestionType { newZone, uncoveredDemand, slowArea, resizeZone, mergeZone, unknown }

SuggestionType _suggestionType(Object? v) => switch (v) {
      'new_zone' => SuggestionType.newZone,
      'uncovered_demand' => SuggestionType.uncoveredDemand,
      'slow_area' => SuggestionType.slowArea,
      'resize_zone' => SuggestionType.resizeZone,
      'merge_zone' => SuggestionType.mergeZone,
      _ => SuggestionType.unknown,
    };

class ZoneSuggestion {
  const ZoneSuggestion({required this.type, required this.warning, required this.zoneId, required this.text, required this.center});
  final SuggestionType type;
  final bool warning;
  final String? zoneId;
  final String text;
  final LatLng? center;

  factory ZoneSuggestion.fromJson(Map<String, dynamic> j) => ZoneSuggestion(
        type: _suggestionType(j['type']),
        warning: j['severity'] == 'warning',
        zoneId: jStr(j['zoneId']),
        text: jStrOr(j['text']),
        center: _latLng(j['center']),
      );
}

class ZoneMap {
  const ZoneMap({
    required this.generatedAt,
    required this.range,
    required this.area,
    required this.cellKm,
    required this.minCellDrops,
    required this.zones,
    required this.cities,
    required this.cells,
    required this.suggestions,
  });
  final DateTime? generatedAt;
  final InsightRange range;
  final InsightArea area;
  final double cellKm;
  final int minCellDrops;
  final List<ZoneStat> zones;
  final List<CityStat> cities;
  final List<GridCell> cells;
  final List<ZoneSuggestion> suggestions;

  factory ZoneMap.fromJson(Map<String, dynamic> j) => ZoneMap(
        generatedAt: jDate(j['generatedAt']),
        range: InsightRange.fromJson(j['range']),
        area: InsightArea.fromJson(j['area']),
        cellKm: j['cellKm'] is num ? jDouble(j['cellKm']) : 1,
        minCellDrops: j['minCellDrops'] is num ? jInt(j['minCellDrops']) : 3,
        zones: [for (final z in jMaps(j['zones'])) ZoneStat.fromJson(z)],
        cities: [for (final c in jMaps(j['cities'])) CityStat.fromJson(c)],
        cells: [for (final c in jMaps(j['cells'])) GridCell.fromJson(c)],
        suggestions: [for (final s in jMaps(j['suggestions'])) ZoneSuggestion.fromJson(s)],
      );
}

// ─── Vendor benchmarks (§17.5) ─────────────────────────────────────────

enum BetterWhen { lower, higher }

enum Verdict { better, worse, inLine, notEnoughData }

Verdict _verdict(Object? v) => switch (v) {
      'better' => Verdict.better,
      'worse' => Verdict.worse,
      'in_line' => Verdict.inLine,
      _ => Verdict.notEnoughData,
    };

class BenchMetric {
  const BenchMetric({required this.key, required this.label, required this.unit, required this.better});
  final String key;
  final String label;

  /// `minutes`, `ratio`, `stars` or `rupees`.
  final String unit;
  final BetterWhen better;
  factory BenchMetric.fromJson(Map<String, dynamic> j) => BenchMetric(
        key: jStrOr(j['key']),
        label: jStrOr(j['label']),
        unit: jStrOr(j['unit']),
        better: jEnum(BetterWhen.values, j['better'], BetterWhen.higher),
      );
}

Map<String, double?> _numMap(Object? v) => {for (final e in (jMap(v) ?? const {}).entries) e.key: jDoubleOrNull(e.value)};

class BenchGroup {
  const BenchGroup({required this.id, required this.name, required this.vendorsCompared, required this.medians});
  final String id;
  final String name;
  final int vendorsCompared;
  final Map<String, double?> medians;
  factory BenchGroup.fromJson(Map<String, dynamic> j, String idKey) => BenchGroup(
        id: jStrOr(j[idKey]),
        name: jStrOr(j['name']),
        vendorsCompared: jInt(j['vendorsCompared']),
        medians: _numMap(j['medians']),
      );
}

class VendorBench {
  const VendorBench({required this.id, required this.name, required this.zoneId, required this.orders, required this.values, required this.verdicts, required this.deltaPct});
  final String id;
  final String name;
  final String zoneId;
  final int orders;
  final Map<String, double?> values;
  final Map<String, Verdict> verdicts;
  final Map<String, double?> deltaPct;

  Verdict verdictOf(String metric) => verdicts[metric] ?? Verdict.notEnoughData;

  factory VendorBench.fromJson(Map<String, dynamic> j) => VendorBench(
        id: jStrOr(j['id']),
        name: jStrOr(j['name']),
        zoneId: jStrOr(j['zoneId']),
        orders: jInt(j['orders']),
        values: _numMap(j['values']),
        verdicts: {for (final e in (jMap(j['verdicts']) ?? const {}).entries) e.key: _verdict(e.value)},
        deltaPct: _numMap(j['deltaPct']),
      );
}

class VendorBenchmarks {
  const VendorBenchmarks({
    required this.generatedAt,
    required this.range,
    required this.area,
    required this.minOrders,
    required this.metrics,
    required this.zones,
    required this.cities,
    required this.vendors,
    required this.page,
    required this.pageSize,
    required this.total,
  });
  final DateTime? generatedAt;
  final InsightRange range;
  final InsightArea area;
  final int minOrders;
  final List<BenchMetric> metrics;
  final List<BenchGroup> zones;
  final List<BenchGroup> cities;
  final List<VendorBench> vendors;
  final int page;
  final int pageSize;
  final int total;

  bool get hasMore => page * pageSize < total;

  /// This page with [next] (the following page) added after it. Medians and
  /// metrics come from the first page; only the vendors and the page move on.
  VendorBenchmarks withMore(VendorBenchmarks next) {
    final seen = {for (final v in vendors) v.id};
    return VendorBenchmarks(
      generatedAt: generatedAt,
      range: range,
      area: area,
      minOrders: minOrders,
      metrics: metrics,
      zones: zones,
      cities: cities,
      vendors: [...vendors, for (final v in next.vendors) if (!seen.contains(v.id)) v],
      page: next.page,
      pageSize: pageSize,
      total: next.total,
    );
  }

  factory VendorBenchmarks.fromJson(Map<String, dynamic> j) => VendorBenchmarks(
        generatedAt: jDate(j['generatedAt']),
        range: InsightRange.fromJson(j['range']),
        area: InsightArea.fromJson(j['area']),
        minOrders: j['minOrders'] is num ? jInt(j['minOrders']) : 5,
        metrics: [for (final m in jMaps(j['metrics'])) BenchMetric.fromJson(m)],
        zones: [for (final z in jMaps(j['zones'])) BenchGroup.fromJson(z, 'zoneId')],
        cities: [for (final c in jMaps(j['cities'])) BenchGroup.fromJson(c, 'cityId')],
        vendors: [for (final v in jMaps(j['vendors'])) VendorBench.fromJson(v)],
        page: j['page'] is num ? jInt(j['page']) : 1,
        pageSize: j['pageSize'] is num ? jInt(j['pageSize']) : 50,
        total: jInt(j['total']),
      );
}

// ─── SLA (§17.9) ───────────────────────────────────────────────────────

enum SlaStage { accept, prep, pickup, deliver }

class StageStat {
  const StageStat({required this.orders, required this.breaches, required this.rate, required this.medianMinutes});
  final int orders;
  final int breaches;
  final double rate;
  final double? medianMinutes;

  static const empty = StageStat(orders: 0, breaches: 0, rate: 0, medianMinutes: null);

  static StageStat? maybe(Object? j) {
    final m = jMap(j);
    if (m == null) return null;
    return StageStat(orders: jInt(m['orders']), breaches: jInt(m['breaches']), rate: jDouble(m['rate']), medianMinutes: jDoubleOrNull(m['medianMinutes']));
  }
}

class SlaStages {
  const SlaStages({this.accept, this.prep, this.pickup, this.deliver});
  final StageStat? accept;
  final StageStat? prep;
  final StageStat? pickup;
  final StageStat? deliver;

  StageStat stage(SlaStage s) => (switch (s) {
        SlaStage.accept => accept,
        SlaStage.prep => prep,
        SlaStage.pickup => pickup,
        SlaStage.deliver => deliver,
      }) ??
      StageStat.empty;

  factory SlaStages.fromJson(Map<String, dynamic> j) => SlaStages(
        accept: StageStat.maybe(j['accept']),
        prep: StageStat.maybe(j['prep']),
        pickup: StageStat.maybe(j['pickup']),
        deliver: StageStat.maybe(j['deliver']),
      );
}

/// One zone's stage targets, or the platform default when [zoneId] is null.
class SlaTarget {
  const SlaTarget({
    required this.zoneId,
    required this.inherited,
    required this.acceptMinutes,
    required this.prepMinutes,
    required this.pickupMinutes,
    required this.deliverMinutes,
    required this.updatedBy,
    required this.updatedAt,
  });
  final String? zoneId;
  final bool inherited;
  final int acceptMinutes;
  final int prepMinutes;
  final int pickupMinutes;
  final int deliverMinutes;
  final PersonRef? updatedBy;
  final DateTime? updatedAt;

  int minutesFor(SlaStage s) => switch (s) {
        SlaStage.accept => acceptMinutes,
        SlaStage.prep => prepMinutes,
        SlaStage.pickup => pickupMinutes,
        SlaStage.deliver => deliverMinutes,
      };

  factory SlaTarget.fromJson(Map<String, dynamic> j) => SlaTarget(
        zoneId: jStr(j['zoneId']),
        inherited: jBool(j['inherited']),
        acceptMinutes: jInt(j['acceptMinutes']),
        prepMinutes: jInt(j['prepMinutes']),
        pickupMinutes: jInt(j['pickupMinutes']),
        deliverMinutes: jInt(j['deliverMinutes']),
        updatedBy: jRef(j['updatedBy']),
        updatedAt: jDate(j['updatedAt']),
      );
}

class SlaGroupRow {
  const SlaGroupRow({required this.id, required this.name, required this.stages});
  final String id;
  final String name;
  final SlaStages stages;
  factory SlaGroupRow.fromJson(Map<String, dynamic> j, String idKey) =>
      SlaGroupRow(id: jStrOr(j[idKey]), name: jStrOr(j['name']), stages: SlaStages.fromJson(j));
}

/// A vendor or a rider among the worst; riders carry a code.
class SlaPersonRow {
  const SlaPersonRow({required this.id, required this.name, required this.code, required this.stages});
  final String id;
  final String name;
  final String? code;
  final SlaStages stages;
  StageStat? get accept => stages.accept;
  StageStat? get prep => stages.prep;
  StageStat? get pickup => stages.pickup;
  StageStat? get deliver => stages.deliver;
  factory SlaPersonRow.fromJson(Map<String, dynamic> j) =>
      SlaPersonRow(id: jStrOr(j['id']), name: jStrOr(j['name']), code: jStr(j['code']), stages: SlaStages.fromJson(j));
}

class SlaDay {
  const SlaDay({required this.date, required this.rates});
  final String date;
  final Map<SlaStage, double> rates;
  double rate(SlaStage s) => rates[s] ?? 0;
  factory SlaDay.fromJson(Map<String, dynamic> j) => SlaDay(
        date: jStrOr(j['date']),
        rates: {for (final s in SlaStage.values) s: jDouble(j[s.name])},
      );
}

class SlaReport {
  const SlaReport({
    required this.generatedAt,
    required this.range,
    required this.area,
    required this.targets,
    required this.overall,
    required this.byZone,
    required this.byCity,
    required this.byVendor,
    required this.byRider,
    required this.daily,
  });
  final DateTime? generatedAt;
  final InsightRange range;
  final InsightArea area;
  final List<SlaTarget> targets;
  final SlaStages overall;
  final List<SlaGroupRow> byZone;
  final List<SlaGroupRow> byCity;
  final List<SlaPersonRow> byVendor;
  final List<SlaPersonRow> byRider;
  final List<SlaDay> daily;

  factory SlaReport.fromJson(Map<String, dynamic> j) => SlaReport(
        generatedAt: jDate(j['generatedAt']),
        range: InsightRange.fromJson(j['range']),
        area: InsightArea.fromJson(j['area']),
        targets: [for (final t in jMaps(j['targets'])) SlaTarget.fromJson(t)],
        overall: SlaStages.fromJson(jMap(j['overall']) ?? const {}),
        byZone: [for (final r in jMaps(j['byZone'])) SlaGroupRow.fromJson(r, 'zoneId')],
        byCity: [for (final r in jMaps(j['byCity'])) SlaGroupRow.fromJson(r, 'cityId')],
        byVendor: [for (final r in jMaps(j['byVendor'])) SlaPersonRow.fromJson(r)],
        byRider: [for (final r in jMaps(j['byRider'])) SlaPersonRow.fromJson(r)],
        daily: [for (final d in jMaps(j['daily'])) SlaDay.fromJson(d)],
      );
}

/// `PUT /api/manager/insights/sla-targets`. One draft = one `clientActionId`,
/// so a retry after a dropped connection is the same action.
class SlaTargetChange {
  SlaTargetChange({
    required this.zoneId,
    required this.acceptMinutes,
    required this.prepMinutes,
    required this.pickupMinutes,
    required this.deliverMinutes,
    required this.reason,
    String? clientActionId,
  }) : clientActionId = clientActionId ?? _uuid.v4();
  final String? zoneId;
  final int acceptMinutes;
  final int prepMinutes;
  final int pickupMinutes;
  final int deliverMinutes;
  final String reason;
  final String clientActionId;

  /// The server's bounds, so the form can refuse before sending.
  static const bounds = {
    SlaStage.accept: (1, 60),
    SlaStage.prep: (1, 180),
    SlaStage.pickup: (1, 120),
    SlaStage.deliver: (10, 240),
  };

  Map<String, dynamic> toJson() => {
        'zoneId': zoneId,
        'acceptMinutes': acceptMinutes,
        'prepMinutes': prepMinutes,
        'pickupMinutes': pickupMinutes,
        'deliverMinutes': deliverMinutes,
        'reason': reason,
        'clientActionId': clientActionId,
      };
}

// ─── Dispatch mode (§17.4) ─────────────────────────────────────────────

enum DispatchMode { offer, autoAssign }

class DispatchLast24h {
  const DispatchLast24h({required this.auto, required this.offerAccepted, required this.ops, required this.fellBackToOffer});
  final int auto;
  final int offerAccepted;
  final int ops;
  final int fellBackToOffer;
  factory DispatchLast24h.fromJson(Object? j) {
    final m = jMap(j) ?? const {};
    return DispatchLast24h(auto: jInt(m['auto']), offerAccepted: jInt(m['offerAccepted']), ops: jInt(m['ops']), fellBackToOffer: jInt(m['fellBackToOffer']));
  }
}

class DispatchZone {
  const DispatchZone({
    required this.zoneId,
    required this.name,
    required this.cityName,
    required this.mode,
    required this.autoAssignMaxLoad,
    required this.updatedBy,
    required this.updatedAt,
    required this.last24h,
  });
  final String zoneId;
  final String name;
  final String cityName;
  final DispatchMode mode;
  final int autoAssignMaxLoad;
  final PersonRef? updatedBy;
  final DateTime? updatedAt;
  final DispatchLast24h last24h;

  factory DispatchZone.fromJson(Map<String, dynamic> j) => DispatchZone(
        zoneId: jStrOr(j['zoneId']),
        name: jStrOr(j['name']),
        cityName: jStrOr(j['cityName']),
        mode: j['mode'] == 'auto_assign' ? DispatchMode.autoAssign : DispatchMode.offer,
        autoAssignMaxLoad: jInt(j['autoAssignMaxLoad']),
        updatedBy: jRef(j['updatedBy']),
        updatedAt: jDate(j['updatedAt']),
        last24h: DispatchLast24h.fromJson(j['last24h']),
      );
}

class DispatchOverview {
  const DispatchOverview({required this.zones, required this.canConfigure});
  final List<DispatchZone> zones;
  final bool canConfigure;
  factory DispatchOverview.fromJson(Map<String, dynamic> j) => DispatchOverview(
        zones: [for (final z in jMaps(j['zones'])) DispatchZone.fromJson(z)],
        canConfigure: jBool(j['canConfigure']),
      );
}

class DispatchChange {
  DispatchChange({required this.zoneId, required this.mode, required this.autoAssignMaxLoad, required this.reason, String? clientActionId})
      : clientActionId = clientActionId ?? _uuid.v4();
  final String zoneId;
  final DispatchMode mode;
  final int autoAssignMaxLoad;
  final String reason;
  final String clientActionId;

  Map<String, dynamic> toJson() => {
        'zoneId': zoneId,
        'mode': mode == DispatchMode.autoAssign ? 'auto_assign' : 'offer',
        'autoAssignMaxLoad': autoAssignMaxLoad,
        'reason': reason,
        'clientActionId': clientActionId,
      };
}

// ─── Fraud (§17.6) ─────────────────────────────────────────────────────

enum FraudRule { customerCancellations, codeSharing, refundRate, riderCashGap, unusualOrderValue, unknown }

FraudRule fraudRuleOf(Object? v) => switch (v) {
      'customer_cancellations' => FraudRule.customerCancellations,
      'code_sharing' => FraudRule.codeSharing,
      'refund_rate' => FraudRule.refundRate,
      'rider_cash_gap' => FraudRule.riderCashGap,
      'unusual_order_value' => FraudRule.unusualOrderValue,
      _ => FraudRule.unknown,
    };

String fraudRuleWire(FraudRule r) => switch (r) {
      FraudRule.customerCancellations => 'customer_cancellations',
      FraudRule.codeSharing => 'code_sharing',
      FraudRule.refundRate => 'refund_rate',
      FraudRule.riderCashGap => 'rider_cash_gap',
      FraudRule.unusualOrderValue => 'unusual_order_value',
      FraudRule.unknown => 'unknown',
    };

enum FraudSeverity { warning, critical }

enum FraudStatus { open, acknowledged, resolved, dismissed }

enum FraudSubjectType { customer, rider, order, code, unknown }

enum MeasureUnit { count, ratio, rupees, multiple }

class FraudSubject {
  const FraudSubject({required this.type, required this.id, required this.label});
  final FraudSubjectType type;
  final String id;
  final String label;
  factory FraudSubject.fromJson(Object? j) {
    final m = jMap(j) ?? const {};
    return FraudSubject(
      type: jEnum(FraudSubjectType.values, m['type'], FraudSubjectType.unknown),
      id: jStrOr(m['id']),
      label: jStrOr(m['label']),
    );
  }
}

class FraudMeasure {
  const FraudMeasure({required this.value, required this.threshold, required this.unit, required this.windowDays});
  final double value;
  final double threshold;
  final MeasureUnit unit;
  final int windowDays;
  factory FraudMeasure.fromJson(Object? j) {
    final m = jMap(j) ?? const {};
    return FraudMeasure(
      value: jDouble(m['value']),
      threshold: jDouble(m['threshold']),
      unit: jEnum(MeasureUnit.values, m['unit'], MeasureUnit.count),
      windowDays: jInt(m['windowDays']),
    );
  }
}

/// A line of proof. The server sends no phone, address or device data; the
/// app shows the text as it comes.
class FraudEvidence {
  const FraudEvidence({required this.kind, required this.id, required this.at, required this.text});
  final String kind;
  final String id;
  final DateTime? at;
  final String text;
  factory FraudEvidence.fromJson(Map<String, dynamic> j) =>
      FraudEvidence(kind: jStrOr(j['kind']), id: jStrOr(j['id']), at: jDate(j['at']), text: jStrOr(j['text']));
}

class FraudDismissal {
  const FraudDismissal({required this.by, required this.reason, required this.until});
  final PersonRef? by;
  final String reason;
  final DateTime? until;
  static FraudDismissal? maybe(Object? j) {
    final m = jMap(j);
    if (m == null) return null;
    return FraudDismissal(by: jRef(m['by']), reason: jStrOr(m['reason']), until: jDate(m['until']));
  }
}

class FraudCase {
  const FraudCase({
    required this.alertId,
    required this.rule,
    required this.severity,
    required this.status,
    required this.zoneId,
    required this.openedAt,
    required this.subject,
    required this.measure,
    required this.evidence,
    required this.dismissal,
  });
  final String alertId;
  final FraudRule rule;
  final FraudSeverity severity;
  final FraudStatus status;
  final String? zoneId;
  final DateTime? openedAt;
  final FraudSubject subject;
  final FraudMeasure measure;
  final List<FraudEvidence> evidence;
  final FraudDismissal? dismissal;

  factory FraudCase.fromJson(Map<String, dynamic> j) => FraudCase(
        alertId: jStrOr(j['alertId']),
        rule: fraudRuleOf(j['rule']),
        severity: jEnum(FraudSeverity.values, j['severity'], FraudSeverity.warning),
        status: jEnum(FraudStatus.values, j['status'], FraudStatus.open),
        zoneId: jStr(j['zoneId']),
        openedAt: jDate(j['openedAt']),
        subject: FraudSubject.fromJson(j['subject']),
        measure: FraudMeasure.fromJson(j['measure']),
        evidence: [for (final e in jMaps(j['evidence'])) FraudEvidence.fromJson(e)],
        dismissal: FraudDismissal.maybe(j['dismissal']),
      );
}

class FraudCounts {
  const FraudCounts({required this.open, required this.dismissed, required this.resolved});
  final int open;
  final int dismissed;
  final int resolved;
  factory FraudCounts.fromJson(Object? j) {
    final m = jMap(j) ?? const {};
    return FraudCounts(open: jInt(m['open']), dismissed: jInt(m['dismissed']), resolved: jInt(m['resolved']));
  }
}

class FraudPage {
  const FraudPage({required this.items, required this.nextCursor, required this.counts});
  final List<FraudCase> items;
  final String? nextCursor;
  final FraudCounts counts;
  factory FraudPage.fromJson(Map<String, dynamic> j) => FraudPage(
        items: [for (final c in jMaps(j['items'])) FraudCase.fromJson(c)],
        nextCursor: jStr(j['nextCursor']),
        counts: FraudCounts.fromJson(j['counts']),
      );
}

/// One rule's setting for a zone (or the platform default when [zoneId] is null).
class FraudRuleSetting {
  const FraudRuleSetting({
    required this.rule,
    required this.zoneId,
    required this.inherited,
    required this.enabled,
    required this.threshold,
    required this.windowDays,
    required this.unit,
    required this.label,
    required this.description,
  });
  final FraudRule rule;
  final String? zoneId;
  final bool inherited;
  final bool enabled;
  final double threshold;
  final int windowDays;
  final MeasureUnit unit;
  final String label;
  final String description;

  /// The server's bounds for this unit.
  (double, double) get bounds => switch (unit) {
        MeasureUnit.count => (1, 50),
        MeasureUnit.ratio => (0.05, 1),
        MeasureUnit.rupees => (100, 100000),
        MeasureUnit.multiple => (1.5, 20),
      };

  factory FraudRuleSetting.fromJson(Map<String, dynamic> j) => FraudRuleSetting(
        rule: fraudRuleOf(j['rule']),
        zoneId: jStr(j['zoneId']),
        inherited: jBool(j['inherited']),
        enabled: jBool(j['enabled']),
        threshold: jDouble(j['threshold']),
        windowDays: jInt(j['windowDays']),
        unit: jEnum(MeasureUnit.values, j['unit'], MeasureUnit.count),
        label: jStrOr(j['label']),
        description: jStrOr(j['description']),
      );
}

class FraudRulesView {
  const FraudRulesView({required this.enabled, required this.rules});
  final bool enabled;
  final List<FraudRuleSetting> rules;
  factory FraudRulesView.fromJson(Map<String, dynamic> j) => FraudRulesView(
        enabled: jBool(j['enabled']),
        rules: [for (final r in jMaps(j['rules'])) FraudRuleSetting.fromJson(r)],
      );
}

class FraudDismissDraft {
  FraudDismissDraft({required this.alertId, required this.reason, required this.days, String? clientActionId})
      : clientActionId = clientActionId ?? _uuid.v4();
  final String alertId;
  final String reason;
  final int days;
  final String clientActionId;
  Map<String, dynamic> toJson() => {'reason': reason, 'days': days, 'clientActionId': clientActionId};
}

class FraudRuleChange {
  FraudRuleChange({required this.rule, required this.zoneId, required this.enabled, required this.threshold, required this.windowDays, String? clientActionId})
      : clientActionId = clientActionId ?? _uuid.v4();
  final FraudRule rule;
  final String? zoneId;
  final bool enabled;
  final double threshold;
  final int windowDays;
  final String clientActionId;
  Map<String, dynamic> toJson() => {
        'rule': fraudRuleWire(rule),
        'zoneId': zoneId,
        'enabled': enabled,
        'threshold': threshold,
        'windowDays': windowDays,
        'clientActionId': clientActionId,
      };
}

// ─── Scheduled reports (§17.7) ─────────────────────────────────────────

enum ScheduleFrequency { daily, weekly }

enum RangePreset { yesterday, last7Days, lastWeek, monthToDate, lastMonth }

String rangePresetWire(RangePreset p) => switch (p) {
      RangePreset.yesterday => 'yesterday',
      RangePreset.last7Days => 'last_7_days',
      RangePreset.lastWeek => 'last_week',
      RangePreset.monthToDate => 'month_to_date',
      RangePreset.lastMonth => 'last_month',
    };

enum RunStatus { sent, partial, tooLarge, failed }

RunStatus _runStatus(Object? v) => switch (v) {
      'sent' => RunStatus.sent,
      'partial' => RunStatus.partial,
      'too_large' => RunStatus.tooLarge,
      _ => RunStatus.failed,
    };

class ScheduleRecipient {
  const ScheduleRecipient({required this.id, required this.name, required this.eligible});
  final String id;
  final String name;
  final bool eligible;
  factory ScheduleRecipient.fromJson(Map<String, dynamic> j) =>
      ScheduleRecipient(id: jStrOr(j['id']), name: jStrOr(j['name']), eligible: j['eligible'] != false);
}

class ScheduleKind {
  const ScheduleKind({required this.kind, required this.label});
  final String kind;
  final String label;
  factory ScheduleKind.fromJson(Map<String, dynamic> j) => ScheduleKind(kind: jStrOr(j['kind']), label: jStrOr(j['label']));
}

class ScheduleFilters {
  const ScheduleFilters({this.vendor, this.rider, this.status, this.payment = 'all'});
  final String? vendor;
  final String? rider;
  final String? status;

  /// `all`, `cod` or `online`.
  final String payment;

  factory ScheduleFilters.fromJson(Object? j) {
    final m = jMap(j) ?? const {};
    return ScheduleFilters(vendor: jStr(m['vendor']), rider: jStr(m['rider']), status: jStr(m['status']), payment: jStrOr(m['payment'], 'all'));
  }
  Map<String, dynamic> toJson() => {'vendor': vendor, 'rider': rider, 'status': status, 'payment': payment};
}

class LastRun {
  const LastRun({required this.id, required this.status, required this.at});
  final String id;
  final RunStatus status;
  final DateTime? at;
  static LastRun? maybe(Object? j) {
    final m = jMap(j);
    if (m == null) return null;
    return LastRun(id: jStrOr(m['id']), status: _runStatus(m['status']), at: jDate(m['at']));
  }
}

class Schedule {
  const Schedule({
    required this.id,
    required this.name,
    required this.kind,
    required this.filters,
    required this.frequency,
    required this.weekday,
    required this.hourIst,
    required this.rangePreset,
    required this.zoneIds,
    required this.recipients,
    required this.active,
    required this.owner,
    required this.nextRunAt,
    required this.lastRun,
  });
  final String id;
  final String name;
  final String kind;
  final ScheduleFilters filters;
  final ScheduleFrequency frequency;

  /// 1 = Monday … 7 = Sunday; null for a daily schedule.
  final int? weekday;
  final int hourIst;
  final RangePreset rangePreset;

  /// Null = the owner's whole scope.
  final List<String>? zoneIds;
  final List<ScheduleRecipient> recipients;
  final bool active;
  final PersonRef? owner;
  final DateTime? nextRunAt;
  final LastRun? lastRun;

  factory Schedule.fromJson(Map<String, dynamic> j) => Schedule(
        id: jStrOr(j['id']),
        name: jStrOr(j['name']),
        kind: jStrOr(j['kind']),
        filters: ScheduleFilters.fromJson(j['filters']),
        frequency: jEnum(ScheduleFrequency.values, j['frequency'], ScheduleFrequency.daily),
        weekday: jIntOrNull(j['weekday']),
        hourIst: jInt(j['hourIst']),
        rangePreset: jEnum(RangePreset.values, j['rangePreset'], RangePreset.yesterday, rangePresetWire),
        zoneIds: j['zoneIds'] is List ? jStrings(j['zoneIds']) : null,
        recipients: [for (final r in jMaps(j['recipients'])) ScheduleRecipient.fromJson(r)],
        active: jBool(j['active']),
        owner: jRef(j['owner']),
        nextRunAt: jDate(j['nextRunAt']),
        lastRun: LastRun.maybe(j['lastRun']),
      );
}

class ScheduleList {
  const ScheduleList({required this.items, required this.kinds});
  final List<Schedule> items;
  final List<ScheduleKind> kinds;
  factory ScheduleList.fromJson(Map<String, dynamic> j) => ScheduleList(
        items: [for (final s in jMaps(j['items'])) Schedule.fromJson(s)],
        kinds: [for (final k in jMaps(j['kinds'])) ScheduleKind.fromJson(k)],
      );
}

class SkippedRecipient {
  const SkippedRecipient({required this.id, required this.name, required this.reason});
  final String id;
  final String name;

  /// `permission` or `zone`.
  final String reason;
  factory SkippedRecipient.fromJson(Map<String, dynamic> j) =>
      SkippedRecipient(id: jStrOr(j['id']), name: jStrOr(j['name']), reason: jStrOr(j['reason']));
}

class ReportRun {
  const ReportRun({
    required this.id,
    required this.periodFrom,
    required this.periodTo,
    required this.status,
    required this.rows,
    required this.createdAt,
    required this.recipientsSent,
    required this.recipientsSkipped,
    this.scheduleName,
    this.kind,
  });
  final String id;
  final String periodFrom;
  final String periodTo;
  final RunStatus status;
  final int rows;
  final DateTime? createdAt;
  final int recipientsSent;
  final List<SkippedRecipient> recipientsSkipped;
  final String? scheduleName;
  final String? kind;

  factory ReportRun.fromJson(Map<String, dynamic> j) => ReportRun(
        id: jStrOr(j['id']),
        periodFrom: jStrOr(j['periodFrom']),
        periodTo: jStrOr(j['periodTo']),
        status: _runStatus(j['status']),
        rows: jInt(j['rows']),
        createdAt: jDate(j['createdAt']),
        recipientsSent: jInt(j['recipientsSent']),
        recipientsSkipped: [for (final r in jMaps(j['recipientsSkipped'])) SkippedRecipient.fromJson(r)],
        scheduleName: jStr(j['scheduleName']),
        kind: jStr(j['kind']),
      );
}

class RunPage {
  const RunPage({required this.items, required this.nextCursor});
  final List<ReportRun> items;
  final String? nextCursor;
  factory RunPage.fromJson(Map<String, dynamic> j) =>
      RunPage(items: [for (final r in jMaps(j['items'])) ReportRun.fromJson(r)], nextCursor: jStr(j['nextCursor']));
}

class RunDownload {
  const RunDownload({required this.url, required this.expiresAt});
  final String url;
  final DateTime? expiresAt;
  factory RunDownload.fromJson(Map<String, dynamic> j) => RunDownload(url: jStrOr(j['url']), expiresAt: jDate(j['expiresAt']));
}

/// Create or change a schedule. One draft = one `clientActionId`.
class ScheduleDraft {
  ScheduleDraft({
    required this.name,
    required this.kind,
    required this.filters,
    required this.frequency,
    required this.weekday,
    required this.hourIst,
    required this.rangePreset,
    required this.zoneIds,
    required this.recipientIds,
    this.active = true,
    String? clientActionId,
  }) : clientActionId = clientActionId ?? _uuid.v4();
  final String name;
  final String kind;
  final ScheduleFilters filters;
  final ScheduleFrequency frequency;
  final int? weekday;
  final int hourIst;
  final RangePreset rangePreset;
  final List<String>? zoneIds;
  final List<String> recipientIds;
  final bool active;
  final String clientActionId;

  /// The same schedule as it stands, optionally with [active] flipped (pause
  /// and resume send exactly what is there, changing nothing else).
  factory ScheduleDraft.from(Schedule s, {bool? active}) => ScheduleDraft(
        name: s.name,
        kind: s.kind,
        filters: s.filters,
        frequency: s.frequency,
        weekday: s.weekday,
        hourIst: s.hourIst,
        rangePreset: s.rangePreset,
        zoneIds: s.zoneIds,
        recipientIds: [for (final r in s.recipients) r.id],
        active: active ?? s.active,
      );

  Map<String, dynamic> toJson() => {
        'name': name,
        'kind': kind,
        'filters': filters.toJson(),
        'frequency': frequency.name,
        'weekday': frequency == ScheduleFrequency.weekly ? weekday : null,
        'hourIst': hourIst,
        'rangePreset': rangePresetWire(rangePreset),
        'zoneIds': zoneIds,
        'recipients': recipientIds,
        'active': active,
        'clientActionId': clientActionId,
      };
}

// ─── Accounting (§17.10) ───────────────────────────────────────────────

enum VoucherType { sales, commission, refunds, vendorPayout, riderSalary, unknown }

VoucherType _voucherType(Object? v) => switch (v) {
      'sales' => VoucherType.sales,
      'commission' => VoucherType.commission,
      'refunds' => VoucherType.refunds,
      'vendor_payout' => VoucherType.vendorPayout,
      'rider_salary' => VoucherType.riderSalary,
      _ => VoucherType.unknown,
    };

class VoucherLine {
  const VoucherLine({required this.ledger, required this.debit, required this.credit});
  final String ledger;
  final double debit;
  final double credit;
  factory VoucherLine.fromJson(Map<String, dynamic> j) =>
      VoucherLine(ledger: jStrOr(j['ledger']), debit: jDouble(j['debit']), credit: jDouble(j['credit']));
}

class Voucher {
  const Voucher({required this.number, required this.type, required this.date, required this.narration, required this.reference, required this.lines});
  final String number;
  final VoucherType type;
  final String date;
  final String narration;
  final String? reference;
  final List<VoucherLine> lines;

  double get debit => lines.fold(0, (s, l) => s + l.debit);
  double get credit => lines.fold(0, (s, l) => s + l.credit);

  factory Voucher.fromJson(Map<String, dynamic> j) => Voucher(
        number: jStrOr(j['number']),
        type: _voucherType(j['type']),
        date: jStrOr(j['date']),
        narration: jStrOr(j['narration']),
        reference: jStr(j['reference']),
        lines: [for (final l in jMaps(j['lines'])) VoucherLine.fromJson(l)],
      );
}

class ReconciliationRow {
  const ReconciliationRow({required this.figure, required this.export, required this.finance, required this.match});
  final String figure;
  final double export;
  final double finance;
  final bool match;

  /// What Finance shows beyond the export (positive) or short of it.
  double get difference => finance - export;

  factory ReconciliationRow.fromJson(Map<String, dynamic> j) => ReconciliationRow(
        figure: jStrOr(j['figure']),
        export: jDouble(j['export']),
        finance: jDouble(j['finance']),
        match: jBool(j['match']),
      );
}

class AccountingSummary {
  const AccountingSummary({
    required this.generatedAt,
    required this.range,
    required this.area,
    required this.company,
    required this.vouchers,
    required this.totals,
    required this.reconciliation,
  });
  final DateTime? generatedAt;
  final InsightRange range;
  final InsightArea area;
  final String company;
  final List<Voucher> vouchers;
  final ({double debit, double credit}) totals;
  final List<ReconciliationRow> reconciliation;

  bool get allMatch => reconciliation.every((r) => r.match);

  factory AccountingSummary.fromJson(Map<String, dynamic> j) {
    final t = jMap(j['totals']) ?? const {};
    return AccountingSummary(
      generatedAt: jDate(j['generatedAt']),
      range: InsightRange.fromJson(j['range']),
      area: InsightArea.fromJson(j['area']),
      company: jStrOr(j['company']),
      vouchers: [for (final v in jMaps(j['vouchers'])) Voucher.fromJson(v)],
      totals: (debit: jDouble(t['debit']), credit: jDouble(t['credit'])),
      reconciliation: [for (final r in jMaps(j['reconciliation'])) ReconciliationRow.fromJson(r)],
    );
  }
}

/// A file the server built (Tally XML or a journal CSV).
class AccountingFile {
  const AccountingFile({required this.bytes, required this.fileName, required this.mime});
  final List<int> bytes;
  final String fileName;
  final String mime;
}
