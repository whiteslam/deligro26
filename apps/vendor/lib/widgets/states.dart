import 'package:flutter/material.dart';

import '../theme/app_theme.dart';

/// A flat placeholder in the shape of something still loading. Static on
/// purpose: no shimmer, so there is nothing to switch off for reduced motion.
class SkeletonBlock extends StatelessWidget {
  /// Leave [width] or [height] null to fill what the parent gives (a grid cell).
  const SkeletonBlock({super.key, this.width, this.height, this.radius = 6});

  final double? width;
  final double? height;
  final double radius;

  @override
  Widget build(BuildContext context) => Container(
    width: width,
    height: height,
    decoration: BoxDecoration(color: context.colors.surface2, borderRadius: BorderRadius.circular(radius)),
  );
}

/// Rows in the shape of [OrderCard] while a list of orders loads: a status
/// mark, the order ID and two lines of meta, and the status and amount on the
/// right. Screen readers hear one "Loading orders" instead of the boxes.
class OrderListSkeleton extends StatelessWidget {
  const OrderListSkeleton({super.key, this.count = 4, this.label = 'Loading orders'});

  final int count;
  final String label;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Semantics(
      label: label,
      liveRegion: true,
      child: ExcludeSemantics(
        child: Column(
          children: [
            for (var i = 0; i < count; i++)
              Container(
                margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 5),
                padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
                decoration: BoxDecoration(
                  color: c.surface,
                  borderRadius: BorderRadius.circular(radiusBlock),
                  border: Border.all(color: c.line),
                ),
                child: const Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    SkeletonBlock(width: 40, height: 40, radius: 12),
                    SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          SkeletonBlock(width: 84, height: 15),
                          SizedBox(height: 8),
                          SkeletonBlock(width: 120, height: 11),
                          SizedBox(height: 8),
                          SkeletonBlock(width: 150, height: 11),
                        ],
                      ),
                    ),
                    SizedBox(width: 8),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        SkeletonBlock(width: 64, height: 22, radius: 999),
                        SizedBox(height: 10),
                        SkeletonBlock(width: 52, height: 15),
                      ],
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }
}

/// A region with nothing to show, or one whose load failed: one line on what
/// is (or should be) here, one on why or what to do, and at most one action.
class StateMessage extends StatelessWidget {
  const StateMessage({
    super.key,
    required this.icon,
    required this.title,
    required this.body,
    this.action,
    this.onAction,
  });

  final IconData icon;
  final String title;
  final String body;
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
            ExcludeSemantics(child: Icon(icon, size: 40, color: c.muted)),
            const SizedBox(height: 12),
            Text(title, textAlign: TextAlign.center, style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 4),
            Text(
              body,
              textAlign: TextAlign.center,
              style: TextStyle(color: c.muted),
            ),
            if (action != null && onAction != null) ...[
              const SizedBox(height: 16),
              FilledButton(onPressed: onAction, child: Text(action!)),
            ],
          ],
        ),
      ),
    );
  }
}
