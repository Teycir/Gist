# OpenRouter Integration - Implementation Summary

## Overview
Added OpenRouter support for true privacy with free Qwen models as an alternative to Google AI.

## Key Features
- **Dual Provider Support**: Users can choose between Google AI (Gemini Flash) or OpenRouter (Qwen)
- **Separate API Keys**: Independent key storage for Google and OpenRouter
- **Smart Model Selection**: Automatic filtering for latest, largest free Qwen models
- **Privacy First**: OpenRouter doesn't log requests, providing true privacy

## Changes Made

### 1. Background.js
- Added `callOpenRouter` message handler
- Handles OpenRouter API calls with proper headers (Authorization, HTTP-Referer, X-Title)

### 2. Popup.html
- Added provider selection dropdown (Google AI / OpenRouter)
- Separate input fields for Google API key and OpenRouter API key
- Dynamic visibility based on selected provider
- Updated help links for both providers

### 3. Popup.js
- Added `loadOpenRouterModels()` function with Qwen filtering logic:
  - Filters for models containing "qwen" and "free"
  - Sorts by version (Qwen 3 > Qwen 2)
  - Sorts by size (8B > 4B)
  - Stores primary + 2 fallback models
- Updated `getElements()` to include provider and both API key inputs
- Modified save handler to validate appropriate key based on provider
- Updated DOMContentLoaded to restore provider selection and both keys

### 4. Content.js
- Added provider detection in `summarizeResults()`
- Dual model loading logic:
  - Google: Gemini Flash models (existing logic)
  - OpenRouter: Free Qwen models (new logic)
- Updated `callModel()` to handle both API formats:
  - Google: `generateContent` endpoint with `contents` array
  - OpenRouter: `chat/completions` endpoint with `messages` array
- Modified response parsing to handle both formats:
  - Google: `data.candidates[0].content.parts[0].text`
  - OpenRouter: `data.choices[0].message.content`

## Model Selection Logic

### Google AI (Gemini Flash)
1. Filter: Flash models, exclude Lite
2. Sort by version (2.0 > 1.5)
3. Prefer stable over preview
4. Primary + 2 fallbacks

### OpenRouter (Qwen)
1. Filter: Contains "qwen" AND "free"
2. Sort by version number (3 > 2)
3. Sort by parameter size (8B > 4B)
4. Primary + 2 fallbacks

Example Qwen models:
- `qwen/qwen-2.5-72b-instruct:free` (primary if available)
- `qwen/qwen-2-7b-instruct:free` (fallback)

## Privacy Benefits
- **OpenRouter**: No request logging, no data collection
- **Your API Key**: Direct control over usage
- **Open Source**: Full transparency
- **No Tracking**: Zero telemetry

## User Experience
1. Open settings
2. Select provider (Google AI or OpenRouter)
3. Enter appropriate API key
4. Save settings
5. Extension auto-loads best available models

## API Key Sources
- **Google AI**: https://aistudio.google.com/api-keys (Free: 1500 req/day)
- **OpenRouter**: https://openrouter.ai/keys (Free tier available)

## Testing
- Test Google AI provider with valid Gemini key
- Test OpenRouter provider with valid OpenRouter key
- Verify model auto-selection for both providers
- Confirm summaries work with both providers
- Check fallback logic when primary model fails
