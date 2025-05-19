// @ts-check

/**
 * Halts execution by a number of milliseconds. Useful for debugging.
 * @param {number} ms How long to wait in milliseconds.
 */
export function delay(ms) {
	const targetMs = Date.now() + ms;
	do {} while (Date.now() < targetMs);
}