import sys, asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(**({'executable_path': '/usr/bin/google-chrome'} if __import__('os').path.exists('/usr/bin/google-chrome') else {}), args=['--allow-file-access-from-files'])
        pg = await b.new_page(viewport={'width':1440,'height':880})
        errs=[]
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('console', lambda m: errs.append('console:'+m.text) if m.type=='error' else None)
        url='file://'+__import__('os').path.abspath(__import__('os').path.join(__import__('os').path.dirname(__file__),'..','renderer','dev.html'))
        steps = sys.argv[1:]
        for st in steps:
            name, js = st.split('=',1)
            if js.startswith('#'):
                await pg.goto(url+js); await pg.reload(); await pg.wait_for_timeout(700)
            elif js:
                await pg.evaluate(js); await pg.wait_for_timeout(900)
            await pg.screenshot(path=__import__('os').path.join(__import__('os').path.dirname(__file__), f'{name}.png'))
        print('\n'.join(errs) or 'no errors')
        await b.close()
asyncio.run(main())
