# Ready or Not 2.0 🎮

[![Netlify Status](https://api.netlify.com/api/v1/badges/edbb4c8d-c47b-4b43-8e2b-3338b45228b8/deploy-status)](https://app.netlify.com/projects/ron2/deploys)  
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)

A comprehensive business simulation game designed for educational environments, where teams compete to maximize their company's net income through strategic decision-making across multiple rounds.

## 🎯 Overview

Ready or Not 2.0 is an interactive classroom simulation that teaches business fundamentals, strategic thinking, and decision-making under pressure. Teams manage virtual companies, making investment decisions, responding to market challenges, and competing for the highest net income.

### Key Features

- **Multi-round Gameplay**: Three strategic rounds (years) of business decisions
- **Real-time Collaboration**: Teams make decisions simultaneously on their devices
- **Live Dashboard**: Host control game flow and monitor team progress
- **Instant Feedback**: See the impact of decisions through KPI updates
- **Double Down Mechanic**: High-risk, high-reward opportunities in the final round
- **Comprehensive Reporting**: Track performance metrics and learning outcomes

## 🚀 Quick Start

### For Hosts/Facilitators

1. **Create an Account**: Sign up at [ron2.netlify.app](https://ron2.netlify.app/)
2. **Set Up a New Game**:
    - Click "Create Game" from your dashboard
    - Configure team sizes and game parameters
    - Print handouts for physical game materials
    - Set up your game layout
3. **Launch the Game**:
    - Start your session from the dashboard
    - Launch the presentation display for projector/screen
    - Share the game link and team codes with teams

### For Teams

1. **Join Your Team**: Navigate to the session link provided by your host
2. **Enter Credentials**: Use your team name and 4-digit passcode
3. **Make Decisions**: Follow on-screen prompts during decision phases
4. **Track Performance**: Monitor your KPIs throughout the game

## 📱 Technology Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Real-time subscriptions)
- **Hosting**: Netlify
- **State Management**: React Context API
- **Real-time Sync**: BroadcastChannel API + Supabase Realtime

## 🏗️ Architecture

### Application Structure

```
src/
├── components/          # Reusable UI components
│   ├── Host/    # Teacher control panel components
│   ├── Game/    # Student/team interface components
│   └── Display/ # Projection display components
├── pages/              # Main application pages
├── context/            # Global state management
├── hooks/              # Custom React hooks
├── data/               # Game configuration and content
└── types/              # TypeScript type definitions
```

### Key Components

- **Teacher Dashboard**: Game creation, session management, real-time monitoring
- **Student Interface**: Team login, decision panels, KPI displays
- **Projection Display**: Synchronized content for classroom screens
- **Real-time Engine**: Instant updates across all connected devices

## 🎮 Game Flow

1. **Setup Phase**: Teams receive briefing materials and initial KPIs
2. **Round 1-3**:
    - Investment decisions (budget allocation)
    - Challenge responses (strategic choices)
    - Consequence reveals
    - Investment payoffs
    - KPI updates and leaderboards
3. **Double Down** (Round 3): Optional high-stakes investment opportunity
4. **Final Results**: Complete performance analysis and winner announcement

## 🔧 Development Setup

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- Netlify account (for deployment)

### Local Development

1. Clone the repository:
```bash
git clone https://github.com/yourusername/ready-or-not-2.0.git
cd ready-or-not-2.0
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Configure your `.env` file:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

5. Run the development server:
```bash
npm run dev
```

## 🗄️ Database Schema

### Core Tables

- `sessions`: Game session metadata and state
- `teams`: Team information and access credentials
- `team_decisions`: Investment and challenge choices
- `team_round_data`: KPI tracking per round
- `permanent_kpi_adjustments`: Long-term effects from decisions

### Real-time Features

- Live team submission tracking
- Instant KPI updates
- Synchronized game state across all devices
- Automatic reconnection handling

## 🚀 Deployment

### Netlify Deployment

1. Connect your GitHub repository to Netlify
2. Configure build settings:
    - Build command: `npm run build`
    - Publish directory: `dist`
3. Set environment variables in Netlify dashboard
4. Deploy!

### Supabase Setup

1. Create a new Supabase project
2. Run the database migrations (found in `supabase/migrations/`)
3. Configure Row Level Security policies
4. Enable real-time subscriptions for required tables

## 📊 Features in Detail

### For Educators

- **Flexible Game Configuration**: Adapt to different class sizes and learning objectives
- **Real-time Monitoring**: Track team progress and submissions live
- **Intervention Tools**: Reset submissions, pause gameplay, provide hints
- **Comprehensive Analytics**: Export results for grading and assessment

### For Students

- **Intuitive Interface**: Easy-to-use decision panels
- **Immediate Feedback**: See how decisions impact KPIs
- **Competitive Elements**: Leaderboards and performance tracking
- **Mobile-Optimized**: Works on tablets and smartphones

## 🤝 Contributing

*TODO*  
We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📝 License

*TODO*  
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Educational design based on proven business simulation methodologies
- Built with modern web technologies for reliability and performance
- Special thanks to all educators and students who provided feedback

## 📞 Support

- **Documentation**: Coming soon!
- **Email**: Coming soon!
- **Issues**: [GitHub Issues](https://github.com/sirrus7/ready-or-not/issues)

---

Built with ❤️ for educators and students worldwide