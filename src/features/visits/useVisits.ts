import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import {
  captureVisitPosition,
  getRecentVisits,
  getVisitsInvalidationFilter,
  getVisitsQueryKey,
  isVisitActionDisabled,
  recordVisit,
  uploadVisitPhoto,
  validateVisitForm
} from './visit.service';
import type { RecordVisitInput, Visit, VisitActionState, VisitFormData } from './visit.types';
import { FriendlyVisitError } from './visit.types';

type UseVisitsOptions = {
  tenantId: string;
  userId: string;
  activeJourneyId: string | null;
  enabled: boolean;
};

function normalizeVisitError(error: unknown) {
  if (!error) {
    return null;
  }

  if (error instanceof FriendlyVisitError) {
    return error.message;
  }

  return 'Não foi possível concluir a ação. Tente novamente.';
}

export function useVisits({ tenantId, userId, activeJourneyId, enabled }: UseVisitsOptions) {
  const queryClient = useQueryClient();
  const [actionState, setActionState] = useState<VisitActionState>('idle');
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const visitsQuery = useQuery({
    queryKey: getVisitsQueryKey(tenantId, userId),
    queryFn: () => getRecentVisits(tenantId, userId),
    enabled,
    staleTime: 20_000
  });

  const recordMutation = useMutation<Visit, Error, RecordVisitInput>({
    mutationFn: (input) => recordVisit(input),
    onSuccess: () => queryClient.invalidateQueries(getVisitsInvalidationFilter(tenantId, userId))
  });

  const busy = isVisitActionDisabled(actionState);

  async function submitVisit(formData: VisitFormData) {
    if (busy) {
      return false;
    }

    setActionError(null);
    setSuccessMessage(null);

    try {
      if (!activeJourneyId) {
        throw new FriendlyVisitError('Para registrar uma visita, inicie sua jornada primeiro.');
      }

      const validated = validateVisitForm(formData);
      const photo = formData.photo;

      if (!photo) {
        throw new FriendlyVisitError('Capture uma foto da visita para continuar.');
      }

      setActionState('locating');
      const location = await captureVisitPosition();
      const deviceCapturedAt = new Date().toISOString();

      setActionState('uploading');
      const photoPath = await uploadVisitPhoto(tenantId, userId, photo);

      setActionState('submitting');
      await recordMutation.mutateAsync({
        tenantId,
        establishmentName: validated.establishmentName,
        outcome: validated.outcome,
        location,
        photoPath,
        deviceCapturedAt
      });

      setSuccessMessage('Visita registrada com sucesso.');
      setActionState('idle');
      return true;
    } catch (error) {
      setActionError(normalizeVisitError(error));
      setActionState('idle');
      return false;
    }
  }

  return useMemo(
    () => ({
      visits: visitsQuery.data ?? [],
      loading: visitsQuery.isLoading,
      error: normalizeVisitError(visitsQuery.error),
      actionState,
      actionError,
      successMessage,
      busy,
      submitVisit
    }),
    [
      actionError,
      actionState,
      busy,
      successMessage,
      visitsQuery.data,
      visitsQuery.error,
      visitsQuery.isLoading
    ],
  );
}
