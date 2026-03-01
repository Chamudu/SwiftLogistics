import fetch from 'node-fetch';
import logger from './logger.js';

/**
 * 🔁 SIMPLE RETRY LOGIC
 * Tries a function multiple times before giving up.
 * 
 * @param {Function} operation - Async function to run (e.g. fetch call)
 * @param {string} name - Name of service for logging (e.g. 'REST-Adapter')
 * @param {number} retries - How many times to retry (default: 3)
 * @param {number} delay - Initial delay in ms (default: 500ms)
 */
export async function resilientExecute(name, operation, retries = 3, delay = 500) {
    for (let i = 0; i <= retries; i++) {
        try {
            return await operation();
        } catch (error) {
            // If it's the last attempt, throw the error
            if (i === retries) {
                logger.error(`${name} FAILED after ${retries} retries`, { error: error.message });
                throw error;
            }

            // Otherwise, wait and retry
            logger.warn(`${name} failed (Attempt ${i + 1}/${retries}). Retrying...`, { error: error.message });
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

/**
 * Helper specifically for FETCH requests
 */
export async function resilientFetch(name, url, options) {
    return resilientExecute(name, async () => {
        const response = await fetch(url, options);
        if (!response.ok && response.status >= 500) {
            const errorText = await response.text();
            logger.error(`${name} Error Response:`, { status: response.status, body: errorText });
            throw new Error(`Server Error: ${response.status} - ${errorText}`);
        }
        return response;
    });
}
