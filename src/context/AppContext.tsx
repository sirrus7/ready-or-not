import React, { createContext, useContext, useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { AppState, Decision, Slide } from '../types';
import { mockDecisions, mockSlides } from '../data/mockData';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

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
  const { sessionId } = useParams<{ sessionId: string }>();
  const { user } = useAuth();

  // Initialize session and broadcast channel
  useEffect(() => {
    if (!sessionId || sessionId === 'new') return;

    const initSession = async () => {
      const { data: session } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (session) {
        setState(prevState => ({
          ...prevState,
          currentSlide: session.current_slide,
          isPlaying: session.is_playing,
          notes: session.notes || '',
        }));
      }
    };

    broadcastChannel = new BroadcastChannel(`classroom-${sessionId}`);
    broadcastChannel.onmessage = (event) => {
      if (event.data.type === 'STATE_UPDATE') {
        setState(event.data.state);
      }
    };

    initSession();

    return () => {
      broadcastChannel?.close();
    };
  }, [sessionId]);

  // Subscribe to real-time session updates
  useEffect(() => {
    if (!sessionId || sessionId === 'new') return;

    const subscription = supabase
      .channel(`session-${sessionId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'sessions',
        filter: `id=eq.${sessionId}`,
      }, (payload) => {
        if (payload.new) {
          setState(prevState => ({
            ...prevState,
            currentSlide: payload.new.current_slide,
            isPlaying: payload.new.is_playing,
            notes: payload.new.notes || '',
          }));
        }
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [sessionId]);

  // Create new session when accessing /classroom/new
  useEffect(() => {
    if (sessionId === 'new' && user) {
      const createSession = async () => {
        const { data: session, error } = await supabase
          .from('sessions')
          .insert([{
            name: `Session ${new Date().toLocaleString()}`,
            teacher_id: user.id,
          }])
          .select()
          .single();

        if (session && !error) {
          window.location.href = `/classroom/${session.id}`;
        }
      };

      createSession();
    }
  }, [sessionId, user]);

  // Broadcast state changes to all windows and update database
  const broadcastState = async (newState: AppState) => {
    setState(newState);
    broadcastChannel?.postMessage({
      type: 'STATE_UPDATE',
      state: newState,
    });

    if (sessionId && sessionId !== 'new') {
      await supabase
        .from('sessions')
        .update({
          current_slide: newState.currentSlide,
          is_playing: newState.isPlaying,
          notes: newState.notes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId);
    }
  };

  const selectDecision = (id: string) => {
    const decision = state.decisions.find(d => d.id === id);
    if (decision) {
      broadcastState({
        ...state,
        currentSlide: decision.slideNumber,
      });
    }
  };

  const updateNotes = (notes: string) => {
    broadcastState({ ...state, notes });
  };

  const nextSlide = () => {
    if (state.currentSlide < state.slides.length) {
      broadcastState({
        ...state,
        currentSlide: state.currentSlide + 1,
      });
    }
  };

  const previousSlide = () => {
    if (state.currentSlide > 1) {
      broadcastState({
        ...state,
        currentSlide: state.currentSlide - 1,
      });
    }
  };

  const togglePlayPause = () => {
    broadcastState({
      ...state,
      isPlaying: !state.isPlaying,
    });
  };

  const resetState = () => {
    broadcastState(initialState);
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