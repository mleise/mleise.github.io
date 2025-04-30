// @ts-check

/**
 * Represents a point in time with a source explaining where the information came from.
 */
class Time {
	/** The time value in milliseconds. */
	timeMs;
	/** The reason for why we think the time is what is says. */
	reason;

	/**
	 * @param {number} timeMs The initial time value in milliseconds.
	 */
	constructor(timeMs) {
		this.timeMs = timeMs;
	}
}

/**
 * A lower and upper bound for a time estimate.
 */
export class TimeInterval {
	/** The lower bound as a {@link Time} object. */
	#lower;
	/** The upper bound as a {@link Time} object. */
	#upper;

	/**
	 * Creates a new {@link TimeInterval} with the bounds infinitely far in the past and future respectively.
	 */
	constructor() {
		this.#lower = new Time(Number.NEGATIVE_INFINITY);
		this.#upper = new Time(Number.POSITIVE_INFINITY);
	}

	/**
	 * Raises the lower limit to a new time. If the new time is older than the current lower limit nothing is done.
	 * @param {number} timeMs The raised lower limit in milliseconds.
	 * @param {string} reason The reason for the new limit.
	 * @returns `true` if the limit was actually raised, `false` otherwise.
	 */
	raiseLower(timeMs, reason) {
		if (this.#upper.timeMs < timeMs) {
			throw new Error(`Attempt to raise the lower limit above the current upper limit. The current state of affairs:\n\n${this.#lower.reason}\n\n${this.#upper.reason}\n\nThe attempted change was to:\n\n${reason}.`);
		}
		if (this.#lower.timeMs < timeMs) {
			this.#lower.timeMs = timeMs;
			this.#lower.reason = reason;
			return true;
		}
		return false;
	}

	/**
	 * Lowers the upper limit to a new time. If the new time is newer than the current upper limit nothing is done.
	 * @param {number} timeMs The lowered upper limit in milliseconds.
	 * @param {string} reason The reason for the new limit.
	 * @returns `true` if the limit was actually lowered, `false` otherwise.
	 */
	lowerUpper(timeMs, reason) {
		if (this.#lower.timeMs > timeMs) {
			throw new Error(`Attempt to lower the upper limit below the current lower limit. The current state of affairs:\n\n${this.#lower.reason}\n\n${this.#upper.reason}\n\nThe attempted change was to:\n\n${reason}.`);
		}
		if (this.#upper.timeMs > timeMs) {
			this.#upper.timeMs = timeMs;
			this.#upper.reason = reason;
			return true;
		}
		return false;
	}

	/** @returns Whether this time interval has a finite lower and upper bound. */
	get isFinite() {
		return Number.isFinite(this.#lower.timeMs) && Number.isFinite(this.#upper.timeMs);
	}

	/** @returns The lower bound for this time interval. */
	get lowerTimeMs() {
		return this.#lower.timeMs;
	}

	/** @returns The upper bound for this time interval. */
	get upperTimeMs() {
		return this.#upper.timeMs;
	}

	/** @returns The reason for the lower bound. */
	get lowerReason() {
		return this.#lower.reason;
	}

	/** @returns The reason for the upper bound. */
	get upperReason() {
		return this.#upper.reason;
	}

	/** @returns The confidence interval (the delta between upper and lower limit) in milliseconds. */
	get confidenceIntervalMs() {
		return this.#upper.timeMs - this.#lower.timeMs;
	}

	/** @returns A textual description of the confidence interval. */
	get confidenceIntervalStr() {
		const confidenceIntervalMs = this.confidenceIntervalMs;
		if (confidenceIntervalMs > 3600000) {
			return `± ${Math.round(this.confidenceIntervalMs / 720000) / 10} h`;
		}
		else if (confidenceIntervalMs > 60000) {
			return `± ${Math.round(this.confidenceIntervalMs / 12000) / 10} m`;
		}
		else {
			return `± ${Math.round(this.confidenceIntervalMs / 200) / 10} s`;
		}
	}
}