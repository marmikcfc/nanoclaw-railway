---
name: fal-ai
description: Generate images and videos using fal.ai — ad creatives, social media graphics, product mockups, thumbnails, video ads, TikTok content, and UGC-style media. 1,000+ models including FLUX, Stable Diffusion, Kling, Wan, Veo, and more.
allowed-tools: Bash(curl *), Bash(cat *), Bash(ls *), Bash(base64 *)
---

# fal.ai — Image & Video Generation

Generate production-quality images and videos using fal.ai's Model APIs. 1,000+ models available including FLUX, Stable Diffusion, Kling, Wan, Veo, Recraft, and more.

## Authentication

All requests require the `FAL_KEY` environment variable (set by the platform).

```bash
# Verify key is set
echo "FAL_KEY is ${FAL_KEY:+set}"
```

Key format: opaque string from fal.ai/dashboard/keys. Auth header: `Authorization: Key $FAL_KEY`.

---

## Quick Start

### Generate an image (fastest)

```bash
curl -s -X POST "https://queue.fal.run/fal-ai/flux/schnell" \
  -H "Authorization: Key $FAL_KEY" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "a modern minimalist logo for a tech startup, white background"}' \
  | python3 -c "import sys,json; r=json.load(sys.stdin); print(r['images'][0]['url'])"
```

### Generate a video

```bash
# Submit video job (async — videos take 30-120s)
REQUEST_ID=$(curl -s -X POST "https://queue.fal.run/fal-ai/wan/v2.1/1.3b/text-to-video" \
  -H "Authorization: Key $FAL_KEY" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "a golden retriever running on a beach at sunset, cinematic, slow motion"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['request_id'])")

echo "Submitted: $REQUEST_ID"

# Poll for result (check every 10s)
while true; do
  STATUS=$(curl -s "https://queue.fal.run/fal-ai/wan/v2.1/1.3b/text-to-video/requests/$REQUEST_ID/status" \
    -H "Authorization: Key $FAL_KEY" \
    | python3 -c "import sys,json; print(json.load(sys.stdin).get('status','UNKNOWN'))")
  echo "Status: $STATUS"
  [ "$STATUS" = "COMPLETED" ] && break
  sleep 10
done

# Get result
curl -s "https://queue.fal.run/fal-ai/wan/v2.1/1.3b/text-to-video/requests/$REQUEST_ID" \
  -H "Authorization: Key $FAL_KEY" \
  | python3 -c "import sys,json; r=json.load(sys.stdin); print(r['video']['url'])"
```

---

## Image Generation Models

Pick the right model for the task:

| Model ID | Best For | Speed | Price |
|----------|---------|-------|-------|
| `fal-ai/flux/schnell` | Fast drafts, iterations, thumbnails | ~1s | ~$0.003 |
| `fal-ai/flux/dev` | High quality general images | ~5s | ~$0.025 |
| `fal-ai/flux-pro/v1.1` | Production quality, commercial use | ~8s | ~$0.04 |
| `fal-ai/flux/kontext/pro` | Edit existing images with text instructions | ~5s | ~$0.04 |
| `fal-ai/recraft/v4/pro` | Vector art, logos, brand assets, text in images | ~8s | ~$0.04 |
| `fal-ai/seedream/v4` | Photorealistic, product photography | ~5s | ~$0.03 |
| `fal-ai/nano-banana-2` | Ultra-fast, good quality | <1s | ~$0.002 |
| `fal-ai/stable-diffusion-v35-large` | Complex prompts, typography | ~10s | ~$0.03 |
| `fal-ai/ideogram/v3` | Text rendering in images, posters | ~10s | ~$0.08 |

### Choosing a model

- **Ad creatives / social posts**: `flux/schnell` for drafts → `flux-pro/v1.1` for finals
- **Logos / brand assets**: `recraft/v4/pro` (best for vector-style + text)
- **Product mockups**: `seedream/v4` (photorealistic)
- **Thumbnails**: `nano-banana-2` (ultra-fast, iterate quickly)
- **Text in images**: `ideogram/v3` (best text rendering)
- **Edit existing image**: `flux/kontext/pro` (describe what to change)

---

## Video Generation Models

| Model ID | Best For | Duration | Price |
|----------|---------|----------|-------|
| `fal-ai/wan/v2.1/1.3b/text-to-video` | Fast text-to-video, social clips | 3-5s | ~$0.05/s |
| `fal-ai/wan/v2.1/14b/text-to-video` | High quality text-to-video | 3-5s | ~$0.10/s |
| `fal-ai/kling/v2.1/pro/text-to-video` | Cinematic, professional video | 5-10s | ~$0.30/s |
| `fal-ai/minimax-video/image-to-video` | Animate a still image | 5s | ~$0.15/s |
| `fal-ai/veo/v3` | Google Veo — highest quality | 5-8s | ~$0.40/s |

### Choosing a video model

- **TikTok / Reels / Shorts**: `wan/v2.1/1.3b/text-to-video` (fast, cheap)
- **Professional ads**: `kling/v2.1/pro/text-to-video` (cinematic quality)
- **Animate product photos**: `minimax-video/image-to-video`
- **Highest quality**: `veo/v3` (most expensive but best output)

---

## Common Parameters

### Image generation

```json
{
  "prompt": "description of the image",
  "image_size": "landscape_16_9",
  "num_images": 1,
  "seed": 42,
  "enable_safety_checker": true,
  "output_format": "png"
}
```

**Image sizes** (presets):

| Preset | Resolution | Use Case |
|--------|-----------|----------|
| `square_hd` | 1024x1024 | Social posts, profile pics |
| `square` | 512x512 | Thumbnails, icons |
| `landscape_4_3` | 1024x768 | Blog headers |
| `landscape_16_9` | 1024x576 | YouTube thumbnails, ads |
| `portrait_4_3` | 768x1024 | Pinterest, stories |
| `portrait_16_9` | 576x1024 | Phone wallpapers, reels |

Or use custom dimensions: `"image_size": {"width": 1920, "height": 1080}`

### Video generation

```json
{
  "prompt": "description of the video",
  "aspect_ratio": "16:9",
  "duration": "5s"
}
```

---

## Recipes

### 1. Generate multiple ad creative variations

```bash
for i in 1 2 3 4 5; do
  curl -s -X POST "https://queue.fal.run/fal-ai/flux/schnell" \
    -H "Authorization: Key $FAL_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"prompt\": \"clean product photo of a skincare bottle on marble surface, soft lighting, variation $i\", \"seed\": $((i * 100))}" \
    | python3 -c "import sys,json; r=json.load(sys.stdin); print(f'Variation $i: {r[\"images\"][0][\"url\"]}')"
done
```

### 2. Image-to-video (animate a product photo)

```bash
# First upload the image or use a public URL
IMAGE_URL="https://example.com/product-photo.jpg"

REQUEST_ID=$(curl -s -X POST "https://queue.fal.run/fal-ai/minimax-video/image-to-video" \
  -H "Authorization: Key $FAL_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"prompt\": \"slow camera pan around the product, soft studio lighting\", \"image_url\": \"$IMAGE_URL\"}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['request_id'])")

echo "Video job submitted: $REQUEST_ID"
# Poll with the status check pattern from Quick Start
```

### 3. Edit an existing image with text instructions

```bash
curl -s -X POST "https://queue.fal.run/fal-ai/flux/kontext/pro" \
  -H "Authorization: Key $FAL_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "change the background to a tropical beach scene",
    "image_url": "https://example.com/original-photo.jpg"
  }' \
  | python3 -c "import sys,json; r=json.load(sys.stdin); print(r['images'][0]['url'])"
```

### 4. Generate a logo with text

```bash
curl -s -X POST "https://queue.fal.run/fal-ai/recraft/v4/pro" \
  -H "Authorization: Key $FAL_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "minimalist logo for a company called ACME, modern sans-serif typography, blue and white color scheme, vector style",
    "image_size": "square_hd",
    "output_format": "png"
  }' \
  | python3 -c "import sys,json; r=json.load(sys.stdin); print(r['images'][0]['url'])"
```

### 5. Upload a local file for image-to-image

```bash
# Upload a local file to fal CDN
CDN_URL=$(curl -s -X POST "https://fal.run/fal-ai/fal-cdn/upload" \
  -H "Authorization: Key $FAL_KEY" \
  -F "file=@/path/to/local/image.png" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['url'])")

echo "Uploaded: $CDN_URL"

# Use the CDN URL as input to any model that accepts image_url
```

---

## Response Format

### Image response

```json
{
  "images": [
    {
      "url": "https://v3.fal.media/files/...",
      "width": 1024,
      "height": 1024,
      "content_type": "image/png"
    }
  ],
  "seed": 42,
  "has_nsfw_concepts": [false],
  "prompt": "the expanded prompt (if enable_prompt_expansion was true)"
}
```

### Video response

```json
{
  "video": {
    "url": "https://v3.fal.media/files/...",
    "content_type": "video/mp4"
  }
}
```

**Important:** Generated media URLs (`v3.fal.media`) expire after a period. Download or re-host files you want to keep.

---

## Error Handling

| HTTP Status | Meaning | Action |
|-------------|---------|--------|
| 422 | Invalid input (bad params, content policy violation) | Fix the request — don't retry |
| 429 | Rate limited | Wait and retry |
| 500 | Server error | Retry with backoff |
| 502/503 | Runner unavailable | Retry — fal auto-scales |
| 504 | Timeout | Use queue-based async pattern for heavy models |

Error response format:
```json
{
  "detail": [{"msg": "human-readable message", "type": "error_type", "loc": ["body", "field"]}]
}
```

Use the `type` field for programmatic handling, not `msg`.

---

## Tips

- **Iterate fast**: Use `flux/schnell` or `nano-banana-2` for drafts, switch to `flux-pro` for finals
- **Reproducibility**: Set `seed` to get the same image again with the same prompt
- **Batch generation**: Use `num_images: 4` to get multiple variations in one call
- **Video is async**: Always use the submit → poll → get pattern for video models
- **File uploads**: Use fal CDN (`fal-cdn/upload`) for local files, or pass any public URL directly
- **Cost control**: Check model pricing before batch runs — `veo/v3` at $0.40/s adds up fast
- **Safety**: `enable_safety_checker: true` replaces flagged images with black; check `has_nsfw_concepts` in response

---

## Credentials Check

If requests fail with 401/403, verify:
```bash
[ -z "$FAL_KEY" ] && echo "ERROR: FAL_KEY not set" || echo "FAL_KEY is configured"
```

Get your key at fal.ai/dashboard/keys. Use "API" scope (not ADMIN).
