import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart' show ProviderOrFamily;

import '../core/api.dart';
import '../core/format.dart';
import '../theme/app_theme.dart';

/// Parses the web's `linear-gradient(135deg,#f6c453,#e8552d)` tints.
Gradient tintGradient(String? css) {
  final hexes = RegExp(r'#([0-9a-fA-F]{6})').allMatches(css ?? '').map(
        (m) => Color(int.parse('FF${m.group(1)}', radix: 16)),
      );
  final colors = hexes.length >= 2
      ? hexes.toList()
      : AppColors.tintFallback;
  return LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: colors,
  );
}

/// A photo over its tint gradient: the gradient shows while loading and if
/// the image fails, so a tile is never a grey hole (PhotoTile on the web).
class NetImage extends StatelessWidget {
  const NetImage({
    super.key,
    required this.url,
    this.tint,
    this.radius = radiusBlock,
    this.fallback,
  });

  final String? url;
  final String? tint;
  final double radius;
  final Widget? fallback;

  @override
  Widget build(BuildContext context) {
    final backdrop = DecoratedBox(
      decoration: BoxDecoration(gradient: tintGradient(tint)),
      child: Center(child: fallback),
    );
    final still = MediaQuery.maybeDisableAnimationsOf(context) ?? false;
    return ClipRRect(
      borderRadius: BorderRadius.circular(radius),
      child: url == null || url!.isEmpty
          ? backdrop
          : Stack(
              fit: StackFit.expand,
              children: [
                backdrop,
                CachedNetworkImage(
                  imageUrl: url!,
                  fit: BoxFit.cover,
                  fadeInDuration: still ? Duration.zero : const Duration(milliseconds: 180),
                  errorWidget: (_, _, _) => const SizedBox.shrink(),
                  placeholder: (_, _) => const SizedBox.shrink(),
                ),
              ],
            ),
    );
  }
}

/// The FSSAI square-and-dot mark. Null = unknown: show nothing, because a
/// wrong veg mark is a dietary claim.
class VegMark extends StatelessWidget {
  const VegMark(this.veg, {super.key, this.size = 14});
  final bool? veg;
  final double size;

  @override
  Widget build(BuildContext context) {
    if (veg == null) return const SizedBox.shrink();
    final color = veg! ? AppColors.vegMark : AppColors.nonVegMark;
    return Semantics(
      label: veg! ? 'Vegetarian' : 'Non-vegetarian',
      child: Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        border: Border.all(color: color, width: 1.4),
        borderRadius: BorderRadius.circular(2),
      ),
      alignment: Alignment.center,
      child: Container(
        width: size * 0.45,
        height: size * 0.45,
        decoration: BoxDecoration(color: color, shape: BoxShape.circle),
      ),
      ),
    );
  }
}

/// ₹120 with the list price struck through when on sale.
class PriceText extends StatelessWidget {
  const PriceText({super.key, required this.price, required this.effective, this.size = 15});
  final int price;
  final int effective;
  final double size;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(rupees(effective), style: dataStyle(context, size: size, weight: FontWeight.w700)),
        if (effective < price) ...[
          const SizedBox(width: 6),
          Text(
            rupees(price),
            style: dataStyle(context, size: size - 2, weight: FontWeight.w500).copyWith(
              color: c.muted,
              decoration: TextDecoration.lineThrough,
            ),
          ),
        ],
      ],
    );
  }
}

/// "Add" that turns into a − n + stepper.
class QtyStepper extends StatelessWidget {
  const QtyStepper({
    super.key,
    required this.qty,
    required this.onAdd,
    required this.onRemove,
    this.enabled = true,
    this.compact = false,
  });

  final int qty;
  final VoidCallback onAdd;
  final VoidCallback onRemove;
  final bool enabled;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final h = compact ? 32.0 : 38.0;
    if (qty == 0) {
      return SizedBox(
        height: h,
        child: OutlinedButton(
          onPressed: enabled ? onAdd : null,
          style: OutlinedButton.styleFrom(
            minimumSize: Size(compact ? 64 : 84, h),
            padding: const EdgeInsets.symmetric(horizontal: 14),
            foregroundColor: c.accentInk,
            backgroundColor: c.surface,
            side: BorderSide(color: enabled ? c.accent : c.line, width: 1.4),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
          child: Text(enabled ? 'Add' : 'Sold out',
              style: const TextStyle(fontWeight: FontWeight.w800)),
        ),
      );
    }
    return Container(
      height: h,
      decoration: BoxDecoration(color: c.accent, borderRadius: BorderRadius.circular(10)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          _StepButton(icon: Icons.remove_rounded, onTap: onRemove, label: 'Remove one'),
          ConstrainedBox(
            constraints: const BoxConstraints(minWidth: 22),
            child: Text(
              '$qty',
              textAlign: TextAlign.center,
              style: dataStyle(context, size: 15, weight: FontWeight.w800).copyWith(color: c.onAccent),
            ),
          ),
          _StepButton(icon: Icons.add_rounded, onTap: onAdd, label: 'Add one'),
        ],
      ),
    );
  }
}

class _StepButton extends StatelessWidget {
  const _StepButton({required this.icon, required this.onTap, required this.label});
  final IconData icon;
  final VoidCallback onTap;
  final String label;

  @override
  Widget build(BuildContext context) => Semantics(
        button: true,
        label: label,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(10),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 10),
            child: Icon(icon, size: 18, color: context.colors.onAccent),
          ),
        ),
      );
}

class EmptyState extends StatelessWidget {
  const EmptyState({
    super.key,
    required this.icon,
    required this.title,
    this.body,
    this.action,
    this.onAction,
  });

  final IconData icon;
  final String title;
  final String? body;
  final String? action;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(color: c.accentSoft, shape: BoxShape.circle),
              child: Icon(icon, size: 34, color: c.accentInk),
            ),
            const SizedBox(height: 16),
            Text(title,
                textAlign: TextAlign.center, style: Theme.of(context).textTheme.titleMedium),
            if (body != null) ...[
              const SizedBox(height: 6),
              Text(body!, textAlign: TextAlign.center, style: TextStyle(color: c.muted)),
            ],
            if (action != null && onAction != null) ...[
              const SizedBox(height: 18),
              FilledButton(onPressed: onAction, child: Text(action!)),
            ],
          ],
        ),
      ),
    );
  }
}

/// A failed load with a retry. Says what went wrong in plain words.
class ErrorRetry extends StatelessWidget {
  const ErrorRetry({super.key, required this.error, required this.onRetry});
  final Object error;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final api = error is ApiException ? error as ApiException : null;
    // A server that answered with an error is not a connection problem: no
    // wifi glyph there, or people go and check their router for nothing.
    final serverSaid = api != null && api.code != 'network';
    return EmptyState(
      icon: serverSaid ? Icons.error_outline_rounded : Icons.wifi_off_rounded,
      title: api?.code == 'network' ? 'You\'re offline' : 'Couldn\'t load this',
      body: api?.friendly ?? 'Check your connection and try again.',
      action: 'Try again',
      onAction: onRetry,
    );
  }
}

/// AsyncValue → loading spinner / [ErrorRetry] / content.
class AsyncBody<T> extends StatelessWidget {
  const AsyncBody({
    super.key,
    required this.value,
    required this.onRetry,
    required this.builder,
    this.loading,
  });

  final AsyncValue<T> value;
  final VoidCallback onRetry;
  final Widget Function(T data) builder;
  final Widget? loading;

  @override
  Widget build(BuildContext context) => value.when(
        skipLoadingOnRefresh: true,
        skipLoadingOnReload: true,
        data: builder,
        loading: () => loading ?? const Center(child: CircularProgressIndicator()),
        error: (e, _) => ErrorRetry(error: e, onRetry: onRetry),
      );
}

class SectionTitle extends StatelessWidget {
  const SectionTitle(this.title, {super.key, this.trailing, this.padding});
  final String title;
  final Widget? trailing;
  final EdgeInsets? padding;

  @override
  Widget build(BuildContext context) => Padding(
        padding: padding ?? const EdgeInsets.fromLTRB(16, 22, 16, 10),
        child: Row(
          children: [
            Expanded(
              child: Text(title,
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(fontSize: 19)),
            ),
            ?trailing,
          ],
        ),
      );
}

/// ★ 4.3 (120) — or "New" when nobody has rated the shop yet.
class RatingPill extends StatelessWidget {
  const RatingPill({super.key, required this.rating, required this.count});
  final double rating;
  final int count;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    if (count == 0) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
        decoration: BoxDecoration(color: c.surface2, borderRadius: BorderRadius.circular(6)),
        child: Text('New', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: c.muted)),
      );
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(color: c.green, borderRadius: BorderRadius.circular(6)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.star_rounded, size: 13, color: c.onGreen),
          const SizedBox(width: 2),
          Text(rating.toStringAsFixed(1),
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: c.onGreen)),
        ],
      ),
    );
  }
}

void showSnack(BuildContext context, String text) {
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(content: Text(text)));
}

/// Rounded surface card used across screens.
class Panel extends StatelessWidget {
  const Panel({super.key, required this.child, this.padding = const EdgeInsets.all(16), this.margin});
  final Widget child;
  final EdgeInsets padding;
  final EdgeInsets? margin;

  @override
  Widget build(BuildContext context) => Container(
        margin: margin,
        padding: padding,
        decoration: BoxDecoration(
          color: context.colors.surface,
          borderRadius: BorderRadius.circular(radiusBlock),
          border: Border.all(color: context.colors.line),
        ),
        child: child,
      );
}

/// Refreshes a set of providers from a pull-to-refresh.
Future<void> refreshAll(WidgetRef ref, List<ProviderOrFamily> providers) async {
  for (final p in providers) {
    ref.invalidate(p);
  }
  await Future<void>.delayed(const Duration(milliseconds: 350));
}

/// The small label over a group of rows ("Recent", "Contact Deligro
/// support"). Sentence case and untracked: the words carry the label, not
/// capitals. Marked as a header for screen readers.
class GroupLabel extends StatelessWidget {
  const GroupLabel(this.text, {super.key, this.padding, this.color, this.leading});
  final String text;
  final EdgeInsets? padding;
  final Color? color;

  /// Optional mark before the words, for a state the label names ("Happening
  /// now" beside a live icon).
  final Widget? leading;

  @override
  Widget build(BuildContext context) {
    final style = Theme.of(context).textTheme.labelSmall?.copyWith(color: color);
    final label = Semantics(header: true, child: Text(text, style: style));
    return Padding(
      padding: padding ?? EdgeInsets.zero,
      child: leading == null
          ? label
          : Row(children: [leading!, const SizedBox(width: 6), Flexible(child: label)]),
    );
  }
}

/// A short status word on a soft fill ("Default", "Not on map"). Sentence
/// case; colour is never the only signal because the word is there.
class Tag extends StatelessWidget {
  const Tag(this.text, {super.key, required this.bg, required this.fg});
  final String text;
  final Color bg;
  final Color fg;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
        decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(999)),
        child: Text(text, style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: fg)),
      );
}

/// A grey block standing in for content that is loading. Static on purpose:
/// no shimmer, so there is nothing to switch off for reduced motion.
class SkeletonBox extends StatelessWidget {
  const SkeletonBox({super.key, this.width, this.height, this.radius = 6});
  final double? width;
  final double? height;
  final double radius;

  @override
  Widget build(BuildContext context) => Container(
        width: width,
        height: height,
        decoration: BoxDecoration(
          color: context.colors.surface2,
          borderRadius: BorderRadius.circular(radius),
        ),
      );
}

/// Loading placeholder for a list of restaurant cards: a photo and two lines
/// of text per card, the shape of what is coming.
class CardListSkeleton extends StatelessWidget {
  const CardListSkeleton({
    super.key,
    this.count = 3,
    this.padding = const EdgeInsets.fromLTRB(16, 8, 16, 24),
  });
  final int count;
  final EdgeInsets padding;

  @override
  Widget build(BuildContext context) => Semantics(
        label: 'Loading',
        excludeSemantics: true,
        child: Padding(
          padding: padding,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              for (var i = 0; i < count; i++) ...[
                if (i > 0) const SizedBox(height: 20),
                const AspectRatio(aspectRatio: 2.1, child: SkeletonBox(radius: radiusBlock)),
                const SizedBox(height: 10),
                const SkeletonBox(width: 180, height: 14),
                const SizedBox(height: 6),
                const SkeletonBox(width: 120, height: 12),
              ],
            ],
          ),
        ),
      );
}

/// Loading placeholder for a list of rows: a thumbnail and two lines each.
class RowListSkeleton extends StatelessWidget {
  const RowListSkeleton({
    super.key,
    this.count = 6,
    this.padding = const EdgeInsets.fromLTRB(16, 8, 16, 24),
  });
  final int count;
  final EdgeInsets padding;

  @override
  Widget build(BuildContext context) => Semantics(
        label: 'Loading',
        excludeSemantics: true,
        child: Padding(
          padding: padding,
          child: Column(
            children: [
              for (var i = 0; i < count; i++)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 10),
                  child: Row(
                    children: [
                      SkeletonBox(width: 64, height: 64, radius: 12),
                      SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            FractionallySizedBox(widthFactor: .7, alignment: Alignment.centerLeft, child: SkeletonBox(height: 14)),
                            SizedBox(height: 8),
                            FractionallySizedBox(widthFactor: .45, alignment: Alignment.centerLeft, child: SkeletonBox(height: 12)),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ),
      );
}
