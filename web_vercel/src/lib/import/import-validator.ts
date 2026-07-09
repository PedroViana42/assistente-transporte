export const MAX_UPLOAD_SIZE_BYTES = 8 * 1024 * 1024;

export type UploadValidationResult =
  | { ok: true }
  | { ok: false; code: "arquivo" | "tamanho" | "formato"; message: string };

export function validateImportFile(fileName: string, fileSize: number): UploadValidationResult {
  if (!fileName || fileSize <= 0) {
    return {
      ok: false,
      code: "arquivo",
      message: "Selecione uma planilha .xlsx para importar."
    };
  }

  if (fileSize > MAX_UPLOAD_SIZE_BYTES) {
    return {
      ok: false,
      code: "tamanho",
      message: "O arquivo ultrapassa o limite atual de 8 MB."
    };
  }

  if (!fileName.toLowerCase().endsWith(".xlsx")) {
    return {
      ok: false,
      code: "formato",
      message: "O arquivo deve estar no formato .xlsx."
    };
  }

  return { ok: true };
}
