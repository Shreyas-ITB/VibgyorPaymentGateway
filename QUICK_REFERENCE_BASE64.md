# Base64 Encoding - Quick Reference

## TL;DR

Pass pricing data as base64 encoded JSON in the URL parameter `data`:

```
https://payment-gateway.com/?data=<base64_encoded_json>
```

## Quick Examples

### JavaScript (Browser)
```javascript
const data = {
  plans: [...],
  redirect_url: "https://yoursite.com/callback",
  payment_provider: "razorpay"
};
const url = `https://gateway.com/?data=${btoa(JSON.stringify(data))}`;
window.location.href = url;
```

### JavaScript (Node.js)
```javascript
const base64 = Buffer.from(JSON.stringify(data)).toString('base64');
```

### Python
```python
import json, base64
base64_str = base64.b64encode(json.dumps(data).encode()).decode()
```

### PHP
```php
$base64 = base64_encode(json_encode($data));
```

### cURL Test
```bash
# Encode your JSON
echo '{"plans":[...],"redirect_url":"..."}' | base64

# Use in URL
curl "http://localhost:4200/?data=<base64_string>"
```

## Required JSON Structure

```json
{
  "plans": [
    {
      "plan_id": "basic",
      "name": "Basic",
      "monthly_amount": 999,
      "annual_amount": 9990,
      "features": ["Feature 1", "Feature 2"]
    },
    {
      "plan_id": "pro",
      "name": "Pro",
      "monthly_amount": 1999,
      "annual_amount": 19990,
      "features": ["Feature 3"]
    },
    {
      "plan_id": "enterprise",
      "name": "Enterprise",
      "monthly_amount": 2999,
      "annual_amount": 29990,
      "features": ["Feature 4"]
    }
  ],
  "redirect_url": "https://yoursite.com/callback",
  "payment_provider": "razorpay"
}
```

## Testing

1. Open `test-base64-encoding.html` in browser
2. Edit JSON → Click "Encode" → Click "Open Gateway"

## Common Issues

| Issue | Solution |
|-------|----------|
| "Invalid JSON" error | Check JSON syntax, must have exactly 3 plans |
| "Failed to parse" | Verify base64 string is valid |
| Whitespace in base64 | Automatically handled, no action needed |
| Wrong plan count | Must have exactly 3 plans |
| Missing redirect_url | Required field, must be present |

## Format Detection

The gateway automatically detects the format:
1. Tries base64 decoding if string looks like base64
2. Falls back to JSON parsing if base64 fails
3. Shows error if both fail

## Benefits vs URL-encoding

- ✅ 20-30% shorter URLs
- ✅ Cleaner appearance
- ✅ No special character escaping needed
- ✅ Built-in support in most languages

## Full Documentation

See [BASE64_ENCODING_GUIDE.md](BASE64_ENCODING_GUIDE.md) for complete details.
