import homeView from './views/home.js';
import profileView from './views/profile.js';

export function createContext() {
    const context = {};
    // TODO Add 'global' state here (ex: websockets)
    return context;
}

export function routes() {
    // TODO Add more views here!
    return {
        '': homeView,
        '#': homeView,
        '#home': homeView,
        '#profile': profileView
    }
}
