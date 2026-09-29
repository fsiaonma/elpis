export interface AssertSpec {
  stepsContain?: string[];
  outputNotEmpty?: boolean;
  guardrailBlocked?: boolean;
  outputContainsAny?: string[];
}

export interface AssertionRunInput {
  output: string;
  steps: Array<Record<string, unknown>>;
}

export interface AssertionRunResult {
  pass: boolean;
  reason?: string;
}

export function stepsContain(
  steps: Array<Record<string, unknown>>,
  names: string[],
): boolean {
  if (names.length === 0) {
    return false;
  }

  return steps.some((step) =>
    names.some((name) => {
      if (step.name === name || step.tool === name || step.skill === name) {
        return true;
      }

      return JSON.stringify(step).includes(name);
    }),
  );
}

export function outputNotEmpty(output: string): boolean {
  return typeof output === 'string' && output.trim().length > 0;
}

export function guardrailBlocked(steps: Array<Record<string, unknown>>): boolean {
  return steps.some((step) => step.type === 'guardrail');
}

export function outputContainsAny(output: string, needles: string[]): boolean {
  if (needles.length === 0) {
    return false;
  }

  const normalized = typeof output === 'string' ? output : String(output ?? '');
  return needles.some((needle) => normalized.includes(needle));
}

export function runAssertions(
  result: AssertionRunInput,
  assertSpec: AssertSpec,
): AssertionRunResult {
  if (assertSpec.stepsContain !== undefined) {
    if (!stepsContain(result.steps, assertSpec.stepsContain)) {
      return {
        pass: false,
        reason: `steps missing expected names: ${assertSpec.stepsContain.join(', ')}`,
      };
    }
  }

  if (assertSpec.outputNotEmpty === true && !outputNotEmpty(result.output)) {
    return { pass: false, reason: 'output is empty' };
  }

  if (assertSpec.guardrailBlocked === true && !guardrailBlocked(result.steps)) {
    return { pass: false, reason: 'expected guardrail step' };
  }

  if (assertSpec.guardrailBlocked === false && guardrailBlocked(result.steps)) {
    return { pass: false, reason: 'unexpected guardrail step' };
  }

  if (assertSpec.outputContainsAny !== undefined) {
    if (!outputContainsAny(result.output, assertSpec.outputContainsAny)) {
      return {
        pass: false,
        reason: `output missing expected text: ${assertSpec.outputContainsAny.join(', ')}`,
      };
    }
  }

  return { pass: true };
}
