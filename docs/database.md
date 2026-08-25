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
- `claim_voucher_ocr(delivery_id uuid)`: faz claim atomico `pendente -> processando`.
- `register_voucher_ocr_result(...)`: registra resultado OCR sem finalizar voucher ou lead.
- `finalize_voucher_delivery(...)`: finaliza entrega somente com OCR `validado`, atualizando delivery, voucher, lead e auditoria na mesma transacao.

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

As policies assumem paths iniciados por `tenant_id`, por exemplo:

```text
<tenant_id>/<user_id>/<arquivo>
```

Imagens nao devem ser salvas em base64 no banco.
