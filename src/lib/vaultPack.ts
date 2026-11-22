import { buildFocusProgram, FocusProgram } from './focusProgram';
import { buildPremiumModules, PremiumModule } from './premiumContent';
import { QuizAnswers } from './quizData';

export type VaultPack = {
  program: FocusProgram;
  modules: PremiumModule[];
};

/** Paid vault copy. Imported by the worker, not by the quiz UI. */
export function buildVaultPack(answers: QuizAnswers): VaultPack {
  return {
    program: buildFocusProgram(answers),
    modules: buildPremiumModules(answers),
  };
}
