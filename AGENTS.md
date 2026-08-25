# AGENTS.md - Constituicao Tecnica do DIA A DIA CONECTA

Este arquivo define regras persistentes para agentes e pessoas que trabalhem neste repositorio.

## Fonte Oficial

- Repositorio oficial: `appmk9trade2026-source/diaadia-conecta`.
- Supabase oficial: `https://ehsgzuelxqyxicmaqcic.supabase.co`.
- Nao criar outro projeto Supabase.
- Nao tratar Supabase local como fonte de verdade alternativa.
- Nao executar migrations automaticamente sem etapa explicita de revisao/aprovacao.

## Arquitetura de Dominio

Separacao obrigatoria:

- Check-in/check-out = jornada do consultor.
- Visit = visita fisica realizada no campo.
- Lead = estabelecimento ou pessoa convertida durante uma visita.
- Voucher = voucher disponivel/reservado.
- Voucher delivery = entrega fisica ou digital do voucher.

Funil oficial: jornada -> visitas -> leads -> vouchers -> entregas.

Nunca misturar essas entidades em nomes de tabela, regras de negocio, UI ou RPCs.

## Operacao em Campo

- Nao exigir cadastro previo obrigatorio de estabelecimentos.
- Nao criar geofence por estabelecimento.
- Nao exigir endereco previamente cadastrado.
- Nao criar QR Code por loja.
- Nao criar lista obrigatoria de lojas.
- O nome do estabelecimento deve poder ser digitado livremente na visita.

## Multi-Tenant, RLS e Seguranca

- RLS e obrigatorio nas tabelas multi-tenant.
- Nunca desabilitar RLS para corrigir erro.
- Nunca colocar `service_role` no frontend.
- Nunca commitar secrets, chaves reais ou arquivos `.env`.
- Nao confiar em `tenant_id` vindo do navegador.
- Operacoes criticas devem validar usuario e tenant server-side.
- Funcoes `SECURITY DEFINER` devem validar explicitamente permissao, tenant e `search_path` seguro.
- Evidencias sensiveis devem ficar em storage privado.
- Usar signed URLs temporarias quando necessario.
- Toda protecao cross-tenant deve ser testada ou auditada antes de release.

## OCR de Voucher

Fluxo oficial futuro: Supabase -> Database Webhook -> n8n -> OpenRouter -> modelo multimodal -> resultado OCR -> Supabase.

- OpenRouter e o provedor de OCR.
- Nao usar Anthropic diretamente.
- Nao usar OpenAI diretamente.
- Nao executar OCR no frontend.
- OCR de voucher deve ser independente de `visits`.
- OCR validado nao finaliza automaticamente voucher ou lead.
- Finalizacao futura deve ocorrer por RPC transacional, como `finalize_voucher_delivery(...)`.

## Migrations

- O banco oficial esta vazio nesta etapa.
- A primeira migration deve ser consolidada e revisada antes de ser aplicada.
- Migrations ja aplicadas nunca devem ser editadas.
- Alteracoes posteriores devem gerar nova migration.

## Qualidade e Mudancas

- Exigir testes para regras de dominio, permissoes, RPCs, componentes criticos e regressao de bugs.
- Auditar impacto antes de mudancas criticas em schema, RLS, secrets, auth, OCR e operacoes financeiras/comerciais.
- Nao alterar contratos existentes sem justificar a motivacao e registrar impacto.
- Preferir mudancas pequenas, revisaveis e alinhadas aos dominios oficiais.
