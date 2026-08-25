# Regras de Negocio

## Funil Oficial

```text
JORNADA
  -> VISITAS
  -> LEADS
  -> VOUCHERS
  -> ENTREGAS
```

## Entidades

- Check-in/check-out representam a jornada do consultor.
- Visit representa visita fisica de campo.
- Lead representa conversao durante uma visita.
- Voucher representa voucher disponivel ou reservado.
- Voucher delivery representa entrega fisica ou digital.

## Visitas Livres

Nao ha cadastro previo obrigatorio de estabelecimentos. O consultor pode percorrer uma regiao/avenida e digitar livremente o nome do estabelecimento visitado.

Nao criar geofence por estabelecimento, QR Code por loja, lista obrigatoria de lojas ou exigencia de endereco pre-cadastrado.

## Desfechos de Visita

- `lead_convertido`
- `recusou`
- `estabelecimento_fechado`
- `ja_possuia_cadastro`
- `outro`

## Antifraude

Nao bloquear rigidamente visitas proximas por distancia menor que 40 metros. A analise deve combinar distancia, intervalo, precisao GPS, foto, padroes repetitivos e revisao posterior do supervisor.

## OCR de Voucher

OCR e independente de visitas. Resultado validado nao finaliza automaticamente lead ou voucher. A finalizacao devera acontecer em RPC transacional futura.
