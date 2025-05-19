export interface Decision {
  id: string;
  label: string;
  details?: string;
  slideNumber: number;
}

export interface Slide {
  id: number;
  title: string;
  subtitle?: string;
  content: {
    main: string;
    details: string[];
  };
  background: string;
}

export interface AppState {
  currentSlide: number;
  decisions: Decision[];
  slides: Slide[];
  notes: string;
  isPlaying: boolean;
}