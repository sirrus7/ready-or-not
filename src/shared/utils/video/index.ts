// src/shared/utils/video/index.ts - Simplified video utilities exports

// Legacy hooks (to be removed)
export {useHostVideo} from './useHostVideo';
export {usePresentationVideo} from './usePresentationVideo';

// New separated hooks
export {useHostVideoPlayback} from './useHostVideoPlayback';
export {useHostVideoSync} from './useHostVideoSync';
export {usePresentationVideoPlayback} from './usePresentationVideoPlayback';
export {usePresentationVideoSync} from './usePresentationVideoSync';

// Helpers
export {isVideo, getVideoInfo, isVideoReady, formatTime} from './helpers';
