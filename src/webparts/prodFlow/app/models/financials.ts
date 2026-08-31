export interface IFinancials {
  custoTotal: number; // = orcamentoUsinando + partesEPecas + servicos
  orcamentoOceaneering: number; // valor cobrado da Petrobras
  receita: number; // = orcamentoOceaneering - custoTotal (margem)
  multaExposicao30: number; // indicador = 0.30 * orcamentoOceaneering (se em atraso)
}
