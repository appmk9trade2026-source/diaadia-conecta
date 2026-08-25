---
name: dia-a-dia-ui-ux-designer
description: Use for DIA A DIA CONECTA UI/UX design work, product interface decisions, design reviews, and frontend experience planning while preserving the project's domain, security, and operational boundaries.
metadata:
  display_name: "DIA A DIA — UI/UX Designer"
  short_description: "UI/UX guidance for DIA A DIA CONECTA"
---

# DIA A DIA — UI/UX Designer

Use this skill when designing, reviewing, planning, or implementing user experience and interface work for the DIA A DIA CONECTA project.

This skill is a permanent project reference. It preserves the UI/UX direction, product boundaries, and design constraints that must guide future work.

## Product Context

DIA A DIA CONECTA is a field-operation product for consultants who perform daily journeys, physical visits, lead conversion, voucher availability or reservation, and voucher delivery.

The official funnel is:

1. jornada
2. visitas
3. leads
4. vouchers
5. entregas

Keep these domains visibly and conceptually separate in navigation, labels, flows, UI copy, state models, and component naming.

## Domain Boundaries

Respect the project's official separation:

- Check-in/check-out is the consultant's journey.
- Visit is a physical field visit.
- Lead is an establishment or person converted during a visit.
- Voucher is an available or reserved voucher.
- Voucher delivery is the physical or digital delivery of a voucher.

Do not merge these entities in labels, screens, data entry, business rules, UI grouping, table names, RPC assumptions, or analytics language.

## Field Operation Principles

Design for fast, low-friction use in the field.

- Do not require a pre-registered establishment before a visit.
- Do not require a pre-registered address before a visit.
- Do not require a mandatory store list.
- Do not require a store-specific QR code.
- Do not design geofencing around establishments.
- The establishment name must be free text during a visit.

Prefer mobile-first flows that tolerate unstable connectivity, distractions, sunlight, movement, and short attention windows.

## Experience Goals

The interface should feel operational, clear, trustworthy, and fast.

Prioritize:

- quick scanning
- low typing burden
- explicit status
- obvious next action
- recoverable mistakes
- useful empty states
- direct labels in Portuguese when user-facing text is part of the product
- accessibility and legibility on mobile screens
- practical workflows over decorative presentation

Avoid marketing-style screens, oversized hero layouts, purely decorative cards, and visual noise in operational surfaces.

## Information Architecture

Represent the official funnel in a way users can understand without confusing the underlying entities.

Recommended top-level areas:

- Jornada
- Visitas
- Leads
- Vouchers
- Entregas
- Relatórios or Gestão, when appropriate for back-office users

Do not hide critical field actions behind broad generic labels such as "Atividades" if that obscures the domain.

## UI Design Direction

Use a restrained, work-focused interface.

- Prefer dense but readable layouts.
- Use clear hierarchy, compact controls, and predictable navigation.
- Use cards only for repeated items, summaries, modals, or genuinely framed tools.
- Do not place cards inside cards.
- Do not make floating-card page sections.
- Use full-width bands or unframed layouts for major sections.
- Keep border radii modest, normally 8px or less unless an existing design system says otherwise.
- Avoid one-note palettes dominated by a single hue family.
- Avoid generic purple gradients, beige-heavy themes, dark blue monotony, and purely decorative blobs or orbs.

The UI should feel like a field operations system, not a landing page.

## Mobile Interaction

Design mobile workflows as the default for consultants.

- Primary actions must be reachable and easy to tap.
- Use large enough touch targets.
- Keep forms short and grouped by task.
- Persist progress where possible.
- Use clear validation near the relevant field.
- Use stepwise disclosure only when it reduces cognitive load.
- Avoid making users navigate away to complete the next obvious action.

For desktop or administrative views, prioritize comparison, filters, tables, auditability, and bulk scanning.

## Forms and Data Entry

Forms should minimize friction while preserving domain correctness.

- Establishment name during a visit must allow free text.
- Use optional fields when the operation can continue without them.
- Show required fields clearly.
- Avoid requiring data that the field consultant cannot reasonably know.
- Use masks and input helpers for phone, document, currency, and date fields when relevant.
- Preserve user-entered text instead of clearing forms after validation errors.
- Use confirmation only for actions with real operational impact.

Do not introduce frontend assumptions that trust `tenant_id` from the browser or bypass server-side validation.

## Status and Feedback

Every critical operational object should show a clear status.

Use status language that maps to the official domain:

- jornada iniciada, em andamento, encerrada
- visita registrada
- lead convertido
- voucher disponível, reservado, entregue, pendente, inválido, when supported by the backend contract
- entrega pendente, concluída, com erro, when supported by the backend contract

Do not invent final states that imply backend behavior not yet implemented.

## Security and Privacy Boundaries

UI/UX work must respect the project's security model.

- Never place `service_role` in frontend assumptions, code, examples, or docs.
- Never design flows that rely on trusting `tenant_id` from the browser.
- Do not suggest disabling RLS to fix UX or data access problems.
- Sensitive evidence must be treated as private.
- Use temporary signed URLs when displaying private evidence is required by the approved backend flow.
- Critical operations must be presented as server-validated actions.

Design should make secure behavior understandable without exposing implementation details to end users.

## Supabase, RLS, Auth, n8n, and Migrations

UI/UX work must not casually alter backend boundaries.

- Do not alter Supabase unless explicitly requested.
- Do not alter RLS unless explicitly requested and reviewed.
- Do not alter auth unless explicitly requested and reviewed.
- Do not alter n8n unless explicitly requested.
- Do not alter migrations unless explicitly requested and reviewed.
- Do not create a new Supabase project.
- Do not treat local Supabase as an alternative source of truth.

When a design requires backend support, document the need rather than silently changing backend behavior.

## OCR and Voucher Delivery

Respect the future OCR architecture:

Supabase -> Database Webhook -> n8n -> OpenRouter -> multimodal model -> OCR result -> Supabase

Design implications:

- OCR is independent of visits.
- OCR runs outside the frontend.
- OpenRouter is the OCR provider.
- Do not design frontend OCR execution.
- Do not design direct Anthropic or direct OpenAI OCR use.
- Validated OCR must not automatically finalize a voucher or lead.
- Future finalization should be represented as a separate transactional action, such as `finalize_voucher_delivery(...)`, when that backend contract exists.

## Copywriting

Use concise, operational Portuguese for product UI text unless the surrounding product language says otherwise.

Prefer:

- "Iniciar jornada"
- "Encerrar jornada"
- "Registrar visita"
- "Nome do estabelecimento"
- "Converter lead"
- "Reservar voucher"
- "Registrar entrega"
- "Ver detalhes"

Avoid vague or cross-domain labels such as:

- "Finalizar tudo"
- "Cadastrar loja obrigatória"
- "Check-in da visita", when the action is actually jornada
- "Voucher do lead", when the object is a delivery

## Accessibility

Design for real-world use.

- Maintain sufficient color contrast.
- Do not rely on color alone for status.
- Keep text readable on small screens.
- Ensure button text fits its container.
- Support keyboard focus where applicable.
- Provide clear labels for icon-only controls.
- Keep loading, error, success, and empty states understandable.

## Design Review Checklist

Before considering UI/UX work ready, check:

- The official funnel remains clear.
- Jornada, visita, lead, voucher, and entrega are not mixed.
- Field consultants can type an establishment name freely.
- No mandatory establishment registry, address registry, store list, store QR code, or establishment geofence was introduced.
- Security boundaries remain intact.
- Frontend does not depend on `service_role`.
- Frontend does not trust browser-provided `tenant_id`.
- Supabase, RLS, auth, n8n, and migrations were not changed unless explicitly requested.
- Mobile flows are fast and practical.
- UI labels are clear and operational.
- Empty, loading, error, and success states are covered.
- The visual design is restrained and work-focused.

## When Implementing Frontend

Only implement frontend changes when the user explicitly asks for implementation.

When implementation is requested:

- Read the current code and design conventions first.
- Reuse existing components, tokens, routes, and patterns where possible.
- Keep changes small and reviewable.
- Verify responsive behavior.
- Run relevant tests or checks available in the project.
- Do not touch backend, Supabase, RLS, auth, n8n, or migrations unless the user explicitly expands scope.

## When Only Planning or Reviewing

If the user asks for design planning, audit, review, or recommendations:

- Do not edit frontend files unless explicitly asked.
- Provide concrete UI/UX guidance grounded in the project domain.
- Identify backend dependencies separately from frontend design suggestions.
- Call out any security or domain boundary risk clearly.

