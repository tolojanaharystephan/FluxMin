"""
Cascade multi-fournisseurs LLM : failover auto + classement par tâche (mode max).
"""
from __future__ import annotations

import json
import logging
import re
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


@dataclass
class LlmProvider:
    id: str
    name: str
    api_style: str  # openai | anthropic | gemini
    base_url: str
    api_key: str
    model: str
    # Score qualité pour la tâche résumé (plus haut = essayé plus tôt en mode max)
    quality: int = 50
    extra_headers: Dict[str, str] = field(default_factory=dict)


# Cooldown après erreur saturante (429 / quota)
_COOLDOWN_UNTIL: Dict[str, float] = {}
_COOLDOWN_SECONDS = 90.0


def _key(val: str | None) -> str:
    return (val or "").strip()


def _in_cooldown(provider_id: str) -> bool:
    until = _COOLDOWN_UNTIL.get(provider_id, 0)
    return time.time() < until


def _mark_cooldown(provider_id: str, seconds: float = _COOLDOWN_SECONDS) -> None:
    _COOLDOWN_UNTIL[provider_id] = time.time() + seconds


def configured_providers() -> List[LlmProvider]:
    """Construit la liste des providers ayant une clé."""
    providers: List[LlmProvider] = []

    # Groq : rapide + gratuit généreux — prioritaire en mode max
    groq_key = _key(settings.GROQ_API_KEY)
    if groq_key:
        providers.append(
            LlmProvider(
                id="groq",
                name="Groq",
                api_style="openai",
                base_url=_key(settings.GROQ_BASE_URL) or "https://api.groq.com/openai/v1",
                api_key=groq_key,
                model=_key(settings.GROQ_MODEL) or "llama-3.3-70b-versatile",
                quality=94,
            )
        )

    openai_key = _key(settings.OPENAI_API_KEY) or _key(settings.LLM_API_KEY)
    if openai_key:
        providers.append(
            LlmProvider(
                id="openai",
                name="OpenAI",
                api_style="openai",
                base_url=_key(settings.OPENAI_BASE_URL) or "https://api.openai.com/v1",
                api_key=openai_key,
                model=_key(settings.OPENAI_MODEL) or "gpt-4o-mini",
                quality=90,
            )
        )

    or_key = _key(settings.OPENROUTER_API_KEY)
    if or_key:
        providers.append(
            LlmProvider(
                id="openrouter",
                name="OpenRouter",
                api_style="openai",
                base_url=_key(settings.OPENROUTER_BASE_URL) or "https://openrouter.ai/api/v1",
                api_key=or_key,
                model=_key(settings.OPENROUTER_MODEL) or "openai/gpt-4o-mini",
                quality=85,
                extra_headers={
                    "HTTP-Referer": "https://fluxmin.local",
                    "X-Title": "FluxMin",
                },
            )
        )

    ant_key = _key(settings.ANTHROPIC_API_KEY)
    if ant_key:
        providers.append(
            LlmProvider(
                id="anthropic",
                name="Claude",
                api_style="anthropic",
                base_url=_key(settings.ANTHROPIC_BASE_URL) or "https://api.anthropic.com",
                api_key=ant_key,
                model=_key(settings.ANTHROPIC_MODEL) or "claude-3-5-haiku-latest",
                quality=92,
            )
        )

    xai_key = _key(settings.XAI_API_KEY)
    if xai_key:
        providers.append(
            LlmProvider(
                id="xai",
                name="xAI",
                api_style="openai",
                base_url=_key(settings.XAI_BASE_URL) or "https://api.x.ai/v1",
                api_key=xai_key,
                model=_key(settings.XAI_MODEL) or "grok-2-1212",
                quality=80,
            )
        )

    gem_key = _key(settings.GEMINI_API_KEY)
    if gem_key:
        providers.append(
            LlmProvider(
                id="gemini",
                name="Gemini",
                api_style="gemini",
                base_url=_key(settings.GEMINI_BASE_URL)
                or "https://generativelanguage.googleapis.com/v1beta",
                api_key=gem_key,
                model=_key(settings.GEMINI_MODEL) or "gemini-2.0-flash",
                quality=88,
            )
        )

    mis_key = _key(settings.MISTRAL_API_KEY)
    if mis_key:
        providers.append(
            LlmProvider(
                id="mistral",
                name="Mistral",
                api_style="openai",
                base_url=_key(settings.MISTRAL_BASE_URL) or "https://api.mistral.ai/v1",
                api_key=mis_key,
                model=_key(settings.MISTRAL_MODEL) or "mistral-small-latest",
                quality=75,
            )
        )

    return providers


def providers_for_task(task: str = "summarize") -> List[LlmProvider]:
    """
    Ordonne les providers selon la stratégie :
    - max : meilleur modèle d'abord (qualité)
    - balanced : qualité décroissante mais modèles économiques
    - economy : qualité croissante (moins cher d'abord)
    """
    providers = [p for p in configured_providers() if not _in_cooldown(p.id)]
    # Réintégrer ceux en cooldown seulement s'il n'en reste aucun
    if not providers:
        providers = configured_providers()

    strategy = (_key(settings.LLM_STRATEGY) or "max").lower()
    if strategy == "economy":
        providers.sort(key=lambda p: p.quality)
    else:
        # max / balanced : meilleur d'abord
        providers.sort(key=lambda p: p.quality, reverse=True)

    # Ordre forcé optionnel : LLM_PROVIDER_ORDER=openai,anthropic,openrouter
    order = _key(settings.LLM_PROVIDER_ORDER)
    if order:
        rank = {name.strip(): i for i, name in enumerate(order.split(",")) if name.strip()}
        providers.sort(key=lambda p: rank.get(p.id, 1000 + (100 - p.quality)))

    _ = task  # réservé pour des rankings par tâche plus fins
    return providers


def providers_status() -> dict:
    all_p = configured_providers()
    return {
        "enabled": bool(settings.LLM_ENABLED),
        "configured": len(all_p) > 0,
        "strategy": _key(settings.LLM_STRATEGY) or "max",
        "count": len(all_p),
        "providers": [
            {
                "id": p.id,
                "name": p.name,
                "model": p.model,
                "quality": p.quality,
                "cooldown": _in_cooldown(p.id),
            }
            for p in all_p
        ],
        # compat ancien champ
        "model": all_p[0].model if all_p else settings.LLM_MODEL,
        "baseUrl": all_p[0].base_url if all_p else settings.LLM_BASE_URL,
    }


def _extract_json(text: str) -> dict:
    text = (text or "").strip()
    if not text:
        raise ValueError("Réponse LLM vide")
    # Retirer fences markdown éventuels
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        m = re.search(r"\{[\s\S]*\}", text)
        if not m:
            raise
        return json.loads(m.group(0))


def _call_openai_style(
    client: httpx.Client,
    provider: LlmProvider,
    system: str,
    user: str,
) -> str:
    url = provider.base_url.rstrip("/") + "/chat/completions"
    headers = {
        "Authorization": f"Bearer {provider.api_key}",
        "Content-Type": "application/json",
        **provider.extra_headers,
    }
    body: Dict[str, Any] = {
        "model": provider.model,
        "temperature": 0.1,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
    }
    # Certains providers supportent response_format json_object
    if provider.id in ("openai", "openrouter", "xai", "mistral", "gemini", "groq"):
        body["response_format"] = {"type": "json_object"}

    res = client.post(url, headers=headers, json=body)
    if res.status_code in (429, 402, 503):
        _mark_cooldown(provider.id)
    res.raise_for_status()
    data = res.json()
    return data["choices"][0]["message"]["content"]


def _call_anthropic(
    client: httpx.Client,
    provider: LlmProvider,
    system: str,
    user: str,
) -> str:
    url = provider.base_url.rstrip("/") + "/v1/messages"
    headers = {
        "x-api-key": provider.api_key,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
    }
    body = {
        "model": provider.model,
        "max_tokens": 2048,
        "temperature": 0.1,
        "system": system,
        "messages": [{"role": "user", "content": user}],
    }
    res = client.post(url, headers=headers, json=body)
    if res.status_code in (429, 402, 503):
        _mark_cooldown(provider.id)
    res.raise_for_status()
    data = res.json()
    parts = data.get("content") or []
    texts = [p.get("text", "") for p in parts if p.get("type") == "text"]
    return "\n".join(texts)


def _call_gemini(
    client: httpx.Client,
    provider: LlmProvider,
    system: str,
    user: str,
) -> str:
    # Essai 1 : endpoint OpenAI-compatible Google
    try:
        compat = LlmProvider(
            id=provider.id,
            name=provider.name,
            api_style="openai",
            base_url=provider.base_url.rstrip("/") + "/openai",
            api_key=provider.api_key,
            model=provider.model,
            quality=provider.quality,
        )
        # Si base déjà openai, éviter double
        if provider.base_url.rstrip("/").endswith("/openai"):
            compat.base_url = provider.base_url.rstrip("/")
        else:
            # generativelanguage.../v1beta → .../v1beta/openai
            if "/openai" not in provider.base_url:
                compat.base_url = (
                    "https://generativelanguage.googleapis.com/v1beta/openai"
                )
        return _call_openai_style(client, compat, system, user)
    except Exception as err:
        logger.info("Gemini OpenAI-compat échoué (%s), essai generateContent", err)

    # Essai 2 : generateContent natif (clé en header, pas dans l'URL)
    model = provider.model
    url = f"{provider.base_url.rstrip('/')}/models/{model}:generateContent"
    headers = {
        "x-goog-api-key": provider.api_key,
        "Content-Type": "application/json",
    }
    body = {
        "systemInstruction": {"parts": [{"text": system}]},
        "contents": [{"role": "user", "parts": [{"text": user}]}],
        "generationConfig": {
            "temperature": 0.1,
            "responseMimeType": "application/json",
        },
    }
    res = client.post(url, headers=headers, json=body)
    if res.status_code in (429, 402, 503):
        _mark_cooldown(provider.id)
    res.raise_for_status()
    data = res.json()
    candidates = data.get("candidates") or []
    if not candidates:
        raise ValueError("Gemini: aucun candidat")
    parts = candidates[0].get("content", {}).get("parts") or []
    return "".join(p.get("text", "") for p in parts)


def call_provider(
    provider: LlmProvider,
    system: str,
    user: str,
    timeout: float,
) -> str:
    with httpx.Client(timeout=timeout) as client:
        if provider.api_style == "anthropic":
            return _call_anthropic(client, provider, system, user)
        if provider.api_style == "gemini":
            return _call_gemini(client, provider, system, user)
        return _call_openai_style(client, provider, system, user)


def chat_json_with_failover(
    system: str,
    user: str,
    task: str = "summarize",
    timeout: float | None = None,
) -> Tuple[Optional[dict], Optional[dict]]:
    """
    Essaie les providers dans l'ordre jusqu'à un JSON valide.
    Retourne (payload, meta) ou (None, meta_échec).
    """
    if not settings.LLM_ENABLED:
        return None, {"error": "LLM désactivé", "tried": []}

    chain = providers_for_task(task)
    if not chain:
        return None, {"error": "Aucune clé LLM configurée", "tried": []}

    timeout = timeout or float(settings.LLM_TIMEOUT_SECONDS or 45)
    tried: List[dict] = []

    for provider in chain:
        meta = {"id": provider.id, "name": provider.name, "model": provider.model}
        try:
            raw = call_provider(provider, system, user, timeout=timeout)
            payload = _extract_json(raw)
            logger.info(
                "LLM OK via %s (%s)", provider.name, provider.model
            )
            return payload, {**meta, "ok": True, "tried": tried}
        except Exception as err:
            msg = str(err)[:200]
            logger.warning(
                "LLM échec %s/%s — bascule : %s",
                provider.id,
                provider.model,
                msg,
            )
            tried.append({**meta, "error": msg})
            # Erreurs auth / quota → cooldown plus long
            if any(x in msg.lower() for x in ("401", "403", "429", "quota", "credit")):
                _mark_cooldown(provider.id, 120.0)
            continue

    return None, {"error": "Tous les LLM ont échoué", "tried": tried, "ok": False}
