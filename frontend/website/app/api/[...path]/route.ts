/**
 * A catch-all proxy to the backend.
 *
 * A route handler rather than `next.config.ts` rewrites, because rewrites are serialised at BUILD
 * time — the backend URL would be baked into the image, and one image would no longer run against
 * any environment. Here `API_TARGET` is read per request.
 */

const TARGET = () => process.env.API_TARGET ?? 'http://localhost:8088';

/** Hop-by-hop headers, and ones the fetch layer must be allowed to set itself. */
const STRIP = new Set(['host', 'connection', 'content-length', 'accept-encoding']);

async function forward(request: Request, path: string[]): Promise<Response> {
  const url = new URL(request.url);
  const target = `${TARGET()}/${path.join('/')}${url.search}`;

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (!STRIP.has(key.toLowerCase())) headers.set(key, value);
  });

  // `exactOptionalPropertyTypes` will not accept `body: undefined`, and it is right to object:
  // a GET carrying an explicit undefined body is a different thing from a GET with no body.
  const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
  const init: RequestInit = hasBody
    ? { method: request.method, headers, body: await request.text(), redirect: 'manual' }
    : { method: request.method, headers, redirect: 'manual' };

  try {
    const upstream = await fetch(target, init);

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: upstream.headers,
    });
  } catch (cause) {
    // A named cause, so "the backend is not running" does not read as "the request was malformed".
    return Response.json(
      {
        error: {
          code: 'BACKEND_UNREACHABLE',
          message: 'The backend is not reachable.',
          retriable: true,
          details: { target, cause: String(cause) },
        },
      },
      { status: 502 },
    );
  }
}

type Context = { params: Promise<{ path: string[] }> };

export async function GET(request: Request, ctx: Context) {
  return forward(request, (await ctx.params).path);
}
export async function POST(request: Request, ctx: Context) {
  return forward(request, (await ctx.params).path);
}
