import { Camera, ImagePlus, LocateFixed, Send } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  assertVisitPhoto,
  createEmptyVisitFormData,
  validateVisitForm,
  visitOutcomeLabels
} from './visit.service';
import { visitOutcomes } from './visit.types';
import type { VisitActionState, VisitFormData } from './visit.types';

type VisitFormProps = {
  actionError: string | null;
  actionState: VisitActionState;
  busy: boolean;
  onSubmit: (formData: VisitFormData) => Promise<boolean>;
};

function getActionLabel(actionState: VisitActionState) {
  if (actionState === 'locating') return 'Obtendo localização...';
  if (actionState === 'uploading') return 'Enviando foto...';
  if (actionState === 'submitting') return 'Registrando visita...';
  return 'Registrar visita';
}

export function VisitForm({ actionError, actionState, busy, onSubmit }: VisitFormProps) {
  const [formData, setFormData] = useState<VisitFormData>(createEmptyVisitFormData);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  function updatePhoto(file: File | null) {
    setLocalError(null);

    if (previewUrl) URL.revokeObjectURL(previewUrl);

    if (!file) {
      setPreviewUrl(null);
      setFormData((current) => ({ ...current, photo: null }));
      return;
    }

    try {
      assertVisitPhoto(file);
      setPreviewUrl(URL.createObjectURL(file));
      setFormData((current) => ({ ...current, photo: file }));
    } catch (error) {
      setPreviewUrl(null);
      setFormData((current) => ({ ...current, photo: null }));
      setLocalError(error instanceof Error ? error.message : 'Não foi possível usar esta foto.');
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalError(null);

    try {
      validateVisitForm(formData);
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'Revise os dados da visita.');
      return;
    }

    const recorded = await onSubmit(formData);
    if (!recorded) return;

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setFormData(createEmptyVisitFormData());
  }

  const feedback = localError ?? actionError;

  return (
    <form className="visit-form" onSubmit={(event) => void handleSubmit(event)}>
      <div className="visit-form__header">
        <span className="visit-form__icon" aria-hidden="true">
          <Camera size={20} />
        </span>
        <div>
          <p>Nova visita</p>
          <h2>Registrar atendimento em campo</h2>
        </div>
      </div>

      <label>
        Nome do estabelecimento
        <input
          value={formData.establishmentName}
          onChange={(event) => setFormData((current) => ({ ...current, establishmentName: event.target.value }))}
          placeholder="Ex.: Mercado Central"
          disabled={busy}
          autoComplete="organization"
        />
      </label>

      <label>
        Resultado da visita
        <select
          value={formData.outcome}
          onChange={(event) =>
            setFormData((current) => ({
              ...current,
              outcome: event.target.value as VisitFormData['outcome']
            }))
          }
          disabled={busy}
        >
          <option value="">Selecione o resultado</option>
          {visitOutcomes.map((outcome) => (
            <option key={outcome} value={outcome}>
              {visitOutcomeLabels[outcome]}
            </option>
          ))}
        </select>
      </label>

      <div className="visit-photo-field">
        <span>Foto da visita</span>
        <label className="visit-photo-picker">
          <ImagePlus size={19} aria-hidden="true" />
          <span>{formData.photo ? 'Trocar foto' : 'Adicionar foto'}</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            disabled={busy}
            onChange={(event) => updatePhoto(event.target.files?.[0] ?? null)}
          />
        </label>
        {previewUrl ? (
          <div className="visit-photo-preview">
            <img src={previewUrl} alt="Prévia da foto da visita" />
            <span>{formData.photo?.name}</span>
          </div>
        ) : (
          <p className="visit-form__help">JPG, PNG ou WebP. A evidência é enviada de forma privada.</p>
        )}
      </div>

      <div className="visit-form__location">
        <LocateFixed size={18} aria-hidden="true" />
        <span>A localização será capturada ao registrar a visita.</span>
      </div>

      {feedback ? (
        <p className="journey-error" role="alert">
          {feedback}
        </p>
      ) : null}

      <button className="primary-button visit-form__submit" type="submit" disabled={busy}>
        <Send size={18} aria-hidden="true" />
        {getActionLabel(actionState)}
      </button>
    </form>
  );
}
