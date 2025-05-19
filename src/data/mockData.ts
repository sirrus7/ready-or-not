import { Decision, Slide } from '../types';

export const mockDecisions: Decision[] = [
  { id: 'welcome', label: 'WELCOME', details: 'Start Here', slideNumber: 0 },
  { id: 'rd-1-invest', label: 'RD-1 INVEST', details: '15M', slideNumber: 62 },
  { id: 'ch-1', label: 'CH 1', details: '3M', slideNumber: 63 },
  { id: 'dd', label: 'DD', details: '5M', slideNumber: 64 },
  { id: 'rd-2-expand', label: 'RD-2 EXPAND', details: '10M', slideNumber: 65 },
  { id: 'ch-2', label: 'CH 2', details: '7M', slideNumber: 66 },
  { id: 'rd-3-innovate', label: 'RD-3 INNOVATE', details: '20M', slideNumber: 67 },
  { id: 'ch-3', label: 'CH 3', details: '12M', slideNumber: 68 },
  { id: 'market-test', label: 'MARKET TEST', details: '8M', slideNumber: 69 },
  { id: 'focus-group', label: 'FOCUS GROUP', details: '5M', slideNumber: 70 },
];

export const mockSlides: Slide[] = [
  {
    id: 0,
    title: 'WELCOME TO READY OR NOT 2.0',
    content: {
      main: 'HOW TO HOST GUIDE',
      details: [
        'Print the guide and follow instructions',
        'Review game host controls',
        'Set up your classroom space'
      ],
    },
    background: 'bg-gradient-to-br from-green-600 to-green-900',
  },
  {
    id: 62,
    title: 'INVESTMENT PAYOFF RD-1',
    content: {
      main: '#6 MAXIMIZE SALES',
      details: ['CAPACITY: NO CHANGE', 'ORDERS: +500', 'ASP: +$20'],
    },
    background: 'bg-gradient-to-br from-blue-600 to-blue-900',
  },
  {
    id: 63,
    title: 'CHANNEL 1 STRATEGY',
    content: {
      main: '#3 MARKET EXPANSION',
      details: ['NEW PARTNERS: +3', 'REACH: +15%', 'COST: $3M'],
    },
    background: 'bg-gradient-to-br from-emerald-600 to-emerald-900',
  },
  {
    id: 64,
    title: 'DIGITAL DISTRIBUTION',
    content: {
      main: '#8 PLATFORM DEVELOPMENT',
      details: ['ONLINE SALES: +30%', 'CUSTOMER ACQUISITION: -15%', 'INVESTMENT: $5M'],
    },
    background: 'bg-gradient-to-br from-purple-600 to-purple-900',
  },
  {
    id: 65,
    title: 'EXPANSION STRATEGY RD-2',
    content: {
      main: '#4 GLOBAL MARKETS',
      details: ['NEW TERRITORIES: +2', 'PROJECTED REVENUE: +$25M', 'TIMEFRAME: 12 MONTHS'],
    },
    background: 'bg-gradient-to-br from-red-600 to-red-900',
  },
  {
    id: 66,
    title: 'CHANNEL 2 OPTIMIZATION',
    content: {
      main: '#7 PARTNER PROGRAM',
      details: ['CHANNEL EFFICIENCY: +22%', 'PARTNER SATISFACTION: +30%', 'INVESTMENT: $7M'],
    },
    background: 'bg-gradient-to-br from-amber-600 to-amber-900',
  },
  {
    id: 67,
    title: 'INNOVATION PIPELINE RD-3',
    content: {
      main: '#1 PRODUCT EVOLUTION',
      details: ['NEW FEATURES: +15', 'MARKET DIFFERENTIATION: HIGH', 'R&D COST: $20M'],
    },
    background: 'bg-gradient-to-br from-indigo-600 to-indigo-900',
  },
  {
    id: 68,
    title: 'CHANNEL 3 DIRECT',
    content: {
      main: '#9 CUSTOMER EXPERIENCE',
      details: ['DIRECT SALES: +40%', 'MARGIN IMPROVEMENT: +8%', 'SETUP COST: $12M'],
    },
    background: 'bg-gradient-to-br from-lime-600 to-lime-900',
  },
  {
    id: 69,
    title: 'MARKET TESTING RESULTS',
    content: {
      main: '#2 COMPETITIVE ANALYSIS',
      details: ['MARKET POSITION: +3 POINTS', 'CUSTOMER FEEDBACK: POSITIVE', 'INSIGHT VALUE: HIGH'],
    },
    background: 'bg-gradient-to-br from-cyan-600 to-cyan-900',
  },
  {
    id: 70,
    title: 'FOCUS GROUP FINDINGS',
    content: {
      main: '#5 USER PREFERENCES',
      details: ['SATISFACTION SCORE: 8.7/10', 'FEATURE REQUESTS: 12 PRIORITIZED', 'ACTIONABLE INSIGHTS: 8'],
    },
    background: 'bg-gradient-to-br from-fuchsia-600 to-fuchsia-900',
  },
];