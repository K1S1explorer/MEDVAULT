"""
MedVault AI - Gemini Multimodal Live API WebSocket Bridge
Handles bidirectional real-time audio streaming via the Google GenAI SDK.
"""

import os
import json
import asyncio
from fastapi import WebSocket, WebSocketDisconnect
from google import genai
from google.genai import types

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")

# We use the standard general release model natively supporting Live Voice Audio
MODEL = "models/gemini-2.5-flash-native-audio-latest"

async def bridge_gemini_live(client_ws: WebSocket, setup_context: str):
    """
    Accepts the Client WebSocket, connects to Gemini via google-genai SDK, 
    and bridges pure PCM audio arrays backward and forward.
    """
    await client_ws.accept()
    
    if not GEMINI_API_KEY:
        await client_ws.send_text(json.dumps({"error": "No Gemini API key available."}))
        await client_ws.close()
        return

    try:
        # Initialize Google GenAI Client
        client = genai.Client(api_key=GEMINI_API_KEY)
        
        # Configure Audio Modalities and inject Medical RAG
        config = {"response_modalities": ["AUDIO"], "system_instruction": {"parts": [{"text": setup_context}]}}

        async with client.aio.live.connect(model=MODEL, config=config) as session:
            print("[Gemini Live SDK] Session started.")

            # Task 1: Client -> Backend -> Gemini
            async def client_to_gemini():
                try:
                    while True:
                        data = await client_ws.receive()
                        
                        # Stream Raw Audio Bytes to Google SDK
                        if "bytes" in data:
                            pcm_bytes = data["bytes"]
                            await session.send_realtime_input(
                                audio=types.Blob(
                                    data=pcm_bytes, 
                                    mime_type="audio/pcm;rate=16000"
                                )
                            )
                            
                        # Stream any specific text events
                        elif "text" in data:
                            txt = data["text"]
                            if txt == "disconnect":
                                break
                                
                except WebSocketDisconnect:
                    print("[Gemini Live SDK] Client disconnected.")
                except RuntimeError as e:
                    if "Cannot call" in str(e) or "disconnect message has been received" in str(e):
                        print("[Gemini Live SDK] Client WebSocket gracefully closed.")
                    else:
                        print(f"[Gemini Live SDK] Runtime Error reading client: {e}")
                except Exception as e:
                    print(f"[Gemini Live SDK] Error reading client: {e}")

            # Task 2: Gemini -> Backend -> Client
            async def gemini_to_client():
                try:
                    while True:
                        async for response in session.receive():
                            content = response.server_content
                            if not content:
                                continue
                                
                            # Forward Model Outputs Linearly
                            if content.output_transcription:
                                print(f"[Gemini Transcript] {content.output_transcription.text}")
                                await client_ws.send_text(json.dumps({
                                    "type": "text", 
                                    "text": content.output_transcription.text
                                }))
                                
                            # Handle Turn complete events 
                            if hasattr(content, "turn_complete") and content.turn_complete:
                                print("[Gemini] Turn Complete.")
                                await client_ws.send_text(json.dumps({"type": "turnComplete"}))
                            
                            # Forward Audio PCM immediately down the WebSocket
                            if content.model_turn:
                                for part in content.model_turn.parts:
                                    if part.inline_data:
                                        audio_bytes = part.inline_data.data
                                        await client_ws.send_bytes(audio_bytes)
                except asyncio.CancelledError:
                    pass
                except Exception as e:
                    print(f"[Gemini Live SDK] Error reading from Gemini: {e}")

            # Run concurrently
            client_task = asyncio.create_task(client_to_gemini())
            gemini_task = asyncio.create_task(gemini_to_client())
            
            # Wait for one of them to finish completely
            done, pending = await asyncio.wait(
                [client_task, gemini_task],
                return_when=asyncio.FIRST_COMPLETED
            )
            
            for task in pending:
                task.cancel()

    except Exception as e:
        print(f"[Gemini Live WS Server Error] {e}")
    finally:
        try:
            await client_ws.close()
        except:
            pass
