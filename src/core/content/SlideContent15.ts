// src/core/content/SlideContent15.ts
import {GameVersion, Slide, SlideType} from '@shared/types/game';
import {getFilteredSlides} from './GameStructure';

const image: SlideType = 'image' as SlideType
const video: SlideType = 'video' as SlideType
const interactive_invest: SlideType = 'interactive_invest' as SlideType
const consequence_reveal: SlideType = 'consequence_reveal' as SlideType
const interactive_choice: SlideType = 'interactive_choice' as SlideType
const payoff_reveal: SlideType = 'payoff_reveal' as SlideType
const kpi_reset: SlideType = 'kpi_reset' as SlideType

/**
 * Creates the decimal slides that go between slide 6 and 7 in version 1.5
 */
const createSubSlides6 = (): Slide[] => [
    // Video slide after "How to Run"
    {
        id: 6.01,
        round_number: 0,
        title: "Introduction Video",
        type: video,
        source_path: 'Slide_006_1.mp4',
        auto_advance_after_video: true,
        background_css: 'bg-gray-200'
    },
    // 9 image slides
    {
        id: 6.02,
        round_number: 0,
        title: "Let's Get It On",
        type: video,
        source_path: 'Slide_006_2.mp4',
        auto_advance_after_video: true,
        background_css: 'bg-gray-200'
    },
    {
        id: 6.03,
        round_number: 0,
        title: "Invest",
        type: image,
        source_path: 'Slide_006_3.jpg',
        background_css: 'bg-gray-200'
    },
    {
        id: 6.04,
        round_number: 0,
        title: "Investments",
        type: image,
        source_path: 'Slide_006_4.jpg',
        background_css: 'bg-gray-200'
    },
    {
        id: 6.05,
        round_number: 0,
        title: "RD-1 Investments",
        type: image,
        source_path: 'Slide_006_5.jpg',
        background_css: 'bg-gray-200'
    },
    {
        id: 6.06,
        round_number: 0,
        title: "Team Summary Sheets",
        type: image,
        source_path: 'Slide_006_6.jpg',
        background_css: 'bg-gray-200'
    },
    {
        id: 6.07,
        round_number: 0,
        title: "Team Phone Guru (TPG)",
        type: image,
        source_path: 'Slide_006_7.jpg',
        background_css: 'bg-gray-200'
    },
    {
        id: 6.08,
        round_number: 0,
        title: "Ready Or Not App",
        type: image,
        source_path: 'Slide_006_8.jpg',
        background_css: 'bg-gray-200'
    },
    {
        id: 6.09,
        round_number: 0,
        title: "Ready Or Not Phone App",
        type: image,
        source_path: 'Slide_006_9.jpg',
        background_css: 'bg-gray-200'
    },
];

const createSubSlides195 = (): Slide[] => [
    {
        id: 195.1,
        round_number: 3,
        title: "Implications",
        type: image,
        source_path: 'Slide_196_1.jpg',
        background_css: 'bg-gray-200'
    },
];

/**
 * Creates 1.5 slides with updated titles and filenames
 */
export const get15Slides = (version: GameVersion): Slide[] => {
    const baseSlides: Slide[] = getFilteredSlides(version);
    const subSlides6: Slide[] = createSubSlides6();
    const subSlides195: Slide[] = createSubSlides195();

    return baseSlides.map(slide => {
        // Override specific slides for version 1.5
        switch (slide.id) {
            case 0:
                return {
                    ...slide,
                    title: "Welcome",
                    source_path: 'Slide_001.jpg',
                    type: image,
                };
            case 1:
                return {
                    ...slide,
                    title: "Overview",
                    source_path: 'Slide_002.jpg',
                    type: image,
                };
            case 2:
                return {
                    ...slide,
                    title: "Target Acquisition",
                    source_path: 'Slide_003.jpg',
                    type: image,
                };
            case 3:
                return {
                    ...slide,
                    title: "Target Acquisition",
                    source_path: 'Slide_004.jpg',
                    type: image,
                };
            case 4:
                return {
                    ...slide,
                    title: "Mission Briefing",
                    source_path: 'Slide_005.jpg',
                    type: image,
                };
            case 5:
                return {
                    ...slide,
                    title: "Welcome to ALU",
                    source_path: 'Slide_006.jpg',
                    type: image,
                };
            case 6:
                return {
                    ...slide,
                    title: "How to Run",
                    source_path: 'Slide_007.jpg',
                    type: image,
                };
            case 8:
                return {
                    ...slide,
                    source_path: 'Slide_009.jpg',
                    type: image,
                };
            case 9:
                return {
                    ...slide,
                    source_path: 'Slide_010.jpg',
                    type: image,
                };
            case 11:
                return {
                    ...slide,
                    source_path: 'Slide_012.jpg',
                    type: image,
                };
            case 12:
                return {
                    ...slide,
                    source_path: 'Slide_013.jpg',
                    type: image,
                };
            case 13:
                return {
                    ...slide,
                    source_path: 'Slide_014.jpg',
                    type: image,
                };
            case 14:
                return {
                    ...slide,
                    source_path: 'Slide_015.jpg',
                    type: image,
                };
            case 15:
                return {
                    ...slide,
                    source_path: 'Slide_016.jpg',
                    type: image,
                };
            case 16:
                return {
                    ...slide,
                    source_path: 'Slide_017.jpg',
                    type: image,
                };
            case 17:
                return {
                    ...slide,
                    source_path: 'Slide_019.jpg',
                    type: interactive_choice,
                };
            case 19:
                return {
                    ...slide,
                    source_path: 'Slide_020.jpg',
                    type: image,
                };
            case 20:
                return {
                    ...slide,
                    source_path: 'Slide_021.jpg',
                    type: consequence_reveal,
                };
            case 21:
                return {
                    ...slide,
                    source_path: 'Slide_022.jpg',
                    type: consequence_reveal,
                };
            case 22:
                return {
                    ...slide,
                    source_path: 'Slide_023.jpg',
                    type: consequence_reveal,
                };
            case 23:
                return {
                    ...slide,
                    source_path: 'Slide_024.jpg',
                    type: consequence_reveal,
                };
            case 24:
                return {
                    ...slide,
                    source_path: 'Slide_025.jpg',
                    type: image,
                };
            case 25:
                return {
                    ...slide,
                    source_path: 'Slide_026.jpg',
                    type: image,
                };
            case 27:
                return {
                    ...slide,
                    source_path: 'Slide_028.jpg',
                    type: image,
                };
            case 28:
                return {
                    ...slide,
                    source_path: 'Slide_029.jpg',
                    type: image,
                };
            case 29:
                return {
                    ...slide,
                    source_path: 'Slide_030.jpg',
                    type: image,
                };
            case 30:
                return {
                    ...slide,
                    source_path: 'Slide_031.jpg',
                    type: image,
                };
            case 31:
                return {
                    ...slide,
                    source_path: 'Slide_032.jpg',
                    type: image,
                };
            case 32:
                return {
                    ...slide,
                    source_path: 'Slide_034.jpg',
                    type: interactive_choice,
                };
            case 34:
                return {
                    ...slide,
                    source_path: 'Slide_035.jpg',
                    type: image,
                };
            case 35:
                return {
                    ...slide,
                    source_path: 'Slide_036.jpg',
                    type: consequence_reveal,
                };
            case 36:
                return {
                    ...slide,
                    source_path: 'Slide_037.jpg',
                    type: consequence_reveal,
                };
            case 37:
                return {
                    ...slide,
                    source_path: 'Slide_038.jpg',
                    type: consequence_reveal,
                };
            case 38:
                return {
                    ...slide,
                    source_path: 'Slide_039.jpg',
                    type: consequence_reveal,
                };
            case 39:
                return {
                    ...slide,
                    source_path: 'Slide_040.jpg',
                    type: image,
                };
            case 40:
                return {
                    ...slide,
                    source_path: 'Slide_041.jpg',
                    type: image,
                };
            case 42:
                return {
                    ...slide,
                    source_path: 'Slide_043.jpg',
                    type: consequence_reveal,
                };
            case 43:
                return {
                    ...slide,
                    source_path: 'Slide_044.jpg',
                    type: image,
                };
            case 44:
                return {
                    ...slide,
                    source_path: 'Slide_045.jpg',
                    type: image,
                };
            case 45:
                return {
                    ...slide,
                    source_path: 'Slide_046.jpg',
                    type: image,
                };
            case 46:
                return {
                    ...slide,
                    source_path: 'Slide_047.jpg',
                    type: image,
                };
            case 47:
                return {
                    ...slide,
                    source_path: 'Slide_049.jpg',
                    type: interactive_choice,
                };
            case 49:
                return {
                    ...slide,
                    source_path: 'Slide_050.jpg',
                    type: image,
                };

            case 50:
                return {
                    ...slide,
                    source_path: 'Slide_051.jpg',
                    type: consequence_reveal,
                };
            case 51:
                return {
                    ...slide,
                    source_path: 'Slide_052.jpg',
                    type: consequence_reveal,
                };
            case 52:
                return {
                    ...slide,
                    source_path: 'Slide_053.jpg',
                    type: consequence_reveal,
                };
            case 53:
                return {
                    ...slide,
                    source_path: 'Slide_054.jpg',
                    type: consequence_reveal,
                };
            case 54:
                return {
                    ...slide,
                    source_path: 'Slide_055.jpg',
                    type: image,
                };
            case 62:
                return {
                    ...slide,
                    source_path: 'Slide_063.jpg',
                    type: image,
                };
            case 63:
                return {
                    ...slide,
                    source_path: 'Slide_064.jpg',
                    type: image,
                };
            case 64:
                return {
                    ...slide,
                    source_path: 'Slide_065.jpg',
                    type: image,
                };
            case 65:
                return {
                    ...slide,
                    source_path: 'Slide_066.jpg',
                    type: image,
                };
            case 66:
                return {
                    ...slide,
                    source_path: 'Slide_067.jpg',
                    type: image,
                };
            case 67:
                return {
                    ...slide,
                    source_path: 'Slide_068.jpg',
                    type: kpi_reset,
                };
            case 68:
                return {
                    ...slide,
                    source_path: 'Slide_069.jpg',
                    type: image,
                };
            case 69:
                return {
                    ...slide,
                    source_path: 'Slide_070.jpg',
                    type: image,
                };
            case 70:
                return {
                    ...slide,
                    source_path: 'Slide_071.mp4',
                    type: interactive_invest,
                };
            case 71:
                return {
                    ...slide,
                    source_path: 'Slide_072.jpg',
                    type: image,
                };
            case 72:
                return {
                    ...slide,
                    source_path: 'Slide_073.jpg',
                    type: image,
                };
            case 74:
                return {
                    ...slide,
                    source_path: 'Slide_075.jpg',
                    type: image,
                };
            case 75:
                return {
                    ...slide,
                    source_path: 'Slide_076.jpg',
                    type: image,
                };
            case 76:
                return {
                    ...slide,
                    source_path: 'Slide_077.jpg',
                    type: image,
                };
            case 77:
                return {
                    ...slide,
                    source_path: 'Slide_078.jpg',
                    type: image,
                };
            case 78:
                return {
                    ...slide,
                    source_path: 'Slide_080.jpg',
                    type: interactive_choice,
                };
            case 80:
                return {
                    ...slide,
                    source_path: 'Slide_081.jpg',
                    type: image,
                };
            case 81:
                return {
                    ...slide,
                    source_path: 'Slide_082.mp4',
                    type: video,
                };
            case 82:
                return {
                    ...slide,
                    source_path: 'Slide_083.jpg',
                    type: consequence_reveal,
                };
            case 83:
                return {
                    ...slide,
                    source_path: 'Slide_084.jpg',
                    type: consequence_reveal,
                };
            case 84:
                return {
                    ...slide,
                    source_path: 'Slide_085.jpg',
                    type: consequence_reveal,
                };
            case 85:
                return {
                    ...slide,
                    source_path: 'Slide_086.jpg',
                    type: image,
                };
            case 86:
                return {
                    ...slide,
                    source_path: 'Slide_087.jpg',
                    type: consequence_reveal,
                };
            case 87:
                return {
                    ...slide,
                    source_path: 'Slide_088.jpg',
                    type: image,
                };
            case 88:
                return {
                    ...slide,
                    source_path: 'Slide_089.jpg',
                    type: image,
                };
            case 89:
                return {
                    ...slide,
                    source_path: 'Slide_090.jpg',
                    type: image,
                };
            case 90:
                return {
                    ...slide,
                    source_path: 'Slide_091.jpg',
                    type: image,
                };
            case 91:
                return {
                    ...slide,
                    source_path: 'Slide_093.jpg',
                    type: interactive_choice,
                };
            case 93:
                return {
                    ...slide,
                    source_path: 'Slide_094.jpg',
                    type: consequence_reveal,
                };
            case 94:
                return {
                    ...slide,
                    source_path: 'Slide_095.jpg',
                    type: consequence_reveal,
                };
            case 95:
                return {
                    ...slide,
                    source_path: 'Slide_096.jpg',
                    type: consequence_reveal,
                };
            case 96:
                return {
                    ...slide,
                    source_path: 'Slide_097.jpg',
                    type: consequence_reveal,
                };
            case 97:
                return {
                    ...slide,
                    source_path: 'Slide_098.jpg',
                    type: image,
                };
            case 98:
                return {
                    ...slide,
                    source_path: 'Slide_099.jpg',
                    type: image,
                };
            case 100:
                return {
                    ...slide,
                    source_path: 'Slide_101.jpg',
                    type: consequence_reveal,
                };
            case 101:
                return {
                    ...slide,
                    source_path: 'Slide_102.jpg',
                    type: image,
                };
            case 102:
                return {
                    ...slide,
                    source_path: 'Slide_103.jpg',
                    type: image,
                };
            case 103:
                return {
                    ...slide,
                    source_path: 'Slide_104.jpg',
                    type: image,
                };
            case 104:
                return {
                    ...slide,
                    source_path: 'Slide_105.jpg',
                    type: image,
                };
            case 105:
                return {
                    ...slide,
                    source_path: 'Slide_107.jpg',
                    type: interactive_choice,
                };
            case 107:
                return {
                    ...slide,
                    source_path: 'Slide_108.mp4',
                    type: consequence_reveal,
                };
            case 108:
                return {
                    ...slide,
                    source_path: 'Slide_109.jpg',
                    type: consequence_reveal,
                };
            case 109:
                return {
                    ...slide,
                    source_path: 'Slide_110.jpg',
                    type: consequence_reveal,
                };
            case 110:
                return {
                    ...slide,
                    source_path: 'Slide_111.jpg',
                    type: consequence_reveal,
                };
            case 111:
                return {
                    ...slide,
                    source_path: 'Slide_112.jpg',
                    type: consequence_reveal,
                };
            case 112:
                return {
                    ...slide,
                    source_path: 'Slide_113.jpg',
                    type: image,
                };
            case 113:
                return {
                    ...slide,
                    source_path: 'Slide_114.jpg',
                    type: image,
                };
            case 114:
                return {
                    ...slide,
                    source_path: 'Slide_115.jpg',
                    type: image,
                };
            case 115:
                return {
                    ...slide,
                    source_path: 'Slide_116.jpg',
                    type: image,
                };
            case 116:
                return {
                    ...slide,
                    source_path: 'Slide_117.jpg',
                    type: image,
                };
            case 117:
                return {
                    ...slide,
                    source_path: 'Slide_118.jpg',
                    type: image,
                };
            case 118:
                return {
                    ...slide,
                    source_path: 'Slide_120.jpg',
                    type: interactive_choice,
                };
            case 120:
                return {
                    ...slide,
                    source_path: 'Slide_121.jpg',
                    type: consequence_reveal,
                };
            case 121:
                return {
                    ...slide,
                    source_path: 'Slide_122.jpg',
                    type: consequence_reveal,
                };
            case 122:
                return {
                    ...slide,
                    source_path: 'Slide_123.jpg',
                    type: consequence_reveal,
                };
            case 123:
                return {
                    ...slide,
                    source_path: 'Slide_124.jpg',
                    type: consequence_reveal,
                };
            case 124:
                return {
                    ...slide,
                    source_path: 'Slide_125.jpg',
                    type: image,
                };
            case 137:
                return {
                    ...slide,
                    source_path: 'Slide_138.mp4',
                    type: payoff_reveal,
                };
            case 138:
                return {
                    ...slide,
                    source_path: 'Slide_139.mp4',
                    type: payoff_reveal,
                };
            case 139:
                return {
                    ...slide,
                    source_path: 'Slide_140.jpg',
                    type: image,
                };
            case 140:
                return {
                    ...slide,
                    source_path: 'Slide_141.jpg',
                    type: image,
                };
            case 141:
                return {
                    ...slide,
                    source_path: 'Slide_142.jpg',
                    type: image,
                };
            case 142:
                return {
                    ...slide,
                    source_path: 'Slide_143.jpg',
                    type: kpi_reset,
                };
            case 143:
                return {
                    ...slide,
                    source_path: 'Slide_144.mp4',
                    type: interactive_invest,
                };
            case 145:
                return {
                    ...slide,
                    source_path: 'Slide_146.jpg',
                    type: image,
                };
            case 147:
                return {
                    ...slide,
                    source_path: 'Slide_148.jpg',
                    type: image,
                };
            case 148:
                return {
                    ...slide,
                    source_path: 'Slide_149.jpg',
                    type: image,
                };
            case 149:
                return {
                    ...slide,
                    source_path: 'Slide_150.jpg',
                    type: image,
                };
            case 150:
                return {
                    ...slide,
                    source_path: 'Slide_151.jpg',
                    type: image,
                };
            case 151:
                return {
                    ...slide,
                    source_path: 'Slide_153.jpg',
                    type: interactive_choice,
                };
            case 153:
                return {
                    ...slide,
                    source_path: 'Slide_154.mp4',
                    type: video,
                };
            case 154:
                return {
                    ...slide,
                    source_path: 'Slide_155.jpg',
                    type: consequence_reveal,
                };
            case 155:
                return {
                    ...slide,
                    source_path: 'Slide_156.jpg',
                    type: consequence_reveal,
                };
            case 156:
                return {
                    ...slide,
                    source_path: 'Slide_157.jpg',
                    type: consequence_reveal,
                };
            case 157:
                return {
                    ...slide,
                    source_path: 'Slide_158.jpg',
                    type: image,
                };
            case 159:
                return {
                    ...slide,
                    source_path: 'Slide_160.jpg',
                    type: image,
                };
            case 160:
                return {
                    ...slide,
                    source_path: 'Slide_161.jpg',
                    type: image,
                };
            case 161:
                return {
                    ...slide,
                    source_path: 'Slide_162.jpg',
                    type: image,
                };
            case 162:
                return {
                    ...slide,
                    source_path: 'Slide_163.jpg',
                    type: image,
                };
            case 163:
                return {
                    ...slide,
                    source_path: 'Slide_164.jpg',
                    type: image,
                };
            case 164:
                return {
                    ...slide,
                    source_path: 'Slide_166.jpg',
                    type: interactive_choice,
                };
            case 166:
                return {
                    ...slide,
                    source_path: 'Slide_167.jpg',
                    type: consequence_reveal,
                };
            case 167:
                return {
                    ...slide,
                    source_path: 'Slide_168.jpg',
                    type: consequence_reveal,
                };
            case 168:
                return {
                    ...slide,
                    source_path: 'Slide_169.jpg',
                    type: consequence_reveal,
                };
            case 169:
                return {
                    ...slide,
                    source_path: 'Slide_170.jpg',
                    type: image,
                };
            case 183:
                return {
                    ...slide,
                    source_path: 'Slide_184.mp4',
                    type: payoff_reveal,
                };
            case 195:
                return {
                    ...slide,
                    source_path: 'Slide_196.jpg',
                    type: image,
                };
            case 196:
                return {
                    ...slide,
                    source_path: 'Slide_197.jpg',
                    type: image,
                };
            case 197:
                return {
                    ...slide,
                    source_path: 'Slide_198.jpg',
                    type: image,
                };
            default:
                return slide;
        }
    })
        // Remove slides not used in 1.5
        .filter((slide: Slide) =>
            slide.id !== 158 &&
            slide.id !== 18 &&
            slide.id !== 33 &&
            slide.id !== 48 &&
            slide.id !== 79 &&
            slide.id !== 92 &&
            slide.id !== 106 &&
            slide.id !== 119 &&
            slide.id !== 152 &&
            slide.id !== 165)
        // Insert decimal slides after slide 6 and slide 195
        .flatMap(slide => {
            if (slide.id === 6) {
                return [slide, ...subSlides6];
            }
            if (slide.id === 195) {
                return [slide, ...subSlides195]
            }
            return slide;
        })
        // Sort all slides by ID to ensure proper ordering
        .sort((a, b) => a.id - b.id);
};
