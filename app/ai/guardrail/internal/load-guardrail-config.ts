import { ConfigService } from '../../../config/config.service';
import { GuardrailRuleSet } from '../guardrail.interface';

function getGuardrailConfig(configService: ConfigService): GuardrailRuleSet {
  const ai = configService.get('ai') as { guardrail?: GuardrailRuleSet } | undefined;
  return ai?.guardrail ?? {};
}

export function loadGuardrailRules(configService: ConfigService): GuardrailRuleSet {
  return getGuardrailConfig(configService);
}
