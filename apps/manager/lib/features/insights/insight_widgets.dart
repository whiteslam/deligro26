import 'package:flutter/material.dart';

import '../../theme/app_theme.dart';

/// A titled block with a hairline border, the shape every Insights section
/// shares. [trailing] sits at the right of the title row.
class InsightCard extends StatelessWidget {
  const InsightCard({super.key, required this.title, required this.child, this.trailing, this.subtitle});
  final String title;
  final String? subtitle;
  final Widget? trailing;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Material(
        color: c.surface,
        clipBehavior: Clip.antiAlias,
        shape: RoundedRectangleBorder(
          side: BorderSide(color: c.line),
          borderRadius: BorderRadius.circular(radiusBlock),
        ),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(children: [
                Expanded(child: Text(title, style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: c.ink))),
                ?trailing,
              ]),
              if (subtitle != null) ...[
                const SizedBox(height: 2),
                Text(subtitle!, style: TextStyle(fontSize: 12.5, color: c.muted)),
              ],
              const SizedBox(height: 10),
              child,
            ],
          ),
        ),
      ),
    );
  }
}

/// A short banner for a state the manager should not miss: [warning] uses the
/// deal colours, otherwise the quiet surface.
class InsightBanner extends StatelessWidget {
  const InsightBanner({super.key, required this.text, this.icon = Icons.info_outline, this.warning = true});
  final String text;
  final IconData icon;
  final bool warning;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: warning ? c.dealSoft : c.surface2,
        borderRadius: BorderRadius.circular(radiusBlock),
      ),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Icon(icon, size: 18, color: warning ? c.deal : c.muted),
        const SizedBox(width: 10),
        Expanded(child: Text(text, style: TextStyle(fontSize: 13.5, height: 1.35, color: c.ink))),
      ]),
    );
  }
}

/// A small legend swatch with a word.
class LegendKey extends StatelessWidget {
  const LegendKey({super.key, required this.color, required this.text});
  final Color color;
  final String text;

  @override
  Widget build(BuildContext context) => Row(mainAxisSize: MainAxisSize.min, children: [
        Container(width: 10, height: 10, decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(3))),
        const SizedBox(width: 6),
        Text(text, style: TextStyle(fontSize: 12, color: context.colors.muted)),
      ]);
}
