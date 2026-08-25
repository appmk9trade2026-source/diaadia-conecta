import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import {
  captureCurrentPosition,
  finishJourney,
  getActiveJourney,
  getJourneyInvalidationFilter,
  getJourneyQueryKey,
  isJourneyActionDisabled,
  startJourney
} from './journey.service';
import type { GeolocationSnapshot, Journey, JourneyActionState } from './journey.types';
import { FriendlyJourneyError } from './journey.types';

type UseJourneyOptions = {
  tenantId: string;
  userId: string;
  enabled: boolean;
};

function normalizeJourneyError(error: unknown) {
  if (!error) {
    return null;
  }

  if (error instanceof FriendlyJourneyError) {
    return error.message;
  }

  return 'Nao foi possivel concluir a acao. Tente novamente.';
}

export function useJourney({ tenantId, userId, enabled }: UseJourneyOptions) {
  const queryClient = useQueryClient();
  const [actionState, setActionState] = useState<JourneyActionState>('idle');
  const [actionError, setActionError] = useState<string | null>(null);
  const [recentlyFinishedJourney, setRecentlyFinishedJourney] = useState<Journey | null>(null);

  const journeyQuery = useQuery({
    queryKey: getJourneyQueryKey(tenantId, userId),
    queryFn: () => getActiveJourney(tenantId, userId),
    enabled,
    staleTime: 20_000
  });

  const invalidateJourney = () =>
    queryClient.invalidateQueries(getJourneyInvalidationFilter(tenantId, userId));

  const startMutation = useMutation({
    mutationFn: ({
      activeTenantId,
      location
    }: {
      activeTenantId: string;
      location: GeolocationSnapshot;
    }) => startJourney(activeTenantId, location),
    onSuccess: () => {
      setRecentlyFinishedJourney(null);
      return invalidateJourney();
    }
  });

  const finishMutation = useMutation({
    mutationFn: ({
      journeyId,
      location
    }: {
      journeyId: string;
      location: GeolocationSnapshot;
    }) => finishJourney(journeyId, location),
    onSuccess: (journey) => {
      setRecentlyFinishedJourney(journey);
      return invalidateJourney();
    }
  });

  const busy = isJourneyActionDisabled(actionState);

  async function handleStart() {
    if (busy) {
      return;
    }

    setActionError(null);
    setActionState('locating');

    try {
      const location = await captureCurrentPosition();
      setActionState('submitting');
      await startMutation.mutateAsync({ activeTenantId: tenantId, location });
      setActionState('idle');
    } catch (error) {
      setActionError(normalizeJourneyError(error));
      setActionState('idle');
    }
  }

  async function handleFinish(journeyId: string | null | undefined) {
    if (busy || !journeyId) {
      return;
    }

    setActionError(null);
    setActionState('locating');

    try {
      const location = await captureCurrentPosition();
      setActionState('submitting');
      await finishMutation.mutateAsync({ journeyId, location });
      setActionState('idle');
    } catch (error) {
      setActionError(normalizeJourneyError(error));
      setActionState('idle');
    }
  }

  return useMemo(
    () => ({
      journey: journeyQuery.data ?? null,
      displayJourney: journeyQuery.data ?? recentlyFinishedJourney,
      loading: journeyQuery.isLoading,
      error: normalizeJourneyError(journeyQuery.error),
      actionState,
      actionError,
      busy,
      start: handleStart,
      finish: handleFinish
    }),
    [
      actionError,
      actionState,
      busy,
      journeyQuery.data,
      journeyQuery.error,
      journeyQuery.isLoading,
      recentlyFinishedJourney
    ],
  );
}
