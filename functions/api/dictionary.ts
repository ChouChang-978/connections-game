interface DictionaryEnvironment {
  MW_COLLEGIATE_API_KEY?: string;
}

interface DictionaryContext {
  request: Request;
  env: DictionaryEnvironment;
}

export async function onRequestGet({ request, env }: DictionaryContext): Promise<Response> {
  const word = new URL(request.url).searchParams.get("word")?.trim();

  if (!word || word.length > 80) {
    return Response.json(
      { error: "Enter a word of 1 to 80 characters." },
      { status: 400 },
    );
  }

  if (!env.MW_COLLEGIATE_API_KEY) {
    return Response.json(
      { error: "The dictionary service is not configured." },
      { status: 503 },
    );
  }

  const apiUrl = new URL(
    `https://www.dictionaryapi.com/api/v3/references/collegiate/json/${encodeURIComponent(word)}`,
  );
  apiUrl.searchParams.set("key", env.MW_COLLEGIATE_API_KEY);

  try {
    const upstream = await fetch(apiUrl, {
      cf: { cacheEverything: true, cacheTtl: 86400 },
    });
    return new Response(await upstream.text(), {
      status: upstream.status,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
      },
    });
  } catch {
    return Response.json(
      { error: "Could not reach Merriam-Webster." },
      { status: 502 },
    );
  }
}
