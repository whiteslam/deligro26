import 'package:deligro_partner/widgets/states.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';

import 'support/fakes.dart';

void main() {
  setUpAll(() => GoogleFonts.config.allowRuntimeFetching = false);

  for (final (b, scale, name) in [
    (Brightness.light, 1.0, 'light'),
    (Brightness.dark, 1.0, 'dark'),
    (Brightness.light, 1.3, 'large text'),
  ]) {
    testPartner('the order list skeleton fits a 360 px phone ($name)', (t) async {
      await pumpPartner(
        t,
        child: const Scaffold(body: SingleChildScrollView(child: OrderListSkeleton())),
        overrides: const [],
        b: b,
        scale: scale,
      );
      expect(t.takeException(), isNull);
      expect(find.bySemanticsLabel('Loading orders'), findsOneWidget);
    });

    testPartner('a state message with its action fits a 360 px phone ($name)', (t) async {
      var tapped = 0;
      await pumpPartner(
        t,
        child: Scaffold(
          body: StateMessage(
            icon: Icons.cloud_off_rounded,
            title: 'Orders couldn\'t load',
            body: 'Check your internet.',
            action: 'Retry',
            onAction: () => tapped++,
          ),
        ),
        overrides: const [],
        b: b,
        scale: scale,
      );
      expect(t.takeException(), isNull);
      await t.tap(find.text('Retry'));
      expect(tapped, 1);
    });
  }

  testPartner('a state message without an action draws no button', (t) async {
    await pumpPartner(
      t,
      child: const Scaffold(
        body: StateMessage(icon: Icons.receipt_long_outlined, title: 'No live orders right now', body: 'x'),
      ),
      overrides: const [],
    );
    expect(find.byType(FilledButton), findsNothing);
  });
}
