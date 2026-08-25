# Arquitetura

O DIA A DIA CONECTA sera construido como aplicacao React/TypeScript com Vite, TanStack Router para rotas, TanStack Query para cache e sincronizacao de dados, Supabase JS para comunicacao com o backend e Zod para contratos de entrada.

## Fluxo Macro

```text
Frontend React
  -> Supabase Auth / PostgREST / RPC / Storage
  -> Database Webhooks
  -> n8n
  -> OpenRouter multimodal
  -> Supabase
```

## Dominios

- Jornada: check-in e check-out do consultor.
- Visitas: registros fisicos em campo, com estabelecimento digitado livremente.
- Leads: conversoes feitas durante visitas.
- Vouchers: disponibilidade e reserva.
- Entregas: entrega fisica/digital e futura finalizacao transacional.
- Governance: auditoria, antifraude e revisao de supervisor.

## Separacao de Responsabilidades

O frontend nunca deve executar OCR, guardar secrets ou usar `service_role`. Regras criticas devem viver em politicas RLS, RPCs seguras, edge functions ou processos server-side/n8n, conforme desenho futuro.

O n8n sera orquestrador externo do OCR de voucher. O resultado OCR volta ao Supabase como dado pendente de validacao; nao finaliza automaticamente lead ou voucher.
