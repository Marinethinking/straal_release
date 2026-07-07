var CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    if (request.method !== 'GET') {
      return json({ error: 'method not allowed' }, 405);
    }

    var url = new URL(request.url);
    var packageId = url.searchParams.get('id');
    if (!packageId || !/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/i.test(packageId)) {
      return json({ error: 'missing or invalid id' }, 400);
    }

    var playUrl =
      'https://play.google.com/store/apps/details?id=' +
      encodeURIComponent(packageId) +
      '&hl=en&gl=us';

    var playResponse = await fetch(playUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; StraalVersionProxy/1.0)',
      },
    });

    if (!playResponse.ok) {
      return json({ error: 'play store fetch failed' }, 502);
    }

    var html = await playResponse.text();
    var match = html.match(/\[\[\["(\d+\.\d+\.\d+)"\]\]/);
    if (!match) {
      return json({ error: 'version not found' }, 404);
    }

    return json(
      { version: match[1], package: packageId },
      200,
      Object.assign({}, CORS_HEADERS, {
        'Cache-Control': 'public, max-age=300',
      })
    );
  },
};

function json(body, status, extraHeaders) {
  var headers = Object.assign({ 'Content-Type': 'application/json' }, extraHeaders || {});
  return new Response(JSON.stringify(body), { status: status, headers: headers });
}
