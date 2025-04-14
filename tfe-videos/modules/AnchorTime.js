// @ts-check

import { DATE_FORMAT_UGC_DETAILED } from "./Timeline.js";
import { TimeSource } from "./TimeSource.js";

/**
 * Associates a real time with a position in a video via a {@link TimeSource} object.
 */
export class AnchorTime {
	/** The real time {@link Date} of a position in a video. */
	#realTime;
	/** The time into the video in seconds. */
	#videoTime;
	/** The {@link TimeSource} object that provides the accuracy of the real time. */
	#timeSource;

	/**
	 * @param {Date|string} realTime The real time of the moment in the video. This can either be a {@link Date} object or a string in the form "DDTHH:mm:ss.sss±ZZ" where "ZZ" is the time zone offset in hours.
	 * @param {number} videoTime The time into the video in seconds.
	 * @param {TimeSource} timeSource The {@link TimeSource} object that provides the accuracy of the real time.
	 */
	constructor(realTime, videoTime, timeSource) {
		this.#realTime = realTime instanceof Date ? realTime : new Date("2024-12-" + realTime + ":00");
		if (Number.isNaN(this.#realTime.valueOf())) throw new Error("Invalid date passed in.");
		this.#videoTime = videoTime;
		this.#timeSource = timeSource;
	}

	/** @returns The real time {@link Date} of a position in a video. */
	get realTime() {
		return this.#realTime;
	}

	/** @returns The time into the video in seconds. */
	get videoTime() {
		return this.#videoTime;
	}

	/** @returns The {@link TimeSource} object that provides the accuracy of the real time information. */
	get timeSource() {
		return this.#timeSource;
	}

	toString() {
		return `"${DATE_FORMAT_UGC_DETAILED.format(this.#realTime)}" as the real time from ${this.timeSource.name} (off by ${this.#timeSource.lowerToleranceMs} ... ${this.#timeSource.upperToleranceMs} ms)`;
	}
}