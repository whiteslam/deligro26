import 'package:deligro_rider/theme/app_theme.dart';
import 'package:deligro_rider/widgets/common.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';

void main() {
  setUpAll(() => GoogleFonts.config.allowRuntimeFetching = false);

  Future<void> show(WidgetTester tester, Brightness b) => tester.pumpWidget(
        MaterialApp(
          theme: buildTheme(b),
          home: const MediaQuery(
            data: MediaQueryData(size: Size(360, 720), textScaler: TextScaler.linear(1.3)),
            child: Scaffold(
              body: ListSkeleton(label: 'Loading orders', count: 2, lines: 4),
            ),
          ),
        ),
      );

  for (final b in Brightness.values) {
    testWidgets('a list skeleton is still, sized like its rows and read out once ($b)', (tester) async {
      final semantics = tester.ensureSemantics();
      tester.view.physicalSize = const Size(360, 720);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.reset);

      await show(tester, b);

      // Still: nothing is animating, so the tree settles at once.
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      // Two cards of four lines each: a title bar and three text lines.
      expect(find.byType(SkeletonBlock), findsNWidgets(8));
      // One label for the whole region, not eight grey boxes.
      expect(find.bySemanticsLabel('Loading orders'), findsOneWidget);
      // No spinner: the skeleton replaces it.
      expect(find.byType(CircularProgressIndicator), findsNothing);
      semantics.dispose();
    });
  }
}
