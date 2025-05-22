// @ts-check

/**
 * Videos contain hints about the current time. It can be a church bell ringing, the position of the moon or a smart phone clock.
 * These allow us to place a video segment on the time line without knowing the original recording time. Each time source has its
 * own uncertainty attached to it as well, so there is a bit of wiggle room. For example, when a phone reads 13:47, it could be
 * anywhere in the minute from 13:47:00.000 to 13:47:59.999.
 */
export class TimeSource {
	/** A descriptive name for the time source. */
	#name;
	/** Tolerance of the real time values (lower bound). */
	#lowerToleranceMs;
	/** Tolerance of the real time values (upper bound). */
	#upperToleranceMs;

	/**
	 * @param {string} name A descriptive name for the time source.
	 * @param {number} lowerToleranceMs Tolerance of the real time values (lower bound).
	 * @param {number} upperToleranceMs Tolerance of the real time values (upper bound).
	 */
	constructor(name, lowerToleranceMs, upperToleranceMs) {
		if (lowerToleranceMs !== undefined && upperToleranceMs !== undefined && !(lowerToleranceMs < upperToleranceMs)) {
			throw new Error(`The lower tolerance is greater than the upper tolerance for the time source.`);
		}
		this.#name = name;
		this.#lowerToleranceMs = lowerToleranceMs;
		this.#upperToleranceMs = upperToleranceMs;
	}

	/** @returns A descriptive name for the time source. */
	get name() {
		return this.#name;
	}

	/** @returns Tolerance of the real time values (lower bound). */
	get lowerToleranceMs() {
		return this.#lowerToleranceMs;
	}

	/** @returns Tolerance of the real time values (upper bound). */
	get upperToleranceMs() {
		return this.#upperToleranceMs;
	}
}