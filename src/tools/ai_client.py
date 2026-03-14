"""
AI Client - Ollama + OpenAI with fallback
"""

import os
import requests
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

def get_ollama_response(prompt: str, model: str = "llama3.2") -> str:
    """Get response from local Ollama."""
    try:
        response = requests.post(
            "http://localhost:11434/api/generate",
            json={"model": model, "prompt": prompt, "stream": False},
            timeout=120
        )
        return response.json().get("response", "")
    except Exception as e:
        print(f"Ollama error: {e}")
        return None

def get_openai_response(prompt: str, model: str = "gpt-4o") -> str:
    """Get response from OpenAI."""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return None

    client = OpenAI(api_key=api_key)
    try:
        response = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}]
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"OpenAI error: {e}")
        return None

def get_ai_response(prompt: str, prefer_cloud: bool = False) -> str:
    """Get AI response with fallback - default to local Ollama."""
    # Try local first (default)
    result = get_ollama_response(prompt)
    if result:
        return result

    # Fallback to cloud
    print("Falling back to OpenAI...")
    result = get_openai_response(prompt)
    if result:
        return result

    return "Sorry, I'm having trouble connecting to any AI service right now."

if __name__ == "__main__":
    # Test
    print("Testing Ollama...")
    result = get_ai_response("Hello! What are you?")
    print(f"Response: {result}")