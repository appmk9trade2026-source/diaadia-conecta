# Seguranca

## RLS e Multi-Tenant

Todas as tabelas multi-tenant da migration inicial possuem RLS habilitado. A autorizacao e baseada em `tenant_memberships`, nao em um `tenant_id` isolado em `profiles` nem em valor enviado pelo navegador.

Helpers de autorizacao:

- `current_user_is_tenant_member(tenant_id)`
- `current_user_has_tenant_role(tenant_id, roles)`
- `assert_current_user_tenant_role(tenant_id, roles)`

As RPCs criticas usam `SECURITY DEFINER`, `SET search_path = public, pg_temp`, validacao explicita de `auth.uid()`, membership, role e tenant.

## Matriz de Acesso

| Papel | Pode | Nao pode |
| --- | --- | --- |
| consultant | Ver propria jornada, proprias visitas, proprios leads e operar fluxos permitidos de voucher | Revisar visitas, administrar tenant, ver dados arbitrarios de outro consultor |
| supervisor | Visualizar operacao do tenant, acompanhar equipe, revisar visitas | Acessar outro tenant, burlar RPC critica |
| admin | Administrar dados do tenant conforme contrato | Acessar outro tenant, desabilitar RLS, finalizar OCR diretamente fora do fluxo |
| service_role | Executar processos backend autorizados, como OCR n8n | Ser usado no frontend ou exposto em arquivos versionados |

## Frontend

O frontend nunca deve:

- usar `service_role`;
- executar OCR;
- marcar voucher como `entregue` diretamente;
- confiar em `tenant_id` como autoridade;
- gravar secrets em bundle, `.env` versionado ou URL.

## OCR

`claim_voucher_ocr(...)` e `register_voucher_ocr_result(...)` sao backend-only e concedidas ao `service_role`.

OCR validado nao finaliza voucher automaticamente. A finalizacao passa por `finalize_voucher_delivery(...)`, que valida usuario, tenant, delivery, voucher, lead, reserva e status OCR antes de atualizar qualquer estado.

## Delivery de Voucher

Entregas sao criadas somente por `create_voucher_delivery(...)`. A RPC deriva `tenant_id` e `consultant_id` pelo lead, valida voucher reservado para o mesmo lead/tenant e confirma evidencia real em `storage.objects`.

Nao existe policy de INSERT direto em `voucher_deliveries` para `authenticated`.

Visitas seguem a mesma regra de evidencia: foto obrigatoria exige objeto real; foto opcional pode ser omitida; qualquer path informado deve existir e pertencer ao tenant/consultor antes de ser persistido.

## Bootstrap Administrativo

O primeiro admin deve ser criado por `provision_tenant_admin(...)`, RPC concedida somente a `service_role`. Ela exige `auth.users.id` existente e cria/ativa tenant, profile e membership admin sem email/senha hardcoded.

## Storage

Buckets sensiveis sao privados:

- `visit-photos`
- `voucher-photos`

Consultores podem enviar evidencias para tenants nos quais possuem membership de consultant. Supervisores/admins podem ler evidencias do tenant. Exposicao ao usuario deve ocorrer por signed URL temporaria gerada em camada backend adequada.

Formato oficial de path:

```text
<tenant_uuid>/<user_uuid>/<uuid-do-arquivo>.<jpg|jpeg|png|webp>
```

As policies validam o formato antes de extrair tenant, exigem usuario correto no path e bloqueiam `../`, `//` e leitura cross-tenant.

## Auditoria

Eventos criticos sao registrados em `audit_events`. Metadados nao devem conter secrets, base64, signed URLs ou payloads sensiveis desnecessarios.
