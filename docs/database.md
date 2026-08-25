# Banco de Dados

O Supabase oficial (`https://ehsgzuelxqyxicmaqcic.supabase.co`) continua sendo a unica fonte oficial. A migration inicial consolidada foi preparada em:

```text
supabase/migrations/202608250001_initial_schema.sql
```

Ela ainda nao foi aplicada no Supabase remoto.

## Estrategia

Como o banco oficial esta vazio, a migration inicial e consolidada. Nao ha sequencia historica de migrations antigas.

Depois que esta migration for aplicada e aprovada, ela se torna imutavel. Qualquer ajuste posterior deve gerar nova migration.

## Tabelas

- `tenants`: operacoes/clientes/casas, com `name`, `slug`, `active` e timestamps.
- `profiles`: perfil global vinculado a `auth.users`, sem `tenant_id` unico como autoridade.
- `tenant_memberships`: relacionamento usuario-tenant com roles `admin`, `supervisor` e `consultant`.
- `journeys`: check-in/check-out do consultor, separado de visitas.
- `field_routes`: roteiro/regiao do dia, sem lojas pre-cadastradas obrigatorias.
- `visit_settings`: parametros antifraude por tenant.
- `visits`: visita fisica em campo, com estabelecimento digitado livremente, evidencia e sinais antifraude.
- `leads`: conversoes originadas de visitas.
- `vouchers`: codigos disponiveis, reservados, entregues ou cancelados.
- `voucher_deliveries`: entrega e contrato OCR direto para n8n/OpenRouter.
- `audit_events`: trilha de auditoria por tenant.

Nao foram criadas `voucher_ocr_jobs` ou `voucher_ocr_results`; o contrato definitivo do OCR fica em `voucher_deliveries`.

## RPCs

- `start_journey(...)`: inicia jornada do consultor autenticado.
- `finish_journey(...)`: finaliza jornada aberta do consultor autenticado.
- `record_visit(...)`: registra visita, calcula distancia/intervalo e gera sinais antifraude.
- `review_visit(...)`: permite revisao por `admin` ou `supervisor`.
- `convert_visit_to_lead(...)`: cria lead atomicamente a partir de visita propria.
- `reserve_voucher(...)`: reserva voucher disponivel para lead validado no tenant.
- `create_voucher_delivery(...)`: cria entrega pendente com evidencia real em storage e dispara o webhook de OCR por INSERT.
- `claim_voucher_ocr(delivery_id uuid)`: faz claim atomico `pendente -> processando`.
- `register_voucher_ocr_result(...)`: registra resultado OCR sem finalizar voucher ou lead.
- `finalize_voucher_delivery(...)`: finaliza entrega somente com OCR `validado`, atualizando delivery, voucher, lead e auditoria na mesma transacao.
- `update_my_profile(...)`: permite ao usuario alterar somente dados pessoais autorizados. Omissao de `p_name` ou `p_phone` preserva o valor atual.
- `provision_tenant_admin(...)`: provisionamento backend-only do primeiro tenant/admin a partir de `auth.users.id` existente.

## Horarios e Antifraude

Horarios operacionais oficiais usam `clock_timestamp()` server-side. Timestamps enviados pelo dispositivo podem ser armazenados em `device_captured_at`, mas nao entram em duracao de jornada, intervalo entre visitas, antifraude ou KPIs.

`record_visit(...)` confirma evidencia real em `storage.objects` quando `visit_settings.photo_required = true`. Se foto for opcional, o path pode ser omitido; se qualquer path for informado, o objeto deve existir e pertencer ao tenant/consultor, caso contrario a visita falha e o path falso nao e persistido.

## Vouchers

`reserved_by_user_id` significa o usuario que executou a reserva. Ele nao representa necessariamente o consultor responsavel.

O consultor responsavel pelo voucher e derivado do `lead.consultant_id` e de `voucher_deliveries.consultant_id`.

## Views

- `vw_consultant_daily_funnel`: funil diario por consultor.
- `vw_supervisor_visit_review_queue`: fila de visitas suspeitas pendentes.
- `vw_voucher_delivery_status`: status consolidado de voucher, lead, entrega e OCR.

As views usam `security_invoker = true` para respeitar RLS quando suportado.

## Constraints e Indices

A migration define enums/check constraints para estados, coordenadas, precisao GPS, consistencia de revisao, consistencia de reserva e finalizacao.

Indices foram criados para tenant, usuario, consultor, datas operacionais, fila de revisao, status de voucher e fila OCR.

## Storage

Buckets privados preparados pela migration:

- `visit-photos`
- `voucher-photos`

As policies assumem paths estritos:

```text
<tenant_uuid>/<user_uuid>/<uuid-do-arquivo>.<jpg|jpeg|png|webp>
```

Imagens nao devem ser salvas em base64 no banco.
