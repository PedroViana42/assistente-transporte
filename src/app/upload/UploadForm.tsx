"use client";

import { useRef, useState } from "react";

type UploadError = "arquivo" | "formato" | "tamanho" | "processamento";

const ERROR_MESSAGES: Record<UploadError, string> = {
  arquivo: "Selecione uma planilha.",
  formato: "Envie um arquivo .xlsx.",
  tamanho: "Envie uma planilha de ate 8 MB.",
  processamento: "Nao foi possivel ler a planilha. Confira se o arquivo nao esta corrompido."
};

export function UploadForm({ error }: { error?: string }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hasSubmitted = useRef(false);
  const message = getErrorMessage(error);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (hasSubmitted.current) {
      event.preventDefault();
      return;
    }

    hasSubmitted.current = true;
    setIsSubmitting(true);
  }

  return (
    <form className="form" action="/api/upload" method="POST" encType="multipart/form-data" onSubmit={handleSubmit}>
      {message ? <div className="error">{message}</div> : null}
      <div className="field">
        <label htmlFor="file">Planilha .xlsx</label>
        <input id="file" name="file" type="file" accept=".xlsx" required disabled={isSubmitting} />
        <span className="muted">Formato aceito: .xlsx ate 8 MB.</span>
      </div>
      <div>
        <button className="button" type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
          {isSubmitting ? (
            <>
              <span className="spinner" aria-hidden="true" />
              Importando, aguarde...
            </>
          ) : (
            "Importar planilha"
          )}
        </button>
      </div>
    </form>
  );
}

function getErrorMessage(error?: string): string | null {
  if (!error) return null;
  return ERROR_MESSAGES[error as UploadError] ?? null;
}
