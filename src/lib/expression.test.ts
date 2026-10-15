import { describe, expect, it } from 'vitest';
import { evaluateExpression, hasOperator } from './expression';

describe('evaluateExpression', () => {
  it('handles calculator-style percentages', () => {
    expect(evaluateExpression('3260-5%')).toBeCloseTo(3097, 10);
    expect(evaluateExpression('3000+10%')).toBeCloseTo(3300, 10);
    expect(evaluateExpression('200*15%')).toBeCloseTo(30, 10);
    expect(evaluateExpression('50%')).toBeCloseTo(0.5, 10);
  });

  it('follows operator precedence and parentheses', () => {
    expect(evaluateExpression('1000*4.5+220')).toBe(4720);
    expect(evaluateExpression('(100+50)/3')).toBe(50);
    expect(evaluateExpression('2 x 3 ÷ 4')).toBe(1.5);
    expect(evaluateExpression('-5+10')).toBe(5);
  });

  it('accepts a comma as decimal separator', () => {
    expect(evaluateExpression('1,5*2')).toBe(3);
  });

  it('rejects incomplete or invalid input', () => {
    expect(evaluateExpression('')).toBeNull();
    expect(evaluateExpression('3260-')).toBeNull();
    expect(evaluateExpression('(1+2')).toBeNull();
    expect(evaluateExpression('1/0')).toBeNull();
    expect(evaluateExpression('abc')).toBeNull();
  });

  it('detects whether input is an expression', () => {
    expect(hasOperator('3260-5%')).toBe(true);
    expect(hasOperator('3260')).toBe(false);
    expect(hasOperator('32,60')).toBe(false);
  });
});
