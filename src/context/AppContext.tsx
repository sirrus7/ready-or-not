import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppState, Decision, Slide } from '../types';
import { mockDecisions, mockSlides } from '../data/mockData';

interface AppContextProps {
  state: AppState;
  selectDecision: (id: string) => void;
  updateNotes: (notes: string) => void;
  nextSlide: () => void;
  previousSlide: () => void;
  togglePlayPause: () => void;
  resetState: () => void;
}

const initialState: AppState = {
  currentSlide: 1,
  decisions: mockDecisions,
  slides: mockSlides,
  notes: '',
  isPlaying: false,
};

const AppContext = createContext<AppContextProps | undefined>(undefined);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

// Setup broadcast channel for cross-window communication
let broadcastChannel: BroadcastChannel | null = null;

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(initialState);

  // Initialize broadcast channel
  useEffect(() => {
    broadcastChannel = new BroadcastChannel('classroom-app');
    
    broadcastChannel.onmessage = (event) => {
      if (event.data.type === 'STATE_UPDATE') {
        setState(event.data.state);
      }
    };

    return () => {
      broadcastChannel?.close();
    };
  }, []);

  // Broadcast state changes to all windows
  const broadcastState = (newState: AppState) => {
    broadcastChannel?.postMessage({
      type: 'STATE_UPDATE',
      state: newState,
    });
  };

  const selectDecision = (id: string) => {
    const decision = state.decisions.find(d => d.id === id);
    if (decision) {
      const newState = {
        ...state,
        currentSlide: decision.slideNumber,
      };
      setState(newState);
      broadcastState(newState);
    }
  };

  const updateNotes = (notes: string) => {
    const newState = { ...state, notes };
    setState(newState);
    broadcastState(newState);
  };

  const nextSlide = () => {
    if (state.currentSlide < state.slides.length) {
      const newState = { ...state, currentSlide: state.currentSlide + 1 };
      setState(newState);
      broadcastState(newState);
    }
  };

  const previousSlide = () => {
    if (state.currentSlide > 1) {
      const newState = { ...state, currentSlide: state.currentSlide - 1 };
      setState(newState);
      broadcastState(newState);
    }
  };

  const togglePlayPause = () => {
    const newState = { ...state, isPlaying: !state.isPlaying };
    setState(newState);
    broadcastState(newState);
  };

  const resetState = () => {
    const newState = initialState;
    setState(newState);
    broadcastState(newState);
  };

  return (
    <AppContext.Provider
      value={{
        state,
        selectDecision,
        updateNotes,
        nextSlide,
        previousSlide,
        togglePlayPause,
        resetState,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};