// Mock API para el smoke B3 (KRU-50): sirve GET /sessions con datos
// sintéticos en el contract v1 (mismo shape que el backend). Solo para
// verificar el modo real del frontend en local (no corresponde a personas).
//
// Uso: node scripts/mock-sessions-api.mjs 8787
import { createServer } from 'node:http';

const PORT = Number(process.argv[2]) || 8787;

const recent = (daysAgo) => new Date(Date.now() - daysAgo * 86400000).toISOString();

// 2 grupos de rol: Operations Analyst (1 in_progress reciente → realStatus
// in_progress) + Maintenance Technician (2 ready antiguos → completed).
const candidates = [
  {
    id: 'b3s1',
    alias: 'alias-b3s1',
    role: 'Operations Analyst',
    roleEn: 'Operations Analyst',
    status: 'in_progress',
    completedAt: recent(1),
    completion: { completed: 5, total: 8 },
    constructs: [
      { id: 'decisionMaking', score: 82 },
      { id: 'problemSolving', score: 78 },
      { id: 'riskFeedbackProfile', score: 64 },
      { id: 'planning', score: 88 },
      { id: 'adaptability', score: null },
      { id: 'analyticalThinking', score: 71 },
      { id: 'leadership', score: null },
      { id: 'communication', score: 74 },
    ],
    games: [{ gameId: 'balloon', constructId: 'riskFeedbackProfile' }],
    caveats: ['low_sample_count'],
  },
  {
    id: 'b3s2',
    alias: 'alias-b3s2',
    role: 'Operations Analyst',
    roleEn: 'Operations Analyst',
    status: 'ready',
    completedAt: recent(2),
    completion: { completed: 8, total: 8 },
    constructs: [
      { id: 'decisionMaking', score: 75 },
      { id: 'problemSolving', score: 80 },
      { id: 'riskFeedbackProfile', score: 70 },
      { id: 'planning', score: 68 },
      { id: 'adaptability', score: 85 },
      { id: 'analyticalThinking', score: 72 },
      { id: 'leadership', score: 66 },
      { id: 'communication', score: 79 },
    ],
    games: [{ gameId: 'tangram', constructId: 'planning' }],
    caveats: [],
  },
  {
    id: 'b3s3',
    alias: 'alias-b3s3',
    role: 'Operations Analyst',
    roleEn: 'Operations Analyst',
    status: 'ready',
    completedAt: recent(5),
    completion: { completed: 8, total: 8 },
    constructs: [
      { id: 'decisionMaking', score: 60 },
      { id: 'problemSolving', score: 90 },
      { id: 'riskFeedbackProfile', score: null },
      { id: 'planning', score: 55 },
      { id: 'adaptability', score: 62 },
      { id: 'analyticalThinking', score: 95 },
      { id: 'leadership', score: 58 },
      { id: 'communication', score: null },
    ],
    games: [{ gameId: 'bomb', constructId: 'problemSolving' }],
    caveats: ['missing_game_correlation'],
  },
  {
    id: 'b3s4',
    alias: 'alias-b3s4',
    role: 'Maintenance Technician',
    roleEn: 'Maintenance Technician',
    status: 'ready',
    completedAt: recent(20),
    completion: { completed: 8, total: 8 },
    constructs: [
      { id: 'decisionMaking', score: 70 },
      { id: 'problemSolving', score: 72 },
      { id: 'riskFeedbackProfile', score: 68 },
      { id: 'planning', score: 74 },
      { id: 'adaptability', score: 71 },
      { id: 'analyticalThinking', score: 69 },
      { id: 'leadership', score: 65 },
      { id: 'communication', score: 73 },
    ],
    games: [{ gameId: 'passenger', constructId: 'planning' }],
    caveats: [],
  },
  {
    id: 'b3s5',
    alias: 'alias-b3s5',
    role: 'Maintenance Technician',
    roleEn: 'Maintenance Technician',
    status: 'ready',
    completedAt: recent(25),
    completion: { completed: 8, total: 8 },
    constructs: [
      { id: 'decisionMaking', score: 84 },
      { id: 'problemSolving', score: 81 },
      { id: 'riskFeedbackProfile', score: 77 },
      { id: 'planning', score: 86 },
      { id: 'adaptability', score: 79 },
      { id: 'analyticalThinking', score: 83 },
      { id: 'leadership', score: 80 },
      { id: 'communication', score: 82 },
    ],
    games: [{ gameId: 'tower', constructId: 'problemSolving' }],
    caveats: [],
  },
];

const server = createServer((req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  if (url.pathname === '/sessions' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ candidates, total: candidates.length, hasMore: false }));
    return;
  }
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ message: 'Not Found' }));
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(JSON.stringify({ mock: 'sessions-api', port: PORT, candidates: candidates.length }));
});
