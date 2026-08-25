# Contrato n8n OCR

Este documento define o contrato entre Supabase, n8n e OpenRouter para OCR de vouchers.

## Arquitetura

```text
Supabase
  -> Database Webhook
  -> n8n
  -> OpenRouter
  -> modelo multimodal
  -> resultado OCR
  -> Supabase
```

O OCR nao roda no frontend e nao usa Anthropic/OpenAI diretamente.

## Tabela

O workflow usa diretamente:

```text
public.voucher_deliveries
```

Campos lidos pelo workflow:

- `id`
- `tenant_id`
- `voucher_id`
- `lead_id`
- `consultant_id`
- `voucher_photo_path`
- `ocr_status`

Campos relacionados em `public.vouchers`:

- `id`
- `tenant_id`
- `code`
- `checksum_digit`
- `status`
- `reserved_by`

## Estados OCR

- `pendente`: entrega criada e aguardando processamento.
- `processando`: worker n8n fez claim atomico.
- `validado`: OCR confirmou codigo com confianca suficiente.
- `reprovado`: OCR rejeitou a evidencia/codigo.
- `revisao_manual`: OCR inconclusivo ou exige supervisao.

## Claim Atomico

RPC:

```sql
claim_voucher_ocr(delivery_id uuid)
```

Contrato:

- Atualiza somente `ocr_status = 'pendente'` para `processando`.
- Retorna o registro quando o claim foi adquirido.
- Retorna zero registros quando outro worker ja fez claim ou o status nao esta pendente.
- Nao altera voucher, lead, tenant, consultor ou finalizacao.

Uso esperado pelo n8n:

1. Receber evento do Supabase para delivery pendente.
2. Chamar `claim_voucher_ocr(delivery_id)`.
3. Continuar somente se a resposta contiver um registro.

## Resultado OCR

RPC:

```sql
register_voucher_ocr_result(...)
```

Campos gravados:

- `ocr_status`
- `ocr_code_detected`
- `ocr_confidence`
- `ocr_model`
- `ocr_error`
- `ocr_error_message`
- `ocr_raw_response`
- `ocr_processed_at`

Regras:

- `ocr_confidence` deve ficar entre 0 e 100.
- `ocr_raw_response` e `jsonb`.
- Nao salvar imagem base64 no banco.
- Nao marcar voucher como entregue.
- Nao concluir lead.
- Nao trocar `tenant_id`, `voucher_id`, `lead_id` ou `consultant_id`.

## Finalizacao

RPC:

```sql
finalize_voucher_delivery(delivery_id uuid)
```

So pode finalizar quando:

```text
voucher_deliveries.ocr_status = validado
```

Na mesma transacao, a RPC valida usuario, tenant, membership, delivery, voucher, lead e reserva. Em seguida:

- marca `voucher_deliveries.delivery_status = finalizada`;
- marca `vouchers.status = entregue`;
- atualiza `vouchers.delivered_at`;
- atualiza `leads.status = voucher_entregue`;
- registra auditoria.

Nenhuma atualizacao parcial deve sobreviver se qualquer etapa falhar.

## Webhook

Evento previsto:

```text
INSERT em public.voucher_deliveries quando ocr_status = pendente
```

O webhook deve enviar pelo menos:

- `delivery_id`
- `tenant_id`
- `voucher_id`
- `lead_id`
- `consultant_id`
- `voucher_photo_path`

O n8n deve validar o segredo do webhook (`VOUCHER_WEBHOOK_SECRET`) e usar credencial server-side para chamar as RPCs backend-only.
