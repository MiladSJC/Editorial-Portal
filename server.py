# server.py - Enhanced with Crossword Generator and Horoscope Generator
import os
import re
import random
import json
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, Field

# ------------------------------
# Environment & Config
# ------------------------------
load_dotenv()

AZURE_OPENAI_API_KEY = os.getenv("AZURE_OPENAI_API_KEY", "")
AZURE_OPENAI_ENDPOINT = os.getenv("AZURE_OPENAI_ENDPOINT", "").rstrip("/")
AZURE_OPENAI_DEPLOYMENT = os.getenv("AZURE_OPENAI_DEPLOYMENT", "")
AZURE_OPENAI_API_VERSION = os.getenv("AZURE_OPENAI_API_VERSION", "2025-01-01-preview")

def _chat_url() -> str:
    return (
        f"{AZURE_OPENAI_ENDPOINT}/openai/deployments/"
        f"{AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version={AZURE_OPENAI_API_VERSION}"
    )

# ------------------------------
# App
# ------------------------------
app = FastAPI(title="Magazine Portal API", version="1.3.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------------------
# Models (Existing)
# ------------------------------
class GenerateBody(BaseModel):
    systemPrompt: Optional[str] = Field(default=None)
    userPrompt: str
    temperature: Optional[float] = Field(default=0.7, ge=0.0, le=2.0)
    top_p: Optional[float] = Field(default=1.0, ge=0.0, le=1.0)
    max_tokens: Optional[int] = Field(default=2048, ge=1, le=16384)

# ------------------------------
# Models (New - Crossword) - REFINED
# ------------------------------
class CrosswordRequest(BaseModel):
    theme: str = Field(..., description="Theme for the crossword puzzle")
    size: Optional[int] = Field(default=15, ge=10, le=20, description="Grid size")
    word_count: Optional[int] = Field(default=10, ge=5, le=20, description="Number of words")
    # The 'use_ai' field is no longer needed here as it's always true,
    # but we can keep it for backend compatibility if other clients use it.
    use_ai: Optional[bool] = Field(default=True, description="Use AI to generate words")


# ------------------------------
# Models (New - Horoscope) - UPDATED
# ------------------------------
class HoroscopeRequest(BaseModel):
    magazine: str = Field(..., description="Target magazine name")
    zodiac_sign: str = Field(..., description="Zodiac sign")
    horoscope_type: str = Field(..., description="Type of horoscope (Daily, Weekly, etc.)")
    tone: str = Field(..., description="Writing tone")
    word_count: Optional[int] = Field(default=100, description="Target word count (estimate)")

# ------------------------------
# Azure HTTP helpers (Existing)
# ------------------------------
def _base_headers() -> Dict[str, str]:
    return {
        "api-key": AZURE_OPENAI_API_KEY,
        "Content-Type": "application/json"
    }

async def _http_post(url: str, payload: Dict[str, Any]) -> Tuple[int, Dict[str, Any]]:
    async with httpx.AsyncClient(timeout=120) as client:
        try:
            resp = await client.post(url, json=payload, headers=_base_headers())
            data = resp.json() if resp.content else {}
            return resp.status_code, data
        except httpx.TimeoutException:
            return 408, {"error": {"message": "Request timeout"}}
        except Exception as e:
            return 500, {"error": {"message": f"HTTP error: {str(e)}"}}

def _extract_content(data: Dict[str, Any]) -> Optional[str]:
    """Extract text content from OpenAI Chat Completions response."""
    choices = data.get("choices", [])
    if not choices:
        return None
    
    choice = choices[0]
    message = choice.get("message", {})
    content = message.get("content")
    
    if isinstance(content, str):
        return content.strip() or None
    
    return None

def _get_error_details(data: Dict[str, Any]) -> Dict[str, str]:
    """Extract error information from Azure OpenAI response."""
    error = data.get("error", {})
    return {
        "code": error.get("code", "unknown_error"),
        "message": error.get("message", "No error message provided"),
        "type": error.get("type", "unknown_type")
    }

# ------------------------------
# Payload builder (Existing)
# ------------------------------
def _build_chat_payload(
    system_prompt: Optional[str],
    user_prompt: str,
    temperature: float,
    top_p: float,
    max_tokens: int,
) -> Dict[str, Any]:
    """Build Chat Completions payload for GPT-4o."""
    messages = []
    
    if system_prompt and system_prompt.strip():
        messages.append({
            "role": "system",
            "content": system_prompt.strip()
        })
    
    messages.append({
        "role": "user", 
        "content": user_prompt.strip()
    })
    
    return {
        "messages": messages,
        "temperature": temperature,
        "top_p": top_p,
        "max_tokens": max_tokens,
        "stream": False
    }

# ------------------------------
# Crossword Generator Classes
# ------------------------------
# THEME_WORDS is kept for the /themes endpoint, but not used for generation logic.
THEME_WORDS = {
    "Lifestyle": [
        {"word": "FITNESS", "clue": "A healthy lifestyle pursuit"},
        {"word": "YOGA", "clue": "A practice for body and mind"},
        {"word": "WELLNESS", "clue": "State of being in good health"},
    ],
    "Travel": [
        {"word": "PASSPORT", "clue": "International travel document"},
        {"word": "VACATION", "clue": "Time off for leisure"},
        {"word": "HOTEL", "clue": "Temporary accommodation"},
    ],
    "Entertainment": [
        {"word": "MOVIE", "clue": "Film shown in theaters"},
        {"word": "MUSIC", "clue": "Art form with sound and rhythm"},
        {"word": "CONCERT", "clue": "Live musical performance"},
    ],
    "Technology": [
        {"word": "COMPUTER", "clue": "Electronic processing device"},
        {"word": "INTERNET", "clue": "Global network system"},
        {"word": "SOFTWARE", "clue": "Programs and applications"},
    ]
}

class CrosswordGenerator:
    def __init__(self, size: int = 15):
        self.size = size
        self.grid = [['#' for _ in range(size)] for _ in range(size)]
        self.placed_words = []
        
    def can_place_word(self, word: str, row: int, col: int, direction: str) -> bool:
        """Check if word can be placed at position"""
        if direction == 'across':
            if col + len(word) > self.size:
                return False
            for i, letter in enumerate(word):
                current = self.grid[row][col + i]
                if current != '#' and current != letter:
                    return False
            if col > 0 and self.grid[row][col - 1] != '#':
                return False
            if col + len(word) < self.size and self.grid[row][col + len(word)] != '#':
                return False
            return True
        else:  # down
            if row + len(word) > self.size:
                return False
            for i, letter in enumerate(word):
                current = self.grid[row + i][col]
                if current != '#' and current != letter:
                    return False
            if row > 0 and self.grid[row - 1][col] != '#':
                return False
            if row + len(word) < self.size and self.grid[row + len(word)][col] != '#':
                return False
            return True
    
    def place_word(self, word: str, row: int, col: int, direction: str, clue: str):
        """Place word on grid"""
        if direction == 'across':
            for i, letter in enumerate(word):
                self.grid[row][col + i] = letter
        else:
            for i, letter in enumerate(word):
                self.grid[row + i][col] = letter
        
        self.placed_words.append({
            'word': word,
            'row': row,
            'col': col,
            'direction': direction,
            'clue': clue
        })
    
    def find_intersections(self, word: str) -> List[Tuple[int, int, str]]:
        """Find possible intersection points for a word"""
        positions = []
        for placed in self.placed_words:
            for i, letter in enumerate(word):
                if letter in placed['word']:
                    for j, placed_letter in enumerate(placed['word']):
                        if letter == placed_letter:
                            if placed['direction'] == 'across':
                                new_row = placed['row'] - i
                                new_col = placed['col'] + j
                                if 0 <= new_row <= self.size - len(word):
                                    positions.append((new_row, new_col, 'down'))
                            else:
                                new_row = placed['row'] + j
                                new_col = placed['col'] - i
                                if 0 <= new_col <= self.size - len(word):
                                    positions.append((new_row, new_col, 'across'))
        return positions
    
    def generate(self, word_data: List[Dict[str, str]]):
        """Generate crossword from word list"""
        words = sorted(word_data, key=lambda x: len(x['word']), reverse=True)
        
        if words:
            first = words[0]
            start_col = (self.size - len(first['word'])) // 2
            start_row = self.size // 2
            self.place_word(first['word'], start_row, start_col, 'across', first['clue'])
        
        for word_item in words[1:]:
            word = word_item['word']
            clue = word_item['clue']
            placed = False
            
            positions = self.find_intersections(word)
            random.shuffle(positions)
            
            for row, col, direction in positions:
                if self.can_place_word(word, row, col, direction):
                    self.place_word(word, row, col, direction, clue)
                    placed = True
                    break
            
            if not placed:
                attempts = 0
                while not placed and attempts < 100:
                    row = random.randint(0, self.size - 1)
                    col = random.randint(0, self.size - 1)
                    direction = random.choice(['across', 'down'])
                    
                    if self.can_place_word(word, row, col, direction):
                        self.place_word(word, row, col, direction, clue)
                        placed = True
                    attempts += 1
    
    def get_numbered_clues(self) -> Tuple[List[Dict], List[Dict], Dict]:
        """Assign numbers to words and organize clues"""
        number_map = {}
        counter = 1
        
        for r in range(self.size):
            for c in range(self.size):
                if self.grid[r][c] != '#':
                    is_across_start = (c == 0 or self.grid[r][c-1] == '#') and \
                                     c < self.size - 1 and self.grid[r][c+1] != '#'
                    is_down_start = (r == 0 or self.grid[r-1][c] == '#') and \
                                   r < self.size - 1 and self.grid[r+1][c] != '#'
                    
                    if is_across_start or is_down_start:
                        number_map[(r, c)] = counter
                        counter += 1
        
        across_clues = []
        down_clues = []
        
        for word_info in self.placed_words:
            pos = (word_info['row'], word_info['col'])
            if pos in number_map:
                clue_obj = {
                    'number': number_map[pos],
                    'clue': word_info['clue'],
                    'answer': word_info['word']
                }
                if word_info['direction'] == 'across':
                    across_clues.append(clue_obj)
                else:
                    down_clues.append(clue_obj)
        
        across_clues.sort(key=lambda x: x['number'])
        down_clues.sort(key=lambda x: x['number'])
        
        return across_clues, down_clues, number_map

# ------------------------------
# AI Word Generation Helper
# ------------------------------
async def _generate_words_with_ai(theme: str, count: int = 10) -> List[Dict[str, str]]:
    """Generate themed words and clues using Azure OpenAI"""
    if not all([AZURE_OPENAI_API_KEY, AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_DEPLOYMENT]):
        raise HTTPException(status_code=500, detail={"message": "AI generation is not configured on the server."})
    
    system_prompt = """You are a crossword puzzle expert. Generate words and clues for a themed crossword puzzle.
Return ONLY a JSON array with exactly this format (no markdown, no extra text):
[{"word": "EXAMPLE", "clue": "A sample or instance"}, ...]

Requirements:
- Words should be 4-12 letters long
- Use only uppercase letters A-Z, no spaces or special characters
- Clues should be concise and clear
- All words must relate to the theme"""
    
    user_prompt = f"Generate {count} words with clues for a crossword puzzle themed: {theme}"
    
    payload = _build_chat_payload(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        temperature=0.8,
        top_p=0.9,
        max_tokens=1500
    )
    
    status_code, response_data = await _http_post(_chat_url(), payload)
    
    if status_code >= 400:
        error_details = _get_error_details(response_data)
        raise HTTPException(status_code=502, detail={"message": f"AI service error: {error_details['message']}"})
    
    content = _extract_content(response_data)
    if not content:
        raise HTTPException(status_code=502, detail={"message": "AI service returned an empty response."})
    
    try:
        json_match = re.search(r'\[[\s\S]*\]', content)
        if json_match:
            words_data = json.loads(json_match.group())
            valid_words = []
            for item in words_data:
                if isinstance(item, dict) and 'word' in item and 'clue' in item:
                    word = str(item['word']).upper().strip()
                    if word and re.match(r'^[A-Z]+$', word):
                        valid_words.append({
                            'word': word,
                            'clue': str(item['clue']).strip()
                        })
            if valid_words:
                return valid_words[:count]

        raise ValueError("Could not parse valid JSON from AI response")
    except (json.JSONDecodeError, ValueError) as e:
        raise HTTPException(status_code=500, detail={"message": f"Failed to parse AI response: {e}"})


# ------------------------------
# Routes (Existing - Unchanged)
# ------------------------------
@app.get("/api/health")
async def health() -> Dict[str, str]:
    """Health check endpoint."""
    return {"status": "ok", "service": "magazine-portal-api"}

@app.get("/api/version")
async def version() -> Dict[str, Any]:
    """Version and configuration info."""
    return {
        "app": "Magazine Portal API",
        "version": "1.3.0",
        "azure": {
            "endpoint_configured": bool(AZURE_OPENAI_ENDPOINT),
            "deployment": AZURE_OPENAI_DEPLOYMENT or "not_set",
            "api_version": AZURE_OPENAI_API_VERSION,
            "model_optimized_for": "GPT-4o"
        },
    }

@app.post("/api/generate")
async def generate(body: GenerateBody) -> Dict[str, Any]:
    """
    Generate text using Azure OpenAI GPT-4o.
    Optimized for the Chat Completions API with proper error handling.
    """
    if not all([AZURE_OPENAI_API_KEY, AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_DEPLOYMENT]):
        missing = [var for var in ["AZURE_OPENAI_API_KEY", "AZURE_OPENAI_ENDPOINT", "AZURE_OPENAI_DEPLOYMENT"] if not os.getenv(var)]
        raise HTTPException(status_code=500, detail={"error": "Server configuration incomplete", "missing_env_vars": missing})

    if not body.userPrompt.strip():
        raise HTTPException(status_code=400, detail={"error": "userPrompt cannot be empty"})

    payload = _build_chat_payload(
        system_prompt=body.systemPrompt, user_prompt=body.userPrompt,
        temperature=body.temperature or 0.7, top_p=body.top_p or 1.0, max_tokens=body.max_tokens or 2048
    )

    status_code, response_data = await _http_post(_chat_url(), payload)
    
    if status_code >= 400:
        error_details = _get_error_details(response_data)
        error_msg = {
            401: "Invalid API key or authentication failed",
            404: f"Deployment '{AZURE_OPENAI_DEPLOYMENT}' not found",
            429: "Rate limit exceeded or quota exhausted",
            408: "Request timeout - try reducing content length"
        }.get(status_code, error_details["message"])
        raise HTTPException(status_code=502, detail={"error": "Azure OpenAI API error", "message": error_msg, "azure_error": error_details, "status_code": status_code})

    content = _extract_content(response_data)
    if not content:
        finish_reason = response_data.get("choices", [{}])[0].get("finish_reason")
        error_msg = {
            "content_filter": "Content was filtered by Azure's safety systems",
            "length": "Response was truncated due to max_tokens limit"
        }.get(finish_reason, f"No content generated (finish_reason: {finish_reason})")
        raise HTTPException(status_code=502, detail={"error": "No content generated", "message": error_msg, "response_data": response_data})

    return {"content": content}

# ------------------------------
# Routes (New - Crossword) - REFINED
# ------------------------------
@app.post("/api/crossword/generate")
async def generate_crossword(body: CrosswordRequest) -> Dict[str, Any]:
    """
    Generate a themed crossword puzzle using AI-generated words.
    """
    try:
        theme = body.theme
        size = body.size or 15
        word_count = body.word_count or 10
        
        # Always use AI to get words for the theme
        words = await _generate_words_with_ai(theme, count=word_count)
        
        # Generate crossword
        generator = CrosswordGenerator(size=size)
        generator.generate(words)
        
        # Get numbered clues
        across_clues, down_clues, number_map = generator.get_numbered_clues()
        
        # Create grid with numbers
        display_grid = []
        for r in range(generator.size):
            row = []
            for c in range(generator.size):
                cell = {
                    'letter': generator.grid[r][c],
                    'number': number_map.get((r, c), None)
                }
                row.append(cell)
            display_grid.append(row)
        
        return {
            'grid': display_grid,
            'across': across_clues,
            'down': down_clues,
            'theme': theme,
            'size': size,
            'word_count': len(generator.placed_words),
            'ai_generated': True
        }
    
    except HTTPException:
        raise # Re-raise HTTPException to preserve status code and details
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Failed to generate crossword",
                "message": str(e)
            }
        )

@app.get("/api/crossword/themes")
async def get_crossword_themes() -> Dict[str, List[str]]:
    """Get list of available predefined themes"""
    return {"themes": list(THEME_WORDS.keys())}

# ------------------------------
# Routes (New - Horoscope) - UPDATED
# ------------------------------
@app.post("/api/horoscope/generate")
async def generate_horoscope(body: HoroscopeRequest) -> Dict[str, Any]:
    """
    Generate a personalized horoscope using Azure OpenAI.
    Creates content tailored to specific magazines and writing styles.
    """
    if not all([AZURE_OPENAI_API_KEY, AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_DEPLOYMENT]):
        raise HTTPException(status_code=500, detail={"error": "Server configuration incomplete", "message": "Azure OpenAI credentials not configured"})
    
    try:
        word_count = body.word_count or 100
        system_prompt = f"""You are an expert astrologer and writer for {body.magazine}. 
Create a {body.horoscope_type.lower()} horoscope for {body.zodiac_sign} that matches their editorial style.

Writing guidelines:
- Tone: {body.tone}
- Length: Approximately {word_count} words
- Style: Professional magazine quality, write in flowing paragraphs
- Include: Cosmic insights, practical advice, and positive guidance
- Avoid: Generic predictions, negativity, or fear-based content
- Format: Write in plain text paragraphs, DO NOT use bold headers, asterisks, or markdown formatting

Write in a {body.tone.lower()} style that resonates with {body.magazine} readers. Keep the text natural and flowing without special formatting."""
        user_prompt = f"Write a {body.horoscope_type.lower()} horoscope for {body.zodiac_sign} in approximately {word_count} words."
        max_tokens = min(int(word_count * 1.5), 1000)
        
        payload = _build_chat_payload(
            system_prompt=system_prompt, user_prompt=user_prompt,
            temperature=0.8, top_p=0.9, max_tokens=max_tokens
        )
        
        status_code, response_data = await _http_post(_chat_url(), payload)
        
        if status_code >= 400:
            error_details = _get_error_details(response_data)
            raise HTTPException(status_code=502, detail={"error": "Failed to generate horoscope", "message": error_details["message"]})
        
        content = _extract_content(response_data)
        if not content:
            raise HTTPException(status_code=502, detail={"error": "No horoscope content generated", "message": "The AI did not return any content"})
        
        return {"horoscope": content, "sign": body.zodiac_sign, "type": body.horoscope_type, "magazine": body.magazine, "tone": body.tone}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail={"error": "Horoscope generation failed", "message": str(e)})

# ------------------------------
# Static file serving (UPDATED)
# ------------------------------
HOME_PATH = Path(__file__).parent / "home.html"
INDEX_PATH = Path(__file__).parent / "index.html"
HOROSCOPE_PATH = Path(__file__).parent / "horoscope.html"
CROSSWORD_PATH = Path(__file__).parent / "crossword.html"

@app.get("/")
async def root_index():
    """Serves the main launcher page (home.html)."""
    if HOME_PATH.exists():
        return FileResponse(str(HOME_PATH))
    return JSONResponse({"message": "Magazine Portal API is running. home.html not found."}, status_code=404)

@app.get("/horoscope")
async def horoscope_page():
    """Serves the horoscope page directly (for compatibility)."""
    if HOROSCOPE_PATH.exists():
        return FileResponse(str(HOROSCOPE_PATH))
    return JSONResponse({"message": "Horoscope page not found"}, status_code=404)

@app.get("/{full_path:path}")
async def catch_all(full_path: str):
    """
    Serves any static file from the root directory.
    If a file is not found, it falls back to serving the main launcher page.
    """
    # Prevent this from capturing API calls
    if full_path.startswith("api/"):
        return JSONResponse({"message": "API route not found", "path": full_path}, status_code=404)

    file_path = Path(__file__).parent / full_path
    if file_path.exists() and file_path.is_file():
        return FileResponse(str(file_path))
    
    # Fallback to the main launcher page
    if HOME_PATH.exists():
        return FileResponse(str(HOME_PATH))
    
    return JSONResponse({"message": "File not found", "path": full_path}, status_code=404)