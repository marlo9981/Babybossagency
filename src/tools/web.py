"""
Web tools - Search and fetch
"""

from duckduckgo_search import DDGS
import requests
from bs4 import BeautifulSoup

def web_search(query: str, num_results: int = 5) -> list:
    """Search the web using DuckDuckGo."""
    try:
        with DDGS() as ddgs:
            results = list(ddgs.text(query, max_results=num_results))
            return [{"title": r["title"], "url": r["href"], "snippet": r["body"]}
                    for r in results]
    except Exception as e:
        print(f"Search error: {e}")
        return []

def fetch_url(url: str) -> str:
    """Fetch and extract text from URL."""
    try:
        response = requests.get(url, timeout=10)
        soup = BeautifulSoup(response.text, "html.parser")

        # Remove scripts and styles
        for tag in soup(["script", "style"]):
            tag.decompose()

        # Get text
        text = soup.get_text(separator="\n", strip=True)
        # Clean up whitespace
        lines = [line.strip() for line in text if line.strip()]
        return "\n".join(lines[:100])  # Limit to first 100 lines
    except Exception as e:
        return f"Error fetching {url}: {e}"

def summarize_text(text: str, max_words: int = 200) -> str:
    """Summarize text using AI."""
    from src.tools.ai_client import get_ai_response
    prompt = f"Summarize this in {max_words} words or less:\n\n{text}"
    return get_ai_response(prompt)

if __name__ == "__main__":
    # Test
    print("Testing web search...")
    results = web_search("what is artificial intelligence")
    for r in results:
        print(f"- {r['title']}: {r['url']}")