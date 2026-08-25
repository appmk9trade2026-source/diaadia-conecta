# Contrato n8n OCR

Este documento define o contrato entre Supabase, n8n e OpenRouter para OCR de vouchers.

## Arquitetura

```text
Frontend
  -> upload privado em voucher-photos
  -> create_voucher_delivery(...)
  -> INSERT em public.voucher_deliveries
  -> Supabase Database Webhook
  -> n8n
  -> claim_voucher_ocr(...)
  -> OpenRouter multimodal
  -> register_voucher_ocr_result(...)
  -> Realtime/consulta pelo frontend
  -> finalize_voucher_delivery(...) em fluxo separado
```

O OCR nao roda no frontend e nao usa Anthropic/OpenAI diretamente.

## Sequencia Oficial

1. Frontend faz upload da foto no bucket privado `voucher-photos`.
2. O path deve seguir `<tenant_uuid>/<user_uuid>/<uuid-do-arquivo>.<jpg|jpeg|png|webp>`.
3. Frontend chama `create_voucher_delivery(voucher_id, lead_id, voucher_photo_path)`.
4. A RPC deriva `tenant_id` e `consultant_id` pelo lead, valida voucher reservado e confirma existencia do objeto em `storage.objects`.
5. O INSERT em `public.voucher_deliveries` dispara o Database Webhook.
6. n8n valida `VOUCHER_WEBHOOK_SECRET`.
7. n8n chama `claim_voucher_ocr(delivery_id)`.
8. Se o claim retornar um registro, o n8n continua; se retornar zero, encerra sem OCR duplicado.
9. n8n busca voucher/evidencia com credencial backend.
10. OpenRouter executa OCR sem receber o codigo esperado como prompt.
11. n8n compara o resultado com o voucher esperado em camada backend.
12. n8n chama `register_voucher_ocr_result(...)`.
13. Frontend recebe mudanca por Realtime ou refetch.
14. `finalize_voucher_delivery(...)` e chamada separadamente pelo usuario autorizado.
15. OCR nunca entrega voucher automaticamente.

O JSON n8n existente precisa ser atualizado para usar estas RPCs oficiais.

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
- `reserved_by_user_id`

`reserved_by_user_id` e o usuario que executou a reserva. O consultor responsavel vem do lead/delivery.

## Estados OCR

Maquina de estados inicial:

```text
pendente -> processando -> validado | reprovado | revisao_manual
```

- `pendente`: entrega criada e aguardando processamento.
- `processando`: worker n8n fez claim atomico.
- `validado`: OCR confirmou codigo com confianca suficiente.
- `reprovado`: OCR rejeitou a evidencia/codigo.
- `revisao_manual`: OCR inconclusivo ou exige supervisao.

Retry tecnico deve ser modelado em contrato proprio futuro. O worker nao pode reprocessar arbitrariamente um registro ja finalizado ou em revisao manual.

## Claim Atomico

RPC:

```sql
claim_voucher_ocr(delivery_id uuid)
```

Contrato:

- Atualiza somente `ocr_status = 'pendente'` para `processando`.
- Exige `delivery_status = 'pendente'`.
- Retorna o registro quando o claim foi adquirido.
- Retorna zero registros quando outro worker ja fez claim ou o status nao esta pendente.
- Nao altera voucher, lead, tenant, consultor ou finalizacao.
- E backend-only, concedida somente a `service_role`.

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

- Aceita somente transicao a partir de `processando`.
- `ocr_status` final deve ser `validado`, `reprovado` ou `revisao_manual`.
- `ocr_confidence` deve ficar entre 0 e 100.
- `ocr_raw_response` e `jsonb`.
- Nao salvar imagem base64 no banco.
- Nao marcar voucher como entregue.
- Nao concluir lead.
- Nao trocar `tenant_id`, `voucher_id`, `lead_id` ou `consultant_id`.
- E backend-only, concedida somente a `service_role`.

## Finalizacao

RPC:

```sql
finalize_voucher_delivery(delivery_id uuid)
```

So pode finalizar quando:

```text
voucher_deliveries.ocr_status = validado
voucher_deliveries.delivery_status = pendente
vouchers.status = reservado
```

Na mesma transacao, a RPC valida usuario, tenant, membership, delivery, voucher, lead, reserva e consultor responsavel. Em seguida:

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

O n8n deve validar `VOUCHER_WEBHOOK_SECRET` e usar credencial server-side para chamar as RPCs backend-only.
