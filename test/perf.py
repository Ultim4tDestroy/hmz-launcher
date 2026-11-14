# Grosse bibliothèque : 1500 jeux. Chaque page doit s'afficher en moins de 1,5 s, sans erreur.
import asyncio, os, sys
from playwright.async_api import async_playwright
URL = 'file://' + os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'renderer', 'dev.html'))
LIMIT = 1500
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(**({'executable_path': '/usr/bin/google-chrome'} if os.path.exists('/usr/bin/google-chrome') else {}))
        pg = await b.new_page(viewport={'width': 1440, 'height': 880})
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL); await pg.wait_for_timeout(700)
        await pg.evaluate("""() => {
          const base = S.games.slice(0, 8), plats = ['pc','switch','ps2','gba','3ds','snes','pc','pc'];
          const out = [];
          for (let i = 0; i < 1500; i++) { const g = base[i % base.length]; out.push({ ...g, id: 'perf:' + i, name: g.name + ' ' + i, platform: plats[i % plats.length], source: i % 3 ? 'steam' : 'rom', notInstalled: i % 5 === 0, minutes: i % 97, last: i % 7 ? Date.now() - i * 36e5 : 0 }); }
          S.games = out;
        }""")
        res = {}
        for name, js in [('accueil', "ui.view='home';render()"), ('bibliothèque (étagères)', "ui.coll={type:'all'};S.settings.libView='shelf';ui.view='library';render()"),
                         ('bibliothèque (grille)', "S.settings.libView='grid';render()"), ('bibliothèque (liste)', "S.settings.libView='list';render()"),
                         ('à installer', "ui.coll={type:'owned'};render()"), ('statistiques', "ui.view='stats';render()"), ('mode TV', "enterTV()"), ('recherche', "exitTV();ui.coll={type:'all'};ui.view='library';render();document.querySelector('#libSearch').value='Mario 1';document.querySelector('#libSearch').dispatchEvent(new Event('input',{bubbles:true}))")]:
            t = await pg.evaluate(f"() => {{ const t0 = performance.now(); {js}; document.body.offsetHeight; return performance.now() - t0; }}")
            res[name] = round(t)
        await pg.evaluate("() => { go('home'); go('library'); go('stats'); go('home'); }"); await pg.wait_for_timeout(800)
        await b.close()
        slow = {k: v for k, v in res.items() if v > LIMIT}
        print('temps (ms) :', res, '| erreurs :', errs)
        if slow or errs:
            print('ÉCHEC : trop lent ou erreur', slow); sys.exit(1)
asyncio.run(main())
