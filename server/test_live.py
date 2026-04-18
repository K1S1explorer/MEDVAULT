import asyncio, websockets, json, os
from dotenv import load_dotenv

load_dotenv()
key = os.environ.get("GEMINI_API_KEY")

async def test_mdl(model, ver):
    url = f"wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.{ver}.GenerativeService.BidiGenerateContent?key={key}"
    try:
        async with websockets.connect(url) as ws:
            await ws.send(json.dumps({'setup': {'model': model}}))
            res = await ws.recv()
            print(f"[{ver} | {model}] SUCCESS:", res[:100])
    except Exception as e:
        print(f"[{ver} | {model}] ERROR:", e)

async def run():
    print("Testing connection...")
    await test_mdl('models/gemini-2.0-flash-exp', 'v1alpha')
    await test_mdl('models/gemini-2.0-flash', 'v1alpha')
    await test_mdl('models/gemini-2.0-flash', 'v1beta')
    await test_mdl('models/gemini-2.5-flash', 'v1alpha')
    await test_mdl('models/gemini-2.5-flash-live-preview', 'v1alpha')

asyncio.run(run())
