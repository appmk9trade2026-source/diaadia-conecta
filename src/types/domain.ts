export const visitOutcomes = [
  'lead_convertido',
  'recusou',
  'estabelecimento_fechado',
  'ja_possuia_cadastro',
  'outro'
] as const;

export type VisitOutcome = (typeof visitOutcomes)[number];

export const workflowStages = [
  {
    key: 'jornada',
    label: 'Jornada',
    description: 'Check-in e check-out representam a jornada do consultor.'
  },
  {
    key: 'visitas',
    label: 'Visitas',
    description: 'Visitas fisicas livres, sem cadastro previo obrigatorio de lojas.'
  },
  {
    key: 'leads',
    label: 'Leads',
    description: 'Conversoes registradas a partir de uma visita de campo.'
  },
  {
    key: 'vouchers',
    label: 'Vouchers',
    description: 'Vouchers disponiveis, reservados e entregues por fluxo proprio.'
  },
  {
    key: 'entregas',
    label: 'Entregas',
    description: 'Entrega fisica ou digital, validada por processo transacional futuro.'
  }
] as const;
