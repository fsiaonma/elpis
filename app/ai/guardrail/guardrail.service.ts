import { Injectable } from '@nestjs/common';
import { ConfigService } from '../../config/config.service';
import { GuardrailCheckResult, GuardrailRuleSet } from './guardrail.interface';
import { loadGuardrailRules } from './internal/load-guardrail-config';

@Injectable()
export class GuardrailService {
  private readonly rules: GuardrailRuleSet;

  constructor(private readonly configService: ConfigService) {
    this.rules = loadGuardrailRules(configService);
  }

  check(input: string): GuardrailCheckResult {
    const normalized = input.trim();

    if (normalized === '') {
      return { safe: true };
    }

    const lowered = normalized.toLowerCase();

    for (const keyword of this.rules.blockedKeywords ?? []) {
      const candidate = keyword.trim();
      if (candidate === '') {
        continue;
      }

      if (lowered.includes(candidate.toLowerCase())) {
        return {
          safe: false,
          reason: `Blocked keyword: ${candidate}`,
        };
      }
    }

    for (const pattern of this.rules.blockedPatterns ?? []) {
      const regex = this.toRegExp(pattern);
      if (!regex) {
        continue;
      }

      if (regex.test(normalized)) {
        return {
          safe: false,
          reason: `Blocked pattern: ${regex.toString()}`,
        };
      }
    }

    return { safe: true };
  }

  private toRegExp(pattern: string | RegExp): RegExp | null {
    if (pattern instanceof RegExp) {
      return pattern;
    }

    if (typeof pattern !== 'string') {
      return null;
    }

    const candidate = pattern.trim();
    if (candidate === '') {
      return null;
    }

    try {
      return new RegExp(candidate, 'i');
    } catch {
      return null;
    }
  }
}
