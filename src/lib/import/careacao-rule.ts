export type ImportedCareacaoSignals = {
  hasCareacao?: boolean | null;
  isResolved?: boolean | null;
  discountValue?: string | null;
};

export function shouldCreateCareacaoCaseFromImport(_signals: ImportedCareacaoSignals): boolean {
  return false;
}

export const IMPORT_CAREACAO_RULE =
  "Careacoes nao sao abertas automaticamente pela planilha; o usuario pesquisa o pedido e cria o caso manualmente.";
