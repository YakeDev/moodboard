export default async function handler(req, res) {
  const { query = "", page = 1, per_page = 20 } = req.query || {};
  const isSearch = Boolean((query || "").trim());

  const url = new URL(
    isSearch ? "https://api.unsplash.com/search/photos" : "https://api.unsplash.com/photos"
  );
  if (isSearch) url.searchParams.set("query", query);
  url.searchParams.set("page", page);
  url.searchParams.set("per_page", per_page);

  const upstream = await fetch(url.toString(), {
    headers: { Authorization: `Client-ID ${process.env.UNSPLASH_KEY}` },
  });

  const data = await upstream.json();
  res.status(upstream.status).json(data);
}
