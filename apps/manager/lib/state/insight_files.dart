import 'dart:io';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';

import '../core/api.dart';

/// Hands a file to the phone's share sheet (save to Files, Drive, email).
typedef FileSharer = Future<void> Function(List<int> bytes, String fileName, String mime);

Future<void> shareFileBytes(List<int> bytes, String fileName, String mime) async {
  final dir = await getTemporaryDirectory();
  final file = await File('${dir.path}/$fileName').writeAsBytes(bytes);
  await SharePlus.instance.share(ShareParams(files: [XFile(file.path, mimeType: mime)], subject: fileName));
}

/// Fetches a signed link's file. A link that has gone, or was refused, is the
/// same kind of answer the API gives: 410 `expired`, 403 `permission_denied`.
typedef UrlDownloader = Future<List<int>> Function(String url);

Future<List<int>> downloadUrlBytes(String url) async {
  final http.Response res;
  try {
    res = await http.get(Uri.parse(url)).timeout(const Duration(seconds: 60));
  } catch (_) {
    throw ApiException(0, 'network');
  }
  if (res.statusCode == 200) return res.bodyBytes;
  if (res.statusCode == 403) throw ApiException(403, 'permission_denied');
  if (res.statusCode == 404 || res.statusCode == 410) throw ApiException(410, 'expired');
  throw ApiException(res.statusCode, 'http_${res.statusCode}');
}

/// Overridden with recorders in tests.
final fileSharerProvider = Provider<FileSharer>((_) => shareFileBytes);
final urlDownloaderProvider = Provider<UrlDownloader>((_) => downloadUrlBytes);
