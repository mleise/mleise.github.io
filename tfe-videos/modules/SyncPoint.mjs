// @ts-check

import { Video } from "./Video.mjs";

/**
 * A point in time that is shared between two {@link Video} {@link Clip}s and creates a link between them.
 */
export class SyncPoint {
	/** The first video. */
	video1;
	/** The second video. */
	video2;
	/** Time in the first video in seconds. */
	time1;
	/** Time in the second video in seconds. */
	time2;
	/** The tolerance (+/-) in seconds of the link between the video clips. */
	toleranceMs;
	/** Time in milliseconds between the event in the first video and the second video. Used to set video clips apart by a known amount of time. */
	deltaMs;

	/**
	 * @param {Video} video1 The first video.
	 * @param {number} time1 Time in the first video in seconds.
	 * @param {Video} video2 The second video.
	 * @param {number} time2 Time in the second video in seconds.
	 * @param {number} [tolerance=0] If the sync isn't perfect, state the tolerance (+/-) in seconds here. Defaults to 0.
	 * @param {number} [deltaMs=0] Time in milliseconds between the event in the first video and the second video. Used to set video clips apart by a known amount of time. Defaults to 0.
	 */
	constructor(video1, time1, video2, time2, tolerance = 0, deltaMs = 0) {
		this.video1 = video1;
		this.video2 = video2;
		this.time1 = time1;
		this.time2 = time2;
		this.toleranceMs = Math.round(tolerance * 1000);
		this.deltaMs = deltaMs;
	}

	/**
	 * Retrieves the {@link Clip} for one of the two {@link Video}s linked in this sync point.
	 * @param {number} idx Either 0 for the first video or 1 for the second video.
	 * @returns A clip used by this sync point.
	 */
	getClip(idx) {
		if (idx == 0) {
			return this.video1.getClipAtTime(this.time1);
		}
		else if (idx == 1) {
			return this.video2.getClipAtTime(this.time2);
		}
		else throw new Error("Index must be 0 or 1.");
	}
}