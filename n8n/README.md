# n8n

Diretorio reservado para workflows do n8n.

O fluxo futuro de OCR de voucher sera:

```text
Supabase Database Webhook
  -> n8n
  -> OpenRouter
  -> modelo multimodal
  -> resultado OCR
  -> Supabase
```

Variaveis previstas:

- `OPENROUTER_API_KEY`
- `OPENROUTER_VISION_MODEL`
- `VOUCHER_WEBHOOK_SECRET`
- `N8N_WEBHOOK_URL`

Nao colocar secrets reais neste diretorio.
