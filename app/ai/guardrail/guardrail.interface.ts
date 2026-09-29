export interface GuardrailRuleSet {
  blockedKeywords?: string[];
  blockedPatterns?: Array<string | RegExp>;
}

export interface GuardrailCheckResult {
  safe: boolean;
  reason?: string;
}
