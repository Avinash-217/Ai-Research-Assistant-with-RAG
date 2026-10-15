"""API router for managing and validating user AI model API keys (Gemini, Grok, OpenAI/ChatGPT)."""
import os
import re
import httpx
from typing import Optional, Dict, Any
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, status
from backend.core.config import get_settings
from backend.services.llm_provider import llm_provider

router = APIRouter(prefix="/api/settings", tags=["API Keys & Settings"])
settings = get_settings()


class KeysUpdateRequest(BaseModel):
    gemini_api_key: Optional[str] = None
    grok_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None
    active_provider: Optional[str] = None


class TestKeyRequest(BaseModel):
    provider: str  # "gemini", "grok", "openai"
    api_key: Optional[str] = None


def mask_key(key: str) -> str:
    if not key or not key.strip():
        return ""
    clean = key.strip()
    if len(clean) <= 8:
        return "••••••••"
    return clean[:4] + "••••••••" + clean[-4:]


def update_env_file(key_values: Dict[str, str]):
    """Safely updates or appends key-value pairs in the local .env file."""
    env_path = os.path.abspath(".env")
    existing_lines = []
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            existing_lines = f.readlines()

    updated_keys = set()
    new_lines = []

    for line in existing_lines:
        line_stripped = line.strip()
        matched = False
        for k, v in key_values.items():
            if line_stripped.startswith(f"{k}=") or line_stripped.startswith(f"{k} ="):
                new_lines.append(f"{k}={v}\n")
                updated_keys.add(k)
                matched = True
                break
        if not matched:
            new_lines.append(line)

    for k, v in key_values.items():
        if k not in updated_keys:
            new_lines.append(f"{k}={v}\n")

    with open(env_path, "w", encoding="utf-8") as f:
        f.writelines(new_lines)


@router.get("/keys")
def get_configured_keys():
    """Returns the configuration status and masked keys for all supported AI models."""
    current_settings = get_settings()
    return {
        "gemini": {
            "configured": bool(current_settings.GEMINI_API_KEY and current_settings.GEMINI_API_KEY.strip()),
            "masked_key": mask_key(current_settings.GEMINI_API_KEY),
            "model": current_settings.GEMINI_MODEL,
        },
        "grok": {
            "configured": bool(current_settings.GROK_API_KEY and current_settings.GROK_API_KEY.strip()),
            "masked_key": mask_key(current_settings.GROK_API_KEY),
            "model": current_settings.GROK_MODEL,
        },
        "openai": {
            "configured": bool(current_settings.OPENAI_API_KEY and current_settings.OPENAI_API_KEY.strip()),
            "masked_key": mask_key(current_settings.OPENAI_API_KEY),
            "model": current_settings.OPENAI_MODEL,
        },
        "active_provider": current_settings.LLM_PROVIDER,
    }


@router.post("/keys")
def update_api_keys(req: KeysUpdateRequest):
    """Updates runtime and persistent API keys for Gemini, Grok, and OpenAI."""
    current_settings = get_settings()
    env_updates = {}

    if req.gemini_api_key is not None:
        val = req.gemini_api_key.strip()
        if "••••" not in val:
            current_settings.GEMINI_API_KEY = val
            env_updates["GEMINI_API_KEY"] = val

    if req.grok_api_key is not None:
        val = req.grok_api_key.strip()
        if "••••" not in val:
            current_settings.GROK_API_KEY = val
            env_updates["GROK_API_KEY"] = val

    if req.openai_api_key is not None:
        val = req.openai_api_key.strip()
        if "••••" not in val:
            current_settings.OPENAI_API_KEY = val
            env_updates["OPENAI_API_KEY"] = val

    if req.active_provider:
        prov = req.active_provider.lower().strip()
        if prov in ["gemini", "grok", "openai", "ollama", "fallback"]:
            current_settings.LLM_PROVIDER = prov
            llm_provider.provider = prov
            env_updates["LLM_PROVIDER"] = prov

    if env_updates:
        try:
            update_env_file(env_updates)
        except Exception as env_err:
            print(f"Notice: Could not persist to .env: {env_err}")

    return {
        "status": "success",
        "message": "AI model configuration updated successfully.",
        "config": get_configured_keys(),
    }


@router.post("/keys/test")
async def test_api_key(req: TestKeyRequest):
    """Validates an API key directly against the provider's official API."""
    provider = req.provider.lower().strip()
    key_to_test = req.api_key

    # If key wasn't explicitly supplied in request, fall back to stored key
    if not key_to_test or "••••" in key_to_test:
        current_settings = get_settings()
        if provider == "gemini":
            key_to_test = current_settings.GEMINI_API_KEY
        elif provider == "grok":
            key_to_test = current_settings.GROK_API_KEY
        elif provider in ["openai", "chatgpt"]:
            key_to_test = current_settings.OPENAI_API_KEY

    if not key_to_test or not key_to_test.strip():
        return {"success": False, "error": f"No API key provided for {provider}."}

    clean_key = key_to_test.strip()

    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            if provider == "gemini":
                url = f"https://generativelanguage.googleapis.com/v1beta/models?key={clean_key}"
                res = await client.get(url)
                if res.status_code == 200:
                    return {"success": True, "message": "Gemini API key is valid and connected!"}
                err_body = res.json() if res.headers.get("content-type", "").startswith("application/json") else {}
                err_msg = err_body.get("error", {}).get("message", f"HTTP {res.status_code}")
                return {"success": False, "error": f"Gemini verification failed: {err_msg}"}

            elif provider == "grok":
                url = "https://api.x.ai/v1/models"
                res = await client.get(url, headers={"Authorization": f"Bearer {clean_key}"})
                if res.status_code == 200:
                    return {"success": True, "message": "xAI Grok API key is valid and connected!"}
                err_body = res.json() if res.headers.get("content-type", "").startswith("application/json") else {}
                err_msg = err_body.get("error", {}).get("message", f"HTTP {res.status_code}")
                return {"success": False, "error": f"xAI Grok verification failed: {err_msg}"}

            elif provider in ["openai", "chatgpt"]:
                url = "https://api.openai.com/v1/models"
                res = await client.get(url, headers={"Authorization": f"Bearer {clean_key}"})
                if res.status_code == 200:
                    return {"success": True, "message": "OpenAI / ChatGPT API key is valid and connected!"}
                err_body = res.json() if res.headers.get("content-type", "").startswith("application/json") else {}
                err_msg = err_body.get("error", {}).get("message", f"HTTP {res.status_code}")
                return {"success": False, "error": f"OpenAI verification failed: {err_msg}"}

            else:
                return {"success": False, "error": f"Unknown provider: {provider}"}

    except Exception as exc:
        return {"success": False, "error": f"Connection test failed: {str(exc)}"}
