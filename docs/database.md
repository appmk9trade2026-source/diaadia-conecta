# Banco de Dados

O Supabase oficial (`https://ehsgzuelxqyxicmaqcic.supabase.co`) esta criado e vazio. Nenhuma SQL foi aplicada nesta etapa.

## Estrategia

A primeira migration oficial devera ser consolidada, versionada e revisada antes de aplicacao:

```text
supabase/migrations/202608250001_initial_schema.sql
```

Este arquivo ainda nao deve ser escrito como migration completa antes do desenho final do modelo.

## Tabelas Previstas

- `tenants`
- `profiles`
- `tenant_memberships`
- `journeys`
- `route_plans`
- `visits`
- `visit_evidence`
- `leads`
- `vouchers`
- `voucher_reservations`
- `voucher_deliveries`
- `voucher_ocr_jobs`
- `voucher_ocr_results`
- `audit_events`
- `fraud_review_events`

## RPCs Previstas

- `start_journey(...)`
- `finish_journey(...)`
- `record_visit(...)`
- `convert_visit_to_lead(...)`
- `reserve_voucher(...)`
- `finalize_voucher_delivery(...)`
- `review_visit(...)`
- `register_voucher_ocr_result(...)`

## Views Previstas

- `consultant_daily_funnel`
- `supervisor_visit_review_queue`
- `voucher_delivery_status`
- `tenant_operational_dashboard`

## Principios de Modelagem

- `tenant_id` deve ser derivado/validado server-side em operacoes criticas.
- Tabelas multi-tenant devem ter RLS habilitado.
- Evidencias sensiveis devem apontar para objetos em storage privado.
- Sinais antifraude devem ser armazenados sem bloquear automaticamente casos legitimos de lojas lado a lado.
