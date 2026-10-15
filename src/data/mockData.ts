import { SyllabusModule, ResourceItem } from '../types';

/**
 * Initial application state is strictly empty.
 * All modules and resources must be derived from genuine user input,
 * AI extraction, or authenticated Firestore persistence.
 */
export const INITIAL_MODULES: SyllabusModule[] = [];

export const INITIAL_RESOURCES: ResourceItem[] = [];
