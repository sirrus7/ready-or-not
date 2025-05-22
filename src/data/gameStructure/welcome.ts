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
        title: "Ready Or Not 2.0",
        type: 'image',
        source_url: 'https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_004.jpg?alt=media',
        background_css: 'bg-green-700'
    },
    {
        id: 4,
        title: "Game Introduction Video",
        type: 'video',
        source_url: 'https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_005.mp4?alt=media',
        auto_advance_after_video: true
    },
    {
        id: 5,
        title: "Let's Get It On!",
        type: 'video',
        source_url: 'https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_006.mp4?alt=media',
        auto_advance_after_video: true,
    },
    {
        id: 6,
        title: "What Are Investments",
        type: 'video',
        source_url: 'https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_007.mp4?alt=media',
        auto_advance_after_video: true,
        teacher_alert: {
            title: "Game Host Alert!",
            message: "Game Host, hand out 1 set of RD-1 Investment Cards & 1 RD-1 Team Summary Sheet to each team now. Then click Next to proceed."
        }
    },
];

export const welcomePhases: GamePhaseNode[] = [
    {
        id: 'welcome-intro',
        label: "WELCOME",
        sub_label: "Start Here",
        icon_name: 'PlayCircle',
        phase_type: 'welcome',
        round_number: 0,
        slide_ids: [0, 1, 2, 3],
        is_interactive_student_phase: false,
        expected_duration_minutes: 3
    },
    {
        id: 'game-setup',
        label: "GAME SETUP",
        icon_name: 'Film',
        phase_type: 'narration',
        round_number: 0,
        slide_ids: [4, 5, 6],
        is_interactive_student_phase: false,
        expected_duration_minutes: 7
    },
];