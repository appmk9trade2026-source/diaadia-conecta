# Seguranca

## RLS e Multi-Tenant

Toda tabela multi-tenant devera ter RLS habilitado. Politicas devem garantir que usuarios acessem apenas dados dos tenants aos quais pertencem.

O frontend nao e fonte confiavel para `tenant_id`. Operacoes criticas devem consultar membership/perfil server-side e validar o tenant antes de gravar ou finalizar processos.

## Secrets

- `.env` e `.env.*` nao devem ser versionados.
- `.env.example` contem somente placeholders.
- `SUPABASE_SERVICE_ROLE_KEY`, `OPENROUTER_API_KEY` e `VOUCHER_WEBHOOK_SECRET` sao server-side/n8n.
- `service_role` nunca pode entrar no bundle frontend.

## SECURITY DEFINER

Funcoes `SECURITY DEFINER` devem:

- Definir `search_path` seguro.
- Validar usuario autenticado.
- Validar tenant e permissao.
- Evitar vazamento cross-tenant.
- Registrar auditoria quando houver impacto critico.

## Storage

Fotos, evidencias e arquivos sensiveis devem usar buckets privados. Quando for preciso expor arquivo ao usuario, usar signed URL temporaria.
