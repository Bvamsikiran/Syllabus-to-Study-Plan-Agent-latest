import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { INITIAL_MODULES, INITIAL_RESOURCES } from '../src/data/mockData.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('--- Starting Fabricated Data Prevention & Integrity Regression Tests ---');

let passedTests = 0;
let totalTests = 0;

function runTest(name: string, fn: () => void) {
  totalTests++;
  try {
    fn();
    console.log(`✓ PASS: ${name}`);
    passedTests++;
  } catch (err: any) {
    console.error(`✗ FAIL: ${name}`);
    console.error(`  Error: ${err.message}`);
  }
}

// 1. Mock Data Emptiness Contract
runTest('src/data/mockData.ts: INITIAL_MODULES must be completely empty', () => {
  assert.equal(INITIAL_MODULES.length, 0, 'INITIAL_MODULES should have 0 items');
});

runTest('src/data/mockData.ts: INITIAL_RESOURCES must be completely empty', () => {
  assert.equal(INITIAL_RESOURCES.length, 0, 'INITIAL_RESOURCES should have 0 items');
});

// 2. Local Gemma Engine Integrity
runTest('localGemmaEngine.ts: No hardcoded question sets or fake unit arrays', () => {
  const content = fs.readFileSync(path.resolve(__dirname, '../localGemmaEngine.ts'), 'utf8');
  assert.ok(!content.includes('gateQuestions'), 'Should not contain gateQuestions');
  assert.ok(!content.includes('Linear Algebra & Probability'), 'Should not contain hardcoded GATE syllabus');
  assert.ok(!content.includes('Superb technical breakdown'), 'Should not contain canned answer evaluations');
});

// 3. Server Endpoints Integrity
runTest('server.ts: No canned tutoring responses or hardcoded fallback units', () => {
  const content = fs.readFileSync(path.resolve(__dirname, '../server.ts'), 'utf8');
  assert.ok(!content.includes('### Core Concept Breakdown'), 'Should not contain canned tutor response');
  assert.ok(!content.includes('Algorithms & Asymptotic Invariants'), 'Should not contain hardcoded GATE units');
  assert.ok(content.includes('INVALID_SYLLABUS_CONTENT'), 'Must enforce strict syllabus validation');
  assert.ok(content.includes('NO_SYLLABUS_UNITS'), 'Must reject schedule generation without syllabus');
  assert.ok(content.includes('x-gemini-api-key'), 'Must extract client-provided Gemini API key header');
});

// 4. VoiceRecallQuiz Integrity
runTest('VoiceRecallQuiz.tsx: No hardcoded questions, transcripts, or sample answers', () => {
  const content = fs.readFileSync(path.resolve(__dirname, '../src/components/VoiceRecallQuiz.tsx'), 'utf8');
  assert.ok(!content.includes('DEFAULT_QUESTION'), 'Should not contain DEFAULT_QUESTION');
  assert.ok(!content.includes('Raft Leader Election'), 'Should not contain hardcoded Raft question');
  assert.ok(!content.includes('In the Raft consensus protocol'), 'Should not contain prefilled Raft transcript');
  assert.ok(!content.includes('loadSampleAnswer'), 'Should not contain fake loadSampleAnswer function');
  assert.ok(content.includes('No Course Syllabus Uploaded'), 'Must render empty state when syllabus is missing');
});

// 5. VoiceCoachPanel Integrity
runTest('VoiceCoachPanel.tsx: No seed turns, mock durations, or fake PDF citations', () => {
  const content = fs.readFileSync(path.resolve(__dirname, '../src/components/VoiceCoachPanel.tsx'), 'utf8');
  assert.ok(!content.includes('seed-turn-1'), 'Should not contain seed-turn-1');
  assert.ok(!content.includes('seed-turn-2'), 'Should not contain seed-turn-2');
  assert.ok(!content.includes('DSA_Notes.pdf'), 'Should not contain fabricated DSA_Notes.pdf');
  assert.ok(!content.includes('Algorithms_Chapter3.pdf'), 'Should not contain fabricated Algorithms_Chapter3.pdf');
  assert.ok(!content.includes('elapsedSeconds, setElapsedSeconds] = useState<number>(16)'), 'Must not start with fake 16s duration');
});

// 6. Step4Resources Integrity
runTest('Step4Resources.tsx: No EXTENSIVE_SUGGESTIONS catalog masquerading as user data', () => {
  const content = fs.readFileSync(path.resolve(__dirname, '../src/components/Step4Resources.tsx'), 'utf8');
  assert.ok(!content.includes('EXTENSIVE_SUGGESTIONS'), 'Must not contain EXTENSIVE_SUGGESTIONS');
  assert.ok(content.includes('/api/generate-resources'), 'Must request tailored recommendations from API');
});

// 7. ModernStudyDashboard Integrity
runTest('ModernStudyDashboard.tsx: Dynamic metrics and empty states instead of fake data', () => {
  const content = fs.readFileSync(path.resolve(__dirname, '../src/components/ModernStudyDashboard.tsx'), 'utf8');
  assert.ok(!content.includes('courseName = \'GATE CS + Data Science\''), 'Must not default to fake GATE course');
  assert.ok(!content.includes('68% Mastered'), 'Must not contain hardcoded 68% progress');
  assert.ok(content.includes('No upcoming study tasks'), 'Must provide honest empty state');
});

// 8. GenerativeAITutor Integrity
runTest('GenerativeAITutor.tsx: New chats start empty without fake welcome responses', () => {
  const content = fs.readFileSync(path.resolve(__dirname, '../src/components/GenerativeAITutor.tsx'), 'utf8');
  assert.ok(!content.includes('msg_welcome_'), 'Must not generate fake initial assistant message');
  assert.ok(content.includes('messages: []'), 'New conversations must start with empty messages array');
  assert.ok(content.includes('apiKeyService.getAiHeaders()'), 'Must pass client API key headers');
});

// 9. API Key Service Integrity
runTest('apiKeyService.ts: Provides clean key storage and request header injection', () => {
  const content = fs.readFileSync(path.resolve(__dirname, '../src/services/apiKeyService.ts'), 'utf8');
  assert.ok(content.includes('synapse_gemini_api_key'), 'Uses standard localStorage key');
  assert.ok(content.includes('x-gemini-api-key'), 'Injects x-gemini-api-key header');
});

console.log(`\n========================================`);
console.log(`Summary: ${passedTests}/${totalTests} tests passed.`);
console.log(`========================================`);

if (passedTests !== totalTests) {
  process.exit(1);
}
