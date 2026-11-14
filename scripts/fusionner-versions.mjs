// Fusionne les versions GitHub en double (même tag) en une seule.
// Lancé par GitHub Actions avec GITHUB_TOKEN.
const repo = process.env.GITHUB_REPOSITORY;
const token = process.env.GITHUB_TOKEN;
const api = (p, o = {}) => fetch(p.startsWith('http') ? p : `https://api.github.com/repos/${repo}${p}`, {
  ...o, headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', ...(o.headers || {}) },
});

const releases = await (await api('/releases?per_page=100')).json();
const byTag = {};
for (const r of releases) (byTag[r.tag_name] = byTag[r.tag_name] || []).push(r);

for (const [tag, list] of Object.entries(byTag)) {
  if (list.length < 2) continue;
  list.sort((a, b) => Number(b.assets.some((x) => x.name === 'latest.yml')) - Number(a.assets.some((x) => x.name === 'latest.yml')) || b.assets.length - a.assets.length);
  const [keep, ...dups] = list;
  console.log(`${tag} : on garde ${keep.id}, ${dups.length} doublon(s)`);
  const have = new Set(keep.assets.map((a) => a.name));
  for (const d of dups) {
    for (const a of d.assets) {
      if (have.has(a.name)) continue;
      const bin = Buffer.from(await (await api(`/releases/assets/${a.id}`, { headers: { Accept: 'application/octet-stream' } })).arrayBuffer());
      const up = keep.upload_url.replace(/\{.*$/, `?name=${encodeURIComponent(a.name)}`);
      const r = await api(up, { method: 'POST', body: bin, headers: { 'Content-Type': 'application/octet-stream' } });
      console.log(`  ${a.name} déplacé : ${r.status}`);
      have.add(a.name);
    }
    const r = await api(`/releases/${d.id}`, { method: 'DELETE' });
    console.log(`  doublon ${d.id} supprimé : ${r.status}`);
  }
  if (keep.draft) await api(`/releases/${keep.id}`, { method: 'PATCH', body: JSON.stringify({ draft: false, make_latest: 'true' }), headers: { 'Content-Type': 'application/json' } });
}
