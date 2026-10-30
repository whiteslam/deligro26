import 'package:deligro_customer/core/api.dart';
import 'package:deligro_customer/theme/app_theme.dart';
import 'package:deligro_customer/widgets/common.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';

Widget _host(Widget child, {Brightness brightness = Brightness.light}) => MaterialApp(
      theme: buildTheme(brightness),
      home: Scaffold(body: child),
    );

void main() {
  setUpAll(() => GoogleFonts.config.allowRuntimeFetching = false);

  testWidgets('a group label is sentence case and a header', (tester) async {
    await tester.pumpWidget(_host(const GroupLabel('Recent')));
    expect(find.text('Recent'), findsOneWidget);
    expect(find.bySemanticsLabel('Recent'), findsOneWidget);
    final text = tester.widget<Text>(find.text('Recent'));
    expect(text.style?.letterSpacing ?? 0, 0);
  });

  testWidgets('a tag shows its word as given', (tester) async {
    await tester.pumpWidget(_host(Tag('Not on map', bg: AppColors.light.dealSoft, fg: AppColors.light.deal)));
    expect(find.text('Not on map'), findsOneWidget);
  });

  testWidgets('skeletons read as one "Loading" and fit a 360dp phone', (tester) async {
    tester.view.physicalSize = const Size(360, 1600);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    await tester.pumpWidget(_host(const SingleChildScrollView(
      child: Column(children: [CardListSkeleton(), RowListSkeleton()]),
    )));
    expect(tester.takeException(), isNull);
    expect(find.bySemanticsLabel('Loading'), findsNWidgets(2));
  });

  testWidgets('a network failure says offline; a server error does not', (tester) async {
    var retried = 0;
    await tester.pumpWidget(_host(ErrorRetry(error: ApiException(0, 'network'), onRetry: () => retried++)));
    expect(find.text('You\'re offline'), findsOneWidget);
    expect(find.byIcon(Icons.wifi_off_rounded), findsOneWidget);
    await tester.tap(find.text('Try again'));
    expect(retried, 1);

    await tester.pumpWidget(_host(ErrorRetry(error: ApiException(500, 'server_error'), onRetry: () {})));
    expect(find.text('Couldn\'t load this'), findsOneWidget);
    expect(find.byIcon(Icons.error_outline_rounded), findsOneWidget);
  });

  testWidgets('the rating pill uses dark ink on the dark palette\'s bright green', (tester) async {
    await tester.pumpWidget(_host(const RatingPill(rating: 4.3, count: 12), brightness: Brightness.dark));
    final text = tester.widget<Text>(find.text('4.3'));
    expect(text.style?.color, AppColors.dark.onGreen);
  });
}
