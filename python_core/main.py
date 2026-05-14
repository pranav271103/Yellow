import os
import uuid
import json
import asyncio
import sqlite3
import logging
import base64
import io
from typing import List, Optional, Dict, Any
from datetime import datetime
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import httpx
from fastapi_socketio import SocketManager
from gtts import gTTS

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("yellow-backend")

# Load environment variables
load_dotenv()

app = FastAPI()
# Socket.IO setup
sio = SocketManager(app=app, cors_allowed_origins='*', mount_location="/socket.io")

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Database ---
DB_PATH = "yellow.db"

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS threads (
            id TEXT PRIMARY KEY,
            title TEXT,
            created_at TEXT,
            updated_at TEXT,
            labels TEXT
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            thread_id TEXT,
            role TEXT,
            content TEXT,
            created_at TEXT,
            extra_metadata TEXT,
            FOREIGN KEY(thread_id) REFERENCES threads(id)
        )
    """)
    # Data cleanup: Fix any legacy messages with NULL roles
    cursor.execute("UPDATE messages SET role = 'user' WHERE role IS NULL")
    conn.commit()
    conn.close()

init_db()

# --- Configuration ---
CONFIG_PATH = "config.json"

DEFAULT_CONFIG = {
    "auth": {
        "isAuthenticated": True,
        "userId": "local-user",
        "user": {"_id": "local-user", "name": "Local User", "email": "local@yellowbot.ai"},
        "profileId": "local-profile"
    },
    "sessionToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJsb2NhbC11c2VyIiwibmFtZSI6IkxvY2FsIFVzZXIifQ.fake-sig",
    "currentUser": {"_id": "local-user", "name": "Local User"},
    "onboardingCompleted": True,
    "chatOnboardingCompleted": True,
    "analyticsEnabled": False,
    "meetAutoOrchestratorHandoff": False,
    "localState": {"encryptionKey": None, "onboardingTasks": None},
    "runtime": {
        "screenIntelligence": {"status": "running", "error": None},
        "localAi": {"status": "running", "error": None},
        "autocomplete": {"status": "running", "error": None},
        "service": {"status": "running", "error": None}
    },
    "api_url": "http://localhost:8000",
    "api_key": os.getenv("NVIDIA_API_KEY"),
    "default_model": "meta/llama-3.3-70b-instruct",
    "default_temperature": 0.7,
    "models": [
        {"id": "meta/llama-3.3-70b-instruct", "name": "Llama 3.3 70B"},
        {"id": "meta/llama-3.1-8b-instruct", "name": "Llama 3.1 8B"},
        {"id": "nvidia/llama-3.1-nemotron-70b-instruct", "name": "Nemotron 70B"},
        {"id": "google/gemma-2-27b-it", "name": "Gemma 2 27B"},
    ],
    "current_tier": "disabled",
    "local_ai": {
        "runtime_enabled": False,
        "usage": {
            "embeddings": False,
            "heartbeat": False,
            "learning_reflection": False,
            "subconscious": False
        }
    },
    "tools": {
        "web_search": {"enabled": True},
        "computer_control": {"enabled": True},
        "file_access": {"enabled": True},
        "shell": {"enabled": True},
        "browser": {"enabled": True},
        "vision": {"enabled": True},
    }
}

def load_config():
    if os.path.exists(CONFIG_PATH):
        try:
            with open(CONFIG_PATH, "r") as f:
                data = json.load(f)
                return {**DEFAULT_CONFIG, **data}
        except Exception as e:
            logger.error(f"Error loading config: {e}")
    return DEFAULT_CONFIG

def save_config(config):
    try:
        with open(CONFIG_PATH, "w") as f:
            json.dump(config, f, indent=2)
    except Exception as e:
        logger.error(f"Error saving config: {e}")

# --- NVIDIA NIM Inference ---

class NvidiaNimProvider:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://integrate.api.nvidia.com/v1"

    async def chat_completion(self, messages: List[Dict[str, str]], model: str, temperature: float = 0.7):
        # Filter and sanitize messages for vLLM/NVIDIA compliance
        valid_messages = []
        for m in messages:
            # vLLM/NVIDIA strictly requires role to be one of: system, user, assistant, developer, tool
            role = str(m.get("role") or m.get("sender") or "").lower()
            if role not in ["system", "user", "assistant", "developer", "tool"]:
                role = "user" # Fallback for unknown roles
            
            content = m.get("content")
            if content and str(content).strip():
                valid_messages.append({"role": role, "content": str(content)})

        if not valid_messages:
            return "I'm sorry, I don't have enough context to respond."

        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": model,
                        "messages": valid_messages,
                        "temperature": temperature,
                        "max_tokens": 2048
                    },
                    timeout=60.0
                )
                if resp.status_code != 200:
                    err_text = resp.text
                    logger.error(f"NVIDIA API Error: {err_text}")
                    return f"NVIDIA NIM API Error: {err_text}"
                
                data = resp.json()
                return data["choices"][0]["message"]["content"]
        except Exception as e:
            logger.error(f"Inference error: {e}")
            return f"Inference system error: {str(e)}"

# --- RPC Handlers ---

async def handle_ping(params):
    return {"result": {"ok": True}}

async def handle_config_get(params):
    return {"result": load_config()}

async def handle_config_get_client_config(params):
    config = load_config()
    return {
        "result": {
            "api_url": config["api_url"],
            "default_model": config["default_model"],
            "app_version": "V1",
            "api_key_set": bool(config["api_key"])
        }
    }

async def handle_threads_list(params):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM threads ORDER BY updated_at DESC")
    threads = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return {"result": {"threads": threads, "count": len(threads)}}

async def handle_threads_create_new(params):
    thread_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO threads (id, title, created_at, updated_at, labels) VALUES (?, ?, ?, ?, ?)",
        (thread_id, "New Conversation", now, now, "[]")
    )
    conn.commit()
    conn.close()
    return {"result": {"id": thread_id, "title": "New Conversation", "created_at": now, "updated_at": now}}

async def handle_threads_messages_list(params):
    thread_id = params.get("thread_id")
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM messages WHERE thread_id = ? ORDER BY created_at ASC", (thread_id,))
    messages = [dict(row) for row in cursor.fetchall()]
    for msg in messages:
        msg["extra_metadata"] = json.loads(msg["extra_metadata"]) if msg["extra_metadata"] else {}
        msg["sender"] = msg["role"]
    conn.close()
    return {"result": {"messages": messages}}

async def handle_threads_message_append(params):
    thread_id = params.get("thread_id")
    msg = params.get("message", {})
    msg_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO messages (id, thread_id, role, content, created_at, extra_metadata) VALUES (?, ?, ?, ?, ?, ?)",
        (msg_id, thread_id, msg.get("role"), msg.get("content"), now, json.dumps(msg.get("extra_metadata", {})))
    )
    cursor.execute("UPDATE threads SET updated_at = ? WHERE id = ?", (now, thread_id))
    conn.commit()
    conn.close()
    return {"result": {**msg, "id": msg_id, "created_at": now}}

async def handle_health_snapshot(params):
    return {"result": {"status": "healthy", "checks": {"database": "ok", "inference": "ok"}}}

async def handle_voice_status(params):
    return {"result": {
        "stt_available": True,
        "tts_available": True,
        "stt_model_id": "nvidia/canary-v1",
        "tts_voice_id": "nvidia/riva-tts"
    }}

async def handle_voice_cloud_transcribe(params):
    # Mocking STT for now.
    return {"result": {"text": "Hello OpenHuman, I am speaking to you now."}}

async def handle_voice_reply_synthesize(params):
    text = params.get("text", "")
    if not text:
        return {"result": {"audio_base64": "", "visemes": [], "alignment": []}}
    
    try:
        tts = gTTS(text=text, lang='en')
        fp = io.BytesIO()
        tts.write_to_fp(fp)
        fp.seek(0)
        audio_b64 = base64.b64encode(fp.read()).decode('utf-8')
        return {"result": {
            "audio_base64": audio_b64,
            "visemes": [],
            "alignment": []
        }}
    except Exception as e:
        logger.error(f"TTS Error: {e}")
        return {"result": {"audio_base64": "", "visemes": [], "alignment": []}}

async def handle_channel_web_chat(params):
    client_id = params.get("client_id")
    thread_id = params.get("thread_id")
    message = params.get("message")
    asyncio.create_task(run_agent_loop(client_id, thread_id, message))
    return {"result": {"ok": True}}

async def handle_local_ai_status(params):
    config = load_config()
    return {"result": {
        "state": "ready" if config.get("local_ai", {}).get("runtime_enabled") else "disabled",
        "model_id": "meta/llama-3.3-70b-instruct",
        "download_progress": None,
        "warning": None,
        "error_detail": None,
        "downloaded_bytes": 0,
        "total_bytes": 0,
        "download_speed_bps": 0,
        "eta_seconds": 0
    }}

async def handle_local_ai_downloads_progress(params):
    return {"result": {
        "state": "idle",
        "progress": 0,
        "downloaded_bytes": 0,
        "total_bytes": 0,
        "speed_bps": 0,
        "eta_seconds": 0,
        "ollama_available": True
    }}

async def handle_local_ai_presets(params):
    return {"result": {
        "device": {
            "total_ram_bytes": 16 * 1024 * 1024 * 1024,
            "cpu_count": 8,
            "cpu_brand": "Unknown CPU",
            "has_gpu": True,
            "gpu_description": "NVIDIA GPU"
        },
        "presets": [
            {
                "tier": "ram_8_12gb",
                "label": "Standard",
                "description": "Recommended for 16GB devices.",
                "approx_download_gb": 5.0,
                "chat_model_id": "llama3.2",
                "vision_mode": "disabled",
                "target_ram_gb": 8
            }
        ],
        "current_tier": "disabled",
        "local_ai_enabled": False,
        "recommend_disabled": False,
        "recommended_tier": "ram_8_12gb"
    }}

async def handle_local_ai_apply_preset(params):
    tier = params.get("tier")
    config = load_config()
    config["current_tier"] = tier
    if tier != "disabled":
        config["local_ai"]["runtime_enabled"] = True
    else:
        config["local_ai"]["runtime_enabled"] = False
    save_config(config)
    return {"result": {"applied_tier": tier, "chat_model_id": "llama3.2"}}

async def handle_local_ai_download(params):
    return {"result": {"ok": True}}

async def handle_local_ai_download_all_assets(params):
    return {"result": {"ok": True}}

async def handle_app_state_update_local_state(params):
    return {"result": {"ok": True}}

async def handle_config_update_local_ai_settings(params):
    config = load_config()
    config["local_ai"].update(params)
    save_config(config)
    return {"result": config}

async def handle_config_update_model_settings(params):
    config = load_config()
    if "api_url" in params: config["api_url"] = params["api_url"]
    if "api_key" in params: config["api_key"] = params["api_key"]
    if "default_model" in params: config["default_model"] = params["default_model"]
    if "model_routes" in params: config["model_routes"] = params["model_routes"]
    save_config(config)
    return {"result": config}

async def run_agent_loop(client_id, thread_id, user_message):
    request_id = str(uuid.uuid4())
    try:
        await sio.emit("inference_start", {"thread_id": thread_id, "request_id": request_id}, to=client_id)
        
        # Save user message
        now = datetime.utcnow().isoformat()
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO messages (id, thread_id, role, content, created_at, extra_metadata) VALUES (?, ?, ?, ?, ?, ?)",
            (str(uuid.uuid4()), thread_id, "user", user_message, now, "{}")
        )
        conn.commit()
        
        # Load history for inference (including the message we just saved)
        cursor.execute("SELECT role, content FROM messages WHERE thread_id = ? ORDER BY created_at DESC LIMIT 11", (thread_id,))
        history = [{"role": row[0], "content": row[1]} for row in cursor.fetchall()]
        history.reverse()
        conn.close()

        # Run inference
        config = load_config()
        provider = NvidiaNimProvider(config["api_key"])
        response = await provider.chat_completion(history, config["default_model"])
        
        # Save assistant response to DB
        now = datetime.utcnow().isoformat()
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO messages (id, thread_id, role, content, created_at, extra_metadata) VALUES (?, ?, ?, ?, ?, ?)",
            (str(uuid.uuid4()), thread_id, "assistant", response, now, "{}")
        )
        cursor.execute("UPDATE threads SET updated_at = ? WHERE id = ?", (now, thread_id))
        conn.commit()
        conn.close()

        # Stream back
        await sio.emit("text_delta", {"thread_id": thread_id, "request_id": request_id, "round": 1, "delta": response}, to=client_id)
        await sio.emit("chat_done", {"thread_id": thread_id, "request_id": request_id, "full_response": response}, to=client_id)
        
    except Exception as e:
        logger.error(f"Inference error: {e}")
        await sio.emit("chat_error", {"thread_id": thread_id, "request_id": request_id, "message": str(e)}, to=client_id)

# --- RPC Routing ---

RPC_HANDLERS = {
    "core.ping": handle_ping,
    "yellow.config_get": handle_config_get,
    "yellow.config_get_client_config": handle_config_get_client_config,
    "yellow.app_state_snapshot": handle_config_get,
    "yellow.health_snapshot": handle_health_snapshot,
    "yellow.threads_list": handle_threads_list,
    "yellow.threads_create_new": handle_threads_create_new,
    "yellow.threads_messages_list": handle_threads_messages_list,
    "yellow.threads_message_append": handle_threads_message_append,
    "yellow.channel_web_chat": handle_channel_web_chat,
    "yellow.voice_status": handle_voice_status,
    "yellow.voice_cloud_transcribe": handle_voice_cloud_transcribe,
    "yellow.voice_reply_synthesize": handle_voice_reply_synthesize,
    "yellow.local_ai_status": handle_local_ai_status,
    "yellow.local_ai_downloads_progress": handle_local_ai_downloads_progress,
    "yellow.local_ai_presets": handle_local_ai_presets,
    "yellow.local_ai_apply_preset": handle_local_ai_apply_preset,
    "yellow.local_ai_download": handle_local_ai_download,
    "yellow.local_ai_download_all_assets": handle_local_ai_download_all_assets,
    "yellow.app_state_update_local_state": handle_app_state_update_local_state,
    "yellow.config_update_local_ai_settings": handle_config_update_local_ai_settings,
    "yellow.config_update_model_settings": handle_config_update_model_settings,
}

@app.post("/rpc")
async def rpc_endpoint(request: Request):
    try:
        body = await request.json()
    except:
        return Response(status_code=400)
        
    method = body.get("method")
    params = body.get("params", {})
    rid = body.get("id")
    
    logger.info(f"RPC Call: {method}")
    
    handler = RPC_HANDLERS.get(method)
    if handler:
        try:
            result = await handler(params)
            return {"jsonrpc": "2.0", "result": result, "id": rid}
        except Exception as e:
            logger.error(f"Handler error for {method}: {e}")
            return {"jsonrpc": "2.0", "error": {"code": -32603, "message": str(e)}, "id": rid}
    else:
        # Catch-all success mock to prevent UI breakage
        logger.warning(f"No handler for {method}, returning success mock")
        return {"jsonrpc": "2.0", "result": {"ok": True}, "id": rid}

@sio.on("connect")
async def handle_connect(sid, environ, auth=None):
    logger.info(f"Socket connected: {sid} (auth: {auth})")
    await sio.emit("ready", {"status": "ok"}, to=sid)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
