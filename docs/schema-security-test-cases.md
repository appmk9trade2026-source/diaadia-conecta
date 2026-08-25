# Casos de Seguranca do Schema

Estes cenarios devem ser usados na auditoria e em testes automatizados futuros da migration inicial.

1. Consultant do tenant A nao le dados operacionais do tenant B.
2. Membership inativo perde acesso operacional mesmo quando `consultant_id` historico e do usuario.
3. Consultant nao consegue reativar o proprio profile.
4. Consultant nao lista estoque completo de vouchers disponiveis do tenant.
5. Supervisor/admin nao atribui `field_routes.consultant_id` a usuario sem membership consultant ativo no mesmo tenant.
6. Visita sem foto real falha quando `visit_settings.photo_required = true`.
7. Photo path apontando para outro tenant falha em `record_visit`.
8. Timestamp manipulado pelo dispositivo nao altera `visited_at`, intervalo antifraude ou KPIs.
9. Delivery nao pode ser criada para voucher de outro tenant.
10. Delivery nao pode ser criada para lead de outro tenant.
11. Delivery nao pode ser criada com voucher que nao esteja `reservado`.
12. Webhook duplicado so permite um claim `pendente -> processando`.
13. Usuario `authenticated` nao executa `claim_voucher_ocr`.
14. Usuario `authenticated` nao executa `register_voucher_ocr_result`.
15. OCR `validado` com codigo divergente falha.
16. OCR nao muda voucher para `entregue`.
17. `finalize_voucher_delivery` sem OCR `validado` falha.
18. Consultant nao finaliza delivery de outro consultor.
19. Finalizacao correta atualiza delivery, voucher, lead e audit na mesma transacao.
20. Storage nao permite leitura cross-tenant.

## Observacoes de Execucao

- Estes cenarios nao foram executados contra Supabase remoto.
- A validacao atual e estatica porque `psql` e Supabase CLI nao estao disponiveis no ambiente.
- Quando houver banco descartavel, os cenarios devem ser automatizados antes da aplicacao oficial.
