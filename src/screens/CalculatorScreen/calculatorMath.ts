export type AngleMode = 'deg' | 'rad';

type Token =
  | { type: 'number'; value: number }
  | { type: 'operator'; value: string }
  | { type: 'function'; value: string }
  | { type: 'leftParen' }
  | { type: 'rightParen' };

const FUNCTIONS = new Set(['sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'ln', 'log', 'sqrt']);
const PRECEDENCE: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2, '^': 3, 'u-': 4, '!': 5, '%': 5 };
const RIGHT_ASSOCIATIVE = new Set(['^', 'u-']);

function factorial(value: number): number {
  if (!Number.isInteger(value) || value < 0 || value > 170) {
    throw new Error('Factorial requires an integer from 0 to 170');
  }
  let result = 1;
  for (let current = 2; current <= value; current += 1) result *= current;
  return result;
}

function tokenize(expression: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;
  let previousCanEndValue = false;

  while (index < expression.length) {
    const char = expression[index];
    if (/\s/.test(char)) {
      index += 1;
      continue;
    }

    if (/[0-9.]/.test(char)) {
      let raw = '';
      let decimalCount = 0;
      while (index < expression.length && /[0-9.]/.test(expression[index])) {
        if (expression[index] === '.') decimalCount += 1;
        raw += expression[index];
        index += 1;
      }
      if (decimalCount > 1 || raw === '.') throw new Error('Invalid number');
      tokens.push({ type: 'number', value: Number(raw) });
      previousCanEndValue = true;
      continue;
    }

    if (/[a-z]/i.test(char)) {
      let name = '';
      while (index < expression.length && /[a-z]/i.test(expression[index])) {
        name += expression[index];
        index += 1;
      }
      if (name === 'pi') tokens.push({ type: 'number', value: Math.PI });
      else if (name === 'e') tokens.push({ type: 'number', value: Math.E });
      else if (FUNCTIONS.has(name)) tokens.push({ type: 'function', value: name });
      else throw new Error('Unknown function');
      previousCanEndValue = name === 'pi' || name === 'e';
      continue;
    }

    if (char === '(') {
      tokens.push({ type: 'leftParen' });
      previousCanEndValue = false;
      index += 1;
      continue;
    }
    if (char === ')') {
      tokens.push({ type: 'rightParen' });
      previousCanEndValue = true;
      index += 1;
      continue;
    }
    if ('+-*/^!%'.includes(char)) {
      const value = char === '-' && !previousCanEndValue ? 'u-' : char;
      tokens.push({ type: 'operator', value });
      previousCanEndValue = char === '!' || char === '%';
      index += 1;
      continue;
    }
    throw new Error('Invalid character');
  }
  return tokens;
}

function toRpn(tokens: Token[]): Token[] {
  const output: Token[] = [];
  const stack: Token[] = [];

  tokens.forEach(token => {
    if (token.type === 'number') output.push(token);
    else if (token.type === 'function' || token.type === 'leftParen') stack.push(token);
    else if (token.type === 'rightParen') {
      while (stack.length && stack[stack.length - 1].type !== 'leftParen') output.push(stack.pop()!);
      if (!stack.length) throw new Error('Mismatched parentheses');
      stack.pop();
      if (stack[stack.length - 1]?.type === 'function') output.push(stack.pop()!);
    } else {
      while (stack.length) {
        const top = stack[stack.length - 1];
        if (top.type === 'function') {
          output.push(stack.pop()!);
          continue;
        }
        if (top.type !== 'operator') break;
        const shouldPop = RIGHT_ASSOCIATIVE.has(token.value)
          ? PRECEDENCE[token.value] < PRECEDENCE[top.value]
          : PRECEDENCE[token.value] <= PRECEDENCE[top.value];
        if (!shouldPop) break;
        output.push(stack.pop()!);
      }
      stack.push(token);
    }
  });

  while (stack.length) {
    const token = stack.pop()!;
    if (token.type === 'leftParen' || token.type === 'rightParen') throw new Error('Mismatched parentheses');
    output.push(token);
  }
  return output;
}

function applyFunction(name: string, value: number, angleMode: AngleMode): number {
  const radians = angleMode === 'deg' ? value * Math.PI / 180 : value;
  if (name === 'sin') return Math.sin(radians);
  if (name === 'cos') return Math.cos(radians);
  if (name === 'tan') return Math.tan(radians);
  if (name === 'asin') {
    const result = Math.asin(value);
    return angleMode === 'deg' ? result * 180 / Math.PI : result;
  }
  if (name === 'acos') {
    const result = Math.acos(value);
    return angleMode === 'deg' ? result * 180 / Math.PI : result;
  }
  if (name === 'atan') {
    const result = Math.atan(value);
    return angleMode === 'deg' ? result * 180 / Math.PI : result;
  }
  if (name === 'ln') return Math.log(value);
  if (name === 'log') return Math.log10(value);
  return Math.sqrt(value);
}

export function evaluateExpression(expression: string, angleMode: AngleMode): number {
  if (!expression.trim()) return 0;
  const stack: number[] = [];
  toRpn(tokenize(expression)).forEach(token => {
    if (token.type === 'number') {
      stack.push(token.value);
      return;
    }
    if (token.type === 'function') {
      if (stack.length < 1) throw new Error('Missing value');
      stack.push(applyFunction(token.value, stack.pop()!, angleMode));
      return;
    }
    if (token.type !== 'operator') return;
    if (token.value === 'u-' || token.value === '!' || token.value === '%') {
      if (stack.length < 1) throw new Error('Missing value');
      const value = stack.pop()!;
      stack.push(token.value === 'u-' ? -value : token.value === '!' ? factorial(value) : value / 100);
      return;
    }
    if (stack.length < 2) throw new Error('Missing value');
    const right = stack.pop()!;
    const left = stack.pop()!;
    if (token.value === '+') stack.push(left + right);
    else if (token.value === '-') stack.push(left - right);
    else if (token.value === '*') stack.push(left * right);
    else if (token.value === '/') {
      if (right === 0) throw new Error('Cannot divide by zero');
      stack.push(left / right);
    } else stack.push(left ** right);
  });
  if (stack.length !== 1 || !Number.isFinite(stack[0])) throw new Error('Invalid calculation');
  return stack[0];
}

export function formatResult(value: number): string {
  if (!Number.isFinite(value)) return 'Error';
  const rounded = Number.parseFloat(value.toPrecision(12));
  const text = String(rounded);
  return text.length > 14 ? rounded.toExponential(8) : text;
}
