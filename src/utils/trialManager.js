// Compatibilidade: as telas antigas usam TrialManager; a regra agora fica em
// services/planoService (teste de 7 dias ou 5 laudos, Premium por usuário).
import { statusTeste, ehPremium, sincronizarPlano } from "../services/planoService";

export class TrialManager {
  static verificarTrial(userEmail) {
    return statusTeste(userEmail);
  }

  static obterStatusTrial(userEmail) {
    return statusTeste(userEmail);
  }

  static async verificarPlanoUsuario(userEmail) {
    return ehPremium(userEmail) ? "premium" : "trial";
  }

  // Confere o plano na conta (Supabase). Antes chamava uma função da Netlify
  // que não existe no site atual.
  static async verificarPremiumNoServidor(userEmail) {
    const r = await sincronizarPlano(userEmail);
    return r.premium ? "premium" : "trial";
  }
}
