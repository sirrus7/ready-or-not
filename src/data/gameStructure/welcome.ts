// src/data/gameStructure/welcome.ts
import {Slide, GamePhaseNode} from '../../types';

export const welcomeSlides: Slide[] = [
    {
        id: 0,
        title: "Welcome",
        type: 'image',
        source_url: 'https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_001.jpg?alt=media',
        background_css: 'bg-gray-900'
    },
    {
        id: 1,
        title: "Table Setup 1",
        type: 'image',
        source_url: 'https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_002.jpg?alt=media',
        background_css: 'bg-gray-200'
    },
    {
        id: 2,
        title: "Table Setup 2",
        type: 'image',
        source_url: 'https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_003.jpg?alt=media',
        background_css: 'bg-gray-200'
    },
    {
        id: 3,
        title: "Ready Or Not",
        type: 'image',
        source_url: 'https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_004.jpg?alt=media',
        background_css: 'bg-green-700'
    },
    {
        id: 4,
        title: "Game Introduction",
        type: 'video',
        source_url: 'https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_005.mp4?alt=media',
        auto_advance_after_video: true
    },
    {
        id: 5,
        title: "Let's Get It On!",
        type: 'video',
        source_url: 'https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_006.mp4?alt=media',
        auto_advance_after_video: false, // REQ-1.6: Should NOT auto-advance, alert pops up
        host_alert: { // REQ-1.6
            title: "Time's Up!",
            message: "Time's Up. When you're ready, click Next to proceed."
        }
    },
    { // This is now Slide 6 in the sequence
        id: 6,
        title: "What Are Investments?", // Previously Slide 6
        type: 'video',
        source_url: 'https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_007.mp4?alt=media',
        auto_advance_after_video: false, // REQ-2.2: Should NOT auto-advance, alert pops up
        host_alert: { // REQ-2.2
            title: "Game Host Action",
            message: "Please hand out one set of RD-1 Investment Cards and one RD-1 Team Summary Sheet to each team."
        }
    },
];

export const welcomePhases: GamePhaseNode[] = [
    {
        id: 'welcome-intro',
        label: "WELCOME",
        sub_label: "Start",
        icon_name: 'PlayCircle',
        phase_type: 'welcome',
        round_number: 0,
        slide_ids: [0, 1, 2, 3],
        is_interactive_player_phase: false,
        expected_duration_minutes: 3
    },
    {
        id: 'game-setup', // This phase now includes slides 4, 5, and 6
        label: "SETUP",
        icon_name: 'Film', // Consider changing if it's not just film anymore
        phase_type: 'narration', // Or 'setup' if more appropriate
        round_number: 0,
        slide_ids: [4, 5, 6], // Slide 6 is now the "What are Investments" video
        is_interactive_player_phase: false,
        expected_duration_minutes: 7 // Adjust duration
    },
];