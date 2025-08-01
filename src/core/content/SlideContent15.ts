// src/core/content/SlideContent15.ts
import {Slide} from '@shared/types/game';
import {getFilteredSlides} from './GameStructure';

/**
 * Creates the decimal slides that go between slide 6 and 7 in version 1.5
 */
const createDecimalSlides = (): Slide[] => [
    // Video slide after "How to Run"
    {
        id: 6.01,
        round_number: 0,
        title: "Introduction Video",
        type: 'video',
        source_path: 'Slide_006_1.mp4',
        auto_advance_after_video: true,
        background_css: 'bg-gray-200'
    },
    // 9 image slides
    {
        id: 6.02,
        round_number: 0,
        title: "KPI Tracking",
        type: 'image',
        source_path: 'Slide_006_2.jpg',
        background_css: 'bg-gray-200'
    },
    {
        id: 6.03,
        round_number: 0,
        title: "Let's Get It On",
        type: 'image',
        source_path: 'Slide_006_3.jpg',
        background_css: 'bg-gray-200'
    },
    {
        id: 6.04,
        round_number: 0,
        title: "Invest",
        type: 'image',
        source_path: 'Slide_006_4.jpg',
        background_css: 'bg-gray-200'
    },
    {
        id: 6.05,
        round_number: 0,
        title: "Investments",
        type: 'image',
        source_path: 'Slide_006_5.jpg',
        background_css: 'bg-gray-200'
    },
    {
        id: 6.06,
        round_number: 0,
        title: "RD-1 Investments",
        type: 'image',
        source_path: 'Slide_006_6.jpg',
        background_css: 'bg-gray-200'
    },
    {
        id: 6.07,
        round_number: 0,
        title: "Team Summary Sheets",
        type: 'image',
        source_path: 'Slide_006_7.jpg',
        background_css: 'bg-gray-200'
    },
    {
        id: 6.08,
        round_number: 0,
        title: "Team Phone Guru (TPG)",
        type: 'image',
        source_path: 'Slide_006_8.jpg',
        background_css: 'bg-gray-200'
    },
    {
        id: 6.09,
        round_number: 0,
        title: "Ready Or Not App",
        type: 'image',
        source_path: 'Slide_006_9.jpg',
        background_css: 'bg-gray-200'
    },
    {
        id: 6.10,
        round_number: 0,
        title: "Ready Or Not Phone App",
        type: 'image',
        source_path: 'Slide_006_10.jpg',
        background_css: 'bg-gray-200'
    },
];

/**
 * Creates 1.5 slides with updated titles and filenames
 */
export const get15Slides = (): Slide[] => {
    const baseSlides: Slide[] = getFilteredSlides('2.0_no_dd');
    const decimalSlides: Slide[] = createDecimalSlides();

    return baseSlides.map(slide => {
        // Override specific slides for version 1.5
        switch (slide.id) {
            case 0:
                return {
                    ...slide,
                    title: "Welcome",
                    source_path: 'Slide_001.jpg'
                };
            case 1:
                return {
                    ...slide,
                    title: "Overview",
                    source_path: 'Slide_002.jpg'
                };
            case 2:
                return {
                    ...slide,
                    title: "Target Acquisition",
                    source_path: 'Slide_003.jpg'
                };
            case 3:
                return {
                    ...slide,
                    title: "Target Acquisition",
                    source_path: 'Slide_004.jpg'
                };
            case 4:
                return {
                    ...slide,
                    title: "Mission Briefing",
                    source_path: 'Slide_005.jpg',
                    type: 'image',
                };
            case 5:
                return {
                    ...slide,
                    title: "Welcome to ALU",
                    source_path: 'Slide_006.jpg',
                    type: 'image',
                };
            case 6:
                return {
                    ...slide,
                    title: "How to Run",
                    source_path: 'Slide_007.jpg',
                    type: 'image',
                };
            case 8:
                return {
                    ...slide,
                    source_path: 'Slide_009.jpg',
                    type: 'image',
                };
            case 9:
                return {
                    ...slide,
                    source_path: 'Slide_010.jpg',
                    type: 'image',
                };
            case 11:
                return {
                    ...slide,
                    source_path: 'Slide_012.jpg',
                    type: 'image',
                };
            case 12:
                return {
                    ...slide,
                    source_path: 'Slide_013.jpg',
                    type: 'image',
                };
            case 13:
                return {
                    ...slide,
                    source_path: 'Slide_014.jpg',
                    type: 'image',
                };
            case 14:
                return {
                    ...slide,
                    source_path: 'Slide_015.jpg',
                    type: 'image',
                };
            case 15:
                return {
                    ...slide,
                    source_path: 'Slide_016.jpg',
                    type: 'image',
                };
            case 16:
                return {
                    ...slide,
                    source_path: 'Slide_017.jpg',
                    type: 'image',
                };
            default:
                return slide;
        }
    })
        // Insert decimal slides after slide 6 and before slide 7
        .flatMap(slide => {
            if (slide.id === 6) {
                return [slide, ...decimalSlides];
            }
            return slide;
        })
        // Sort all slides by ID to ensure proper ordering
        .sort((a, b) => a.id - b.id);
};
