import React, { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { BurgerMenu } from '@/components/BurgerMenu';
import { AppBackground } from '@/components/ui';
import { useTheme } from '@/context/ThemeContext';
import { radii } from '@/theme';
import { AngleMode, evaluateExpression, formatResult } from './calculatorMath';

type KeyTone = 'number' | 'utility' | 'operator' | 'equals' | 'scientific';
type KeyAction =
  | 'clear' | 'parentheses' | 'percent' | 'backspace' | 'equals'
  | 'angle' | 'inverse' | 'constant' | 'function' | 'factorial'
  | 'number' | 'operator';

interface CalculatorKey {
  label: string;
  action: KeyAction;
  value?: string;
  tone: KeyTone;
  icon?: 'backspace-outline';
}

interface HistoryEntry {
  expression: string;
  result: string;
}

const BASIC_ROWS: CalculatorKey[][] = [
  [
    { label: 'AC', action: 'clear', tone: 'utility' },
    { label: '( )', action: 'parentheses', tone: 'utility' },
    { label: '%', action: 'percent', tone: 'utility' },
    { label: '÷', action: 'operator', value: '/', tone: 'operator' },
  ],
  [
    { label: '7', action: 'number', tone: 'number' },
    { label: '8', action: 'number', tone: 'number' },
    { label: '9', action: 'number', tone: 'number' },
    { label: '×', action: 'operator', value: '*', tone: 'operator' },
  ],
  [
    { label: '4', action: 'number', tone: 'number' },
    { label: '5', action: 'number', tone: 'number' },
    { label: '6', action: 'number', tone: 'number' },
    { label: '−', action: 'operator', value: '-', tone: 'operator' },
  ],
  [
    { label: '1', action: 'number', tone: 'number' },
    { label: '2', action: 'number', tone: 'number' },
    { label: '3', action: 'number', tone: 'number' },
    { label: '+', action: 'operator', value: '+', tone: 'operator' },
  ],
  [
    { label: '0', action: 'number', tone: 'number' },
    { label: '.', action: 'number', tone: 'number' },
    { label: 'erase', action: 'backspace', tone: 'number', icon: 'backspace-outline' },
    { label: '=', action: 'equals', tone: 'equals' },
  ],
];

function displayExpression(expression: string): string {
  return expression
    .replace(/\*/g, '×')
    .replace(/\//g, '÷')
    .replace(/pi/g, 'π')
    .replace(/sqrt/g, '√')
    .replace(/asin/g, 'sin⁻¹')
    .replace(/acos/g, 'cos⁻¹')
    .replace(/atan/g, 'tan⁻¹');
}

function endsWithValue(expression: string): boolean {
  return /[0-9)e!%]$/.test(expression) || expression.endsWith('pi');
}

export default function CalculatorScreen({ navigation }: any) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [expression, setExpression] = useState('');
  const [result, setResult] = useState('0');
  const [angleMode, setAngleMode] = useState<AngleMode>('deg');
  const [inverse, setInverse] = useState(false);
  const [scientificVisible, setScientificVisible] = useState(false);
  const [justEvaluated, setJustEvaluated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyVisible, setHistoryVisible] = useState(false);

  const bottomClearance = Math.max(insets.bottom, 8) + 84;
  const rowCount = scientificVisible ? 8 : 5;
  const keyHeight = Math.max(44, Math.min(68, Math.floor((height - insets.top - bottomClearance - 220) / rowCount)));
  const keypadHeight = rowCount * keyHeight + (rowCount - 1) * 6;

  const scientificRows = useMemo<CalculatorKey[][]>(() => [
    [
      { label: '√', action: 'function', value: 'sqrt', tone: 'scientific' },
      { label: 'π', action: 'constant', value: 'pi', tone: 'scientific' },
      { label: '^', action: 'operator', value: '^', tone: 'scientific' },
      { label: '!', action: 'factorial', tone: 'scientific' },
    ],
    [
      { label: angleMode === 'deg' ? 'Deg' : 'Rad', action: 'angle', tone: 'scientific' },
      { label: inverse ? 'sin⁻¹' : 'sin', action: 'function', value: inverse ? 'asin' : 'sin', tone: 'scientific' },
      { label: inverse ? 'cos⁻¹' : 'cos', action: 'function', value: inverse ? 'acos' : 'cos', tone: 'scientific' },
      { label: inverse ? 'tan⁻¹' : 'tan', action: 'function', value: inverse ? 'atan' : 'tan', tone: 'scientific' },
    ],
    [
      { label: 'Inv', action: 'inverse', tone: 'scientific' },
      { label: 'e', action: 'constant', value: 'e', tone: 'scientific' },
      { label: 'ln', action: 'function', value: 'ln', tone: 'scientific' },
      { label: 'log', action: 'function', value: 'log', tone: 'scientific' },
    ],
  ], [angleMode, inverse]);

  const updatePreview = (next: string) => {
    setExpression(next);
    setError(null);
    try {
      setResult(formatResult(evaluateExpression(next, angleMode)));
    } catch {
      // Incomplete expressions keep the most recent valid result visible.
    }
  };

  const prepareInput = (): string => {
    if (!justEvaluated) return expression;
    setJustEvaluated(false);
    return '';
  };

  const appendNumber = (value: string) => {
    let current = prepareInput();
    if (value === '.') {
      const activeNumber = current.match(/[0-9.]+$/)?.[0] ?? '';
      if (activeNumber.includes('.')) return;
      if (!activeNumber) current += '0';
    }
    if (endsWithValue(current) && (current.endsWith(')') || current.endsWith('pi') || current.endsWith('e'))) current += '*';
    updatePreview(current + value);
  };

  const appendOperator = (operator: string) => {
    const current = justEvaluated ? result : expression;
    setJustEvaluated(false);
    if (!current && operator !== '-') return;
    const next = /[+\-*/^]$/.test(current) ? current.slice(0, -1) + operator : current + operator;
    updatePreview(next);
  };

  const appendFunction = (name: string) => {
    let current = prepareInput();
    if (endsWithValue(current)) current += '*';
    updatePreview(`${current}${name}(`);
  };

  const appendConstant = (constant: string) => {
    let current = prepareInput();
    if (endsWithValue(current)) current += '*';
    updatePreview(current + constant);
  };

  const toggleParentheses = () => {
    let current = prepareInput();
    const opens = (current.match(/\(/g) ?? []).length;
    const closes = (current.match(/\)/g) ?? []).length;
    if (opens > closes && endsWithValue(current)) updatePreview(current + ')');
    else updatePreview(current + (endsWithValue(current) ? '*(' : '('));
  };

  const applyPostfix = (symbol: '!' | '%') => {
    const current = justEvaluated ? result : expression;
    setJustEvaluated(false);
    if (!endsWithValue(current)) return;
    updatePreview(current + symbol);
  };

  const clear = () => {
    setExpression('');
    setResult('0');
    setError(null);
    setJustEvaluated(false);
  };

  const backspace = () => {
    if (justEvaluated) {
      clear();
      return;
    }
    if (!expression) return;
    updatePreview(expression.slice(0, -1));
    if (expression.length === 1) setResult('0');
  };

  const equals = () => {
    if (!expression) return;
    try {
      const formatted = formatResult(evaluateExpression(expression, angleMode));
      setResult(formatted);
      setHistory(previous => [{ expression: displayExpression(expression), result: formatted }, ...previous].slice(0, 30));
      setError(null);
      setJustEvaluated(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Invalid calculation');
      setResult('Error');
    }
  };

  const pressKey = (key: CalculatorKey) => {
    if (key.action === 'number') appendNumber(key.label);
    else if (key.action === 'operator') appendOperator(key.value!);
    else if (key.action === 'function') appendFunction(key.value!);
    else if (key.action === 'constant') appendConstant(key.value!);
    else if (key.action === 'parentheses') toggleParentheses();
    else if (key.action === 'percent') applyPostfix('%');
    else if (key.action === 'factorial') applyPostfix('!');
    else if (key.action === 'backspace') backspace();
    else if (key.action === 'clear') clear();
    else if (key.action === 'equals') equals();
    else if (key.action === 'angle') {
      const nextMode: AngleMode = angleMode === 'deg' ? 'rad' : 'deg';
      setAngleMode(nextMode);
      if (expression) {
        try {
          setResult(formatResult(evaluateExpression(expression, nextMode)));
        } catch {
          // Keep the last valid result for an incomplete expression.
        }
      }
      setError(null);
    } else if (key.action === 'inverse') setInverse(previous => !previous);
  };

  const rows = scientificVisible ? [...scientificRows, ...BASIC_ROWS] : BASIC_ROWS;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppBackground />
      <View style={styles.header}>
        <BurgerMenu navigation={navigation} />
        <Text style={[styles.title, { color: theme.text }]}>Calculator</Text>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Open calculation history"
          style={styles.headerButton}
          onPress={() => setHistoryVisible(true)}
        >
          <Ionicons name="time-outline" size={25} color={theme.text} />
        </TouchableOpacity>
      </View>

      <View style={[styles.content, { paddingBottom: bottomClearance }]}>
        <View style={[styles.displayArea, scientificVisible && styles.displayAreaExpanded]}>
          <Text style={[styles.expression, { color: error ? theme.semantic.danger : theme.textDim }]} numberOfLines={2}>
            {error ?? (expression ? displayExpression(expression) : '0')}
          </Text>
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.38}
            numberOfLines={1}
            style={[styles.result, { color: result === 'Error' ? theme.semantic.danger : theme.text }]}
          >
            {result}
          </Text>
        </View>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={scientificVisible ? 'Hide scientific functions' : 'Show scientific functions'}
          style={styles.expandButton}
          onPress={() => setScientificVisible(previous => !previous)}
        >
          <Ionicons name={scientificVisible ? 'chevron-down' : 'chevron-up'} size={25} color={theme.textSub} />
        </TouchableOpacity>

        <ScrollView
          style={[styles.keypadViewport, { maxHeight: keypadHeight }]}
          contentContainerStyle={styles.keypad}
          scrollEnabled={scientificVisible}
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
        >
          {rows.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.row}>
              {row.map(key => {
                const active = (key.action === 'inverse' && inverse)
                  || (key.action === 'angle' && angleMode === 'rad');
                const backgroundColor = key.tone === 'equals'
                  ? theme.accent.base
                  : key.tone === 'operator'
                    ? theme.accent.soft
                    : key.tone === 'utility' || key.tone === 'scientific'
                      ? active ? theme.accent.soft : theme.glass.primary
                      : theme.glass.solid;
                const color = key.tone === 'equals'
                  ? '#FFF'
                  : key.tone === 'operator' || active
                    ? theme.accent.base
                    : theme.text;
                return (
                  <TouchableOpacity
                    key={`${key.label}-${key.action}`}
                    accessibilityRole="button"
                    accessibilityLabel={key.action === 'backspace' ? 'Delete last digit' : key.label}
                    activeOpacity={0.72}
                    style={[
                      styles.key,
                      {
                        height: keyHeight,
                        borderRadius: Math.min(24, keyHeight / 2.15),
                        backgroundColor,
                        borderColor: theme.glass.border,
                      },
                    ]}
                    onPress={() => pressKey(key)}
                  >
                    {key.icon ? (
                      <Ionicons name={key.icon} size={Math.min(29, keyHeight * 0.44)} color={color} />
                    ) : (
                      <Text
                        adjustsFontSizeToFit
                        numberOfLines={1}
                        style={[styles.keyLabel, { color, fontSize: Math.min(24, keyHeight * 0.39) }]}
                      >
                        {key.label}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </ScrollView>
      </View>

      <Modal visible={historyVisible} transparent animationType="fade" onRequestClose={() => setHistoryVisible(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setHistoryVisible(false)} />
          <View style={[styles.historySheet, { backgroundColor: theme.glass.solid, borderColor: theme.glass.border, paddingBottom: Math.max(insets.bottom, 20) }]}>
            <View style={styles.historyHeader}>
              <View>
                <Text style={[styles.historyTitle, { color: theme.text }]}>History</Text>
                <Text style={[styles.historySubtitle, { color: theme.textDim }]}>Recent calculations</Text>
              </View>
              {history.length > 0 ? (
                <TouchableOpacity style={styles.clearHistoryButton} onPress={() => setHistory([])}>
                  <Text style={[styles.clearHistoryText, { color: theme.semantic.danger }]}>Clear</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            <ScrollView style={styles.historyList} showsVerticalScrollIndicator={false}>
              {history.length === 0 ? (
                <View style={styles.emptyHistory}>
                  <Ionicons name="time-outline" size={34} color={theme.textDim} />
                  <Text style={[styles.emptyHistoryText, { color: theme.textDim }]}>No calculations yet</Text>
                </View>
              ) : history.map((entry, index) => (
                <TouchableOpacity
                  key={`${entry.expression}-${index}`}
                  style={[styles.historyRow, { borderBottomColor: theme.divider }]}
                  onPress={() => {
                    setExpression(entry.result);
                    setResult(entry.result);
                    setJustEvaluated(true);
                    setError(null);
                    setHistoryVisible(false);
                  }}
                >
                  <Text style={[styles.historyExpression, { color: theme.textDim }]}>{entry.expression}</Text>
                  <Text style={[styles.historyResult, { color: theme.text }]}>= {entry.result}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={[styles.doneButton, { backgroundColor: theme.accent.base }]} onPress={() => setHistoryVisible(false)}>
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  header: { minHeight: 66, paddingHorizontal: 20, paddingVertical: 11, flexDirection: 'row', alignItems: 'center' },
  title: { flex: 1, marginLeft: 14, fontSize: 26, fontWeight: '700', letterSpacing: -0.4 },
  headerButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1, paddingHorizontal: 10 },
  displayArea: { flex: 1, minHeight: 92, paddingHorizontal: 12, justifyContent: 'flex-end', alignItems: 'flex-end' },
  displayAreaExpanded: { flex: 0.42, minHeight: 76 },
  expression: { maxWidth: '100%', fontSize: 16, lineHeight: 22, textAlign: 'right', marginBottom: 5 },
  result: { width: '100%', fontSize: 54, lineHeight: 62, fontWeight: '500', textAlign: 'right' },
  expandButton: { width: 48, height: 36, alignItems: 'center', justifyContent: 'center', marginLeft: 4 },
  keypadViewport: { flexShrink: 1 },
  keypad: { gap: 6 },
  row: { flexDirection: 'row', gap: 6 },
  key: { flex: 1, minWidth: 0, minHeight: 44, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  keyLabel: { fontWeight: '600' },
  modalRoot: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.38)' },
  historySheet: { maxHeight: '68%', minHeight: 330, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, borderWidth: 1, paddingHorizontal: 20, paddingTop: 20 },
  historyHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  historyTitle: { fontSize: 22, fontWeight: '700' },
  historySubtitle: { fontSize: 13, marginTop: 2 },
  clearHistoryButton: { minWidth: 52, minHeight: 44, alignItems: 'flex-end', justifyContent: 'center' },
  clearHistoryText: { fontSize: 14, fontWeight: '700' },
  historyList: { flex: 1 },
  emptyHistory: { alignItems: 'center', justifyContent: 'center', paddingVertical: 52, gap: 10 },
  emptyHistoryText: { fontSize: 14, fontWeight: '600' },
  historyRow: { minHeight: 68, justifyContent: 'center', borderBottomWidth: 1 },
  historyExpression: { fontSize: 13, marginBottom: 4 },
  historyResult: { fontSize: 20, fontWeight: '700', textAlign: 'right' },
  doneButton: { height: 50, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', marginTop: 14 },
  doneButtonText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});
