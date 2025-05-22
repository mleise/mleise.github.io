// @ts-check

import { Video } from "./Video.js";
import { Camera } from "./Camera.js"
import { AnchorTime } from "./AnchorTime.js";
import { DATE_FORMAT_UGC_TOOLTIP, DATE_FORMAT_UGC_DETAILED } from "./Timeline.js";
import { Person } from "./Person.js";
import { TimeInterval } from "./TimeInterval.js";
import { TimeSource } from "./TimeSource.js";

/**
 * Part of a {@link Video}. Many videos will just be a single clip, but edited video may contain many.
 * 
 * It is easily possible to add timing information to clips that makes their latest possible start time fall before their
 * earliest start time, which is an error. I want these problems to show up on the line of code that added the conflicting timing
 * information. For that matter, the code that affects start times of clips is spread out and when making changes, one needs to
 * keep in mind how one type of timing information affects another one. Currently this applies to:
 * - Setting or calculating the time-lapse rate of a clip activates all anchor times within it.
 * - Anchor times depend on time-lapse rate and may be in a clip added later.
 * - Sync point are similar to anchor points, but for a link between two videos.
 * - Publish dates of videos push the last possible recording time down.
 */
export class Clip {
	/** The {@link Video} this clip is based on. */
	#video;
	/** Start of the segment in the video in seconds. */
	#start;
	/** Duration of the segment in seconds. */
	#duration;
	/** If set, the duration of this clip will be truncated to the start of the given clip. @type {Clip|null} */
	#autoDurationClip = null;
	/** Overrides the field of the same name in the {@link Video}. */
	#camera
	/** Overrides the field of the same name in the {@link Video}. */
	#owner;
	/** Overrides the field of the same name in the {@link Video}. @type {number|undefined} */
	#timelapseRate;
	/** Add clips to this that are known to precede this one. @type {Clip[]} */
	#precedingClips;
	/** Add clips to this that are known to succeed this one. @type {Clip[]} */
	#succeedingClips;
	/** The lower and upper limit of the wall time of this clip. */
	#timeInterval;

	/** @type {number} */
	timelineRow;

	/**
	 * Only call this constructor from within {@link Video} with the required post-processing.
	 * @param {Video} video The video to create a segment from.
	 * @param {number} start Start of the segment in the video in seconds.
	 * @param {number} duration Duration of the segment in seconds.
	 * @param {Camera|Person} cameraOrOwner The camera/device this was recorded on or the owner of the camera/device/channel if unknown.
	 * @param {number} [timelapseRate] Sets the time-lapse rate for this clip, overriding the one from the {@link Video}.
	 */
	constructor(video, start, duration, cameraOrOwner, timelapseRate) {
		if (timelapseRate !== undefined && !(timelapseRate >= 1)) {
			throw new Error("Time-lapse rate has to be greater than or equal 1 or undefined.");
		}
		this.#video              = video;
		this.#start              = start;
		this.#duration           = duration;
		this.#camera             = cameraOrOwner instanceof Camera ? cameraOrOwner : undefined;
		this.#owner              = cameraOrOwner instanceof Camera ? cameraOrOwner.owner : cameraOrOwner;
		this.#timelapseRate      = timelapseRate ?? video.timelapseRate;
		this.#precedingClips     = [];
		this.#succeedingClips    = [];
		this.#timeInterval       = new TimeInterval();
		this.#tryToApplyTimes();
	}

	/** @returns The video this clip is a part of. */
	get video() {
		return this.#video;
	}

	/** @returns The start time of the segment within its video in seconds. */
	get start() {
		return this.#start;
	}

	/**
	 * Sets the duration of the segment within its video.
	 * @param {number} value The updated duration in seconds.
	 */
	set duration(value) {
		this.#duration = value;
	}

	/** @returns The duration of the segment within its video in seconds. This does not take into account the auto-duration setting. */
	get duration() {
		return this.#duration;
	}

	/**
	 * Sets whether the duration of this clip is automatically determined by a succeeding clip.
	 * @param {Clip} clip The clip that determines the duration of this clip.
	 */
	enableAutoDuration(clip) {
		if (this.#succeedingClips.length > 0) {
			throw new Error("Cannot enable auto-duration if succeeding clips have already been added.");
		}
		this.#autoDurationClip = clip;
		return this;
	}
	
	/** @returns Whether the duration of this clip is automatically determined by the closest succeeding clip */
	get autoDuration() {
		return this.#autoDurationClip !== null;
	}

	/** @returns The camera that this clip was recorded on, if known. */
	get camera() {
		return this.#camera ?? this.#video.camera;
	}

	/**
	 * Sets the camera that this clip was recorded on.
	 * @param {Camera} camera The new camera.
	 */
	setCamera(camera) {
		this.#camera = camera;
		this.#owner = camera.owner;
		return this;
	}

	/** @returns The owner of the camera/device/channel that recorded this clip. */
	get owner() {
		return this.#owner;
	}

	/** 
	 * Sets the owner of the camera/device/channel that recorded this clip.
	 * @param {Person} owner The new owner.
	 */
	setOwner(owner) {
		this.#owner = owner;
		return this;
	}

	/**
	 * Gets the time-lapse rate of this clip if set.
	 * @returns {number|undefined} The time-lapse rate of this clip.
	 */
	get timelapseRate() {
		return this.#timelapseRate;
	}
	
	/**
	 * The time-lapse rate of this clip. Only valid if the time-lapse rate is unset.
	 * @param {number} value The time-lapse rate. Must be >= 1.
	 */
	setTimelapseRate(value) {
		if (this.#timelapseRate !== undefined) throw new Error("Time-lapse rate is already defined.");
		if (!(value >= 1)) throw new Error("Time-lapse rate must be >= 1.");
		this.#timelapseRate = value;
		this.#tryToApplyTimes();
		return this;
	}

	#tryToApplyTimes() {
		if (this.#timelapseRate !== undefined) {
			// Apply video publish time to this clip.
			this.applyPublishTime();
			// Apply any anchor times.
			for (let i = 0; i < this.#video.getAnchorTimeCount; i++) {
				this.applyAnchorTime(this.#video.getAnchorTime(i));
			}
			// Apply sync points.
			this.video.timeline.applySyncPoints(this);
		}
	}

	applyPublishTime() {
		if ((this.#timelapseRate !== undefined || this.#autoDurationClip !== null) && this.#video.publishTime !== undefined) {
			this.lowerStartTimeMaxMs(this.#video.publishTime.valueOf() - (this.#autoDurationClip === null ? this.getRealTimeDurationMs(false) : 0), `the video was uploaded ${DATE_FORMAT_UGC_DETAILED.format(this.#video.publishTime)}`);
		}
	}

	/**
	 * Applies an {@link AnchorTime} to this clip. That is, it tightens the clip’s start time range.
	 * @param {AnchorTime} anchorTime The anchor time within this video.
	 */
	applyAnchorTime(anchorTime) {
		if (this.start <= anchorTime.videoTime && this.start + this.duration > anchorTime.videoTime && this.#timelapseRate !== undefined) {
			const clipStart = anchorTime.realTime.valueOf() - (anchorTime.videoTime - this.start) * 1000 * this.#timelapseRate;
			this.raiseStartTimeMinMs(clipStart + anchorTime.timeSource.lowerToleranceMs, `at ${Video.formatVideoTime(anchorTime.videoTime)} in its video we get ${anchorTime}`);
			this.lowerStartTimeMaxMs(clipStart + anchorTime.timeSource.upperToleranceMs, `at ${Video.formatVideoTime(anchorTime.videoTime)} in its video we get ${anchorTime}`);
		}
	}

	/**
	 * Anchors the start of the clip manually given two dates.
	 * @param {string|Date} minStart Earliest possible date this clip could start.
	 * @param {string|Date} maxEnd Last possible date this clip could end.
	 * @param {string} reasoning The explanation for why we think the dates are correct.
	 * @returns {Clip} This clip.
	 */
	setTimesManually(minStart, maxEnd, reasoning) {
		minStart = minStart instanceof Date ? minStart : new Date("2024-12-" + minStart + ":00");
		maxEnd = maxEnd instanceof Date ? maxEnd : new Date("2024-12-" + maxEnd + ":00");
		const maxStart = new Date(maxEnd.valueOf() - this.getRealTimeDurationMs(true));
		if (minStart > maxStart) {
			throw new Error("First date lies after second date.");
		}
		const midTime = new Date((minStart.valueOf() + maxStart.valueOf()) / 2);
		const toleranceMs = (maxStart.valueOf() - minStart.valueOf()) / 2;
		const timeSource = new TimeSource(reasoning, -toleranceMs, +toleranceMs);
		this.video.addAnchorTime(midTime, this.start, timeSource);
		return this;
	}

	/**
	 * Anchors the start of the clip manually.
	 * @param {string|Date} minStart Last possible date this clip could end.
	 * @param {string} reasoning The explanation for why we think the dates are correct.
	 * @returns {Clip} This clip.
	 */
	setStartTimeManually(minStart, reasoning) {
		minStart = minStart instanceof Date ? minStart : new Date("2024-12-" + minStart + ":00");
		this.raiseStartTimeMinMs(minStart.valueOf(), reasoning);
		return this;
	}
	
	/**
	 * Anchors the start of the clip manually given its end time.
	 * @param {string|Date} maxEnd Last possible date this clip could end.
	 * @param {string} reasoning The explanation for why we think the dates are correct.
	 * @returns {Clip} This clip.
	 */
	setEndTimeManually(maxEnd, reasoning) {
		maxEnd = maxEnd instanceof Date ? maxEnd : new Date("2024-12-" + maxEnd + ":00");
		this.lowerStartTimeMaxMs(maxEnd.valueOf() - this.getRealTimeDurationMs(true), reasoning);
		return this;
	}

	/**
	 * Appends a clip to this clip.
	 * @param {Clip} other The clip to be appended.
	 * @returns {Clip} The appended clip.
	 */
	concat(other) {
		this.#video.timeline.chronology(this.video, this.start, other.video, other.start, 0, 0, 0, this.duration);
		return other;
	}
	
	/**
	 * @param {boolean} autoDuration If `true` and an auto-duration clip is set, the clipped duration will be returned, otherwise the natural play time.
	 * @returns The real time duration of this clip in milliseconds.
	 */
	getRealTimeDurationMs(autoDuration) {
		if (!this.#timelapseRate) {
			throw new Error("Time-lapse rate has not yet been determined.");
		}
		let durationLimitMs = +Infinity;
		if (autoDuration && this.#autoDurationClip?.hasDefinedStartTimes && this.hasDefinedStartTimes) {
			durationLimitMs = this.#autoDurationClip.startTimeAvgMs - this.startTimeAvgMs;
		}
		return Math.min(1000 * this.duration * this.#timelapseRate, durationLimitMs);
	}

	/** @returns Whether this clip has finite lower and upper bounds for its start time. */
	get hasDefinedStartTimes() {
		return this.#timeInterval.isFinite;
	}

	/** @returns The lower bound for the start time of this clip. */
	get startTimeMinMs() {
		return this.#timeInterval.lowerTimeMs;
	}

	/** @returns The upper bound for the start time of this clip. */
	get startTimeMaxMs() {
		return this.#timeInterval.upperTimeMs;
	}

	/** @returns The average of lower and upper bound for the start time of this clip. */
	get startTimeAvgMs() {
		if (!this.hasDefinedStartTimes) throw new Error("Start time has not been bounded yet.");
		return (this.#timeInterval.lowerTimeMs + this.#timeInterval.upperTimeMs) / 2;
	}

	/** @returns The reason for the lower bound of start time of this clip. */
	get startTimeMinReason() {
		return this.#timeInterval.lowerReason;
	}

	/** @returns The reason for the upper bound of start time of this clip. */
	get startTimeMaxReason() {
		return this.#timeInterval.upperReason;
	}

	/** @returns The lower bound for the end time of this clip. Auto-duration is applied here. */
	get endTimeMinMs() {
		const naturalEndMs = this.#timeInterval.lowerTimeMs + this.getRealTimeDurationMs(false);
		if (this.#autoDurationClip && this.#autoDurationClip.startTimeMinMs < naturalEndMs) {
			return this.#autoDurationClip.startTimeMinMs;
		}
		return naturalEndMs;
	}

	/** @returns The upper bound for the end time of this clip. Auto-duration is applied here. */
	get endTimeMaxMs() {
		const naturalEndMs = this.#timeInterval.upperTimeMs + this.getRealTimeDurationMs(false);
		if (this.#autoDurationClip && this.#autoDurationClip.startTimeMaxMs < naturalEndMs) {
			return this.#autoDurationClip.startTimeMaxMs;
		}
		return naturalEndMs;
	}

	/**
	 * @returns The average of lower and upper bound for the end time of this clip.
	 * Note that this function is supposed to be used for the final output and will perform additional clipping to any succeeding clips’ start time averages.
	 */
	get endTimeAvgMs() {
		let endMs = this.startTimeAvgMs + this.getRealTimeDurationMs(true);
		for (const clip of this.#succeedingClips) {
			if (endMs > clip.startTimeAvgMs + 0.01) {
				throw new Error("Unexpectedly large error in clip end time.");
			}
			endMs = Math.min(endMs, clip.startTimeAvgMs);
		}
		return endMs;
	}

	/** @returns The confidence interval (the delta between upper and lower start time) in milliseconds. */
	get confidenceIntervalMs() {
		return this.#timeInterval.confidenceIntervalMs;
	}

	/** @returns A textual description of the confidence interval. */
	get confidenceIntervalStr() {
		return this.#timeInterval.confidenceIntervalStr;
	}

	/**
	 * Raises the lower limit for the start time of this clip to a new time. If the new time is older than the current lower limit nothing is done.
	 * @param {number} timeMs The raised lower limit in milliseconds.
	 * @param {string} source The source of the new limit.
	 * @returns `true` if the start time minimum was actually raised, `false` otherwise.
	 */
	raiseStartTimeMinMs(timeMs, source) {
		const ourSource = `the clip cannot start earlier than ${DATE_FORMAT_UGC_DETAILED.format(timeMs)}, because ${source}`;
		if (this.#timeInterval.raiseLower(timeMs, ourSource) && this.#timelapseRate !== undefined) {
			const earliestMs = this.#timeInterval.lowerTimeMs + this.getRealTimeDurationMs(false);			
			const theirSource = `a preceding clip from "${this.video}" runs to that point, because ${source}`;
			for (const clip of this.#succeedingClips) {
				if (clip !== this.#autoDurationClip) {
					clip.raiseStartTimeMinMs(earliestMs, theirSource);
				}
			}
			this.#video.timeline.applySyncPoints(this);
			return true;
		}
		return false;
	}

	/**
	 * Lowers the upper limit for the start time of this clip to a new time. If the new time is newer than the current upper limit nothing is done.
	 * @param {number} timeMs The lowered upper limit in milliseconds.
	 * @param {string} source The source of the new limit.
	 * @returns `true` if the start time maximum was actually lowered, `false` otherwise.
	 */
	lowerStartTimeMaxMs(timeMs, source) {
		const ourSource = `the clip cannot start later than ${DATE_FORMAT_UGC_DETAILED.format(timeMs)}, because ${source}`;
		if (this.#timeInterval.lowerUpper(timeMs, ourSource)) {
			for (const clip of this.#precedingClips) {
				if (clip.#autoDurationClip !== this) {
					const lastMs = timeMs - clip.getRealTimeDurationMs(false);
					const theirSource = `otherwise it would run into a succeeding clip, which starts no later than ${DATE_FORMAT_UGC_DETAILED.format(timeMs)}, because ${source}`;
					clip.lowerStartTimeMaxMs(lastMs, theirSource);
				}
			}
			this.#video.timeline.applySyncPoints(this);
			return true;
		}
		return false;
	}

	/**
	 * Orders a list of {@link Clip}s. This ensures that no clip earlier in the list ends after the next one in the list starts.
	 * @param {Clip[]} clips The clips that should be put in order.
	 */
	static orderClips(...clips) {
		let preceding;
		for (const succeeding of clips) {
			if (preceding) {
				succeeding.#precedingClips.push(preceding);
				preceding.#succeedingClips.push(succeeding);
				if (succeeding.startTimeMaxMs !== +Infinity) {
					const lastMs = succeeding.startTimeMaxMs - (preceding.#autoDurationClip === succeeding ? 0 : preceding.getRealTimeDurationMs(false));
					const theirSource = `otherwise it would run into a succeeding clip from "${succeeding.video}", which starts no later than ${DATE_FORMAT_UGC_DETAILED.format(succeeding.startTimeMaxMs)}, because ${succeeding.startTimeMaxReason}`;
					preceding.lowerStartTimeMaxMs(lastMs, theirSource);
				}
				if (preceding.startTimeMinMs !== -Infinity) {
					const earliestMs = preceding.startTimeMinMs + (preceding.#autoDurationClip === succeeding ? 0 : preceding.getRealTimeDurationMs(false));
					const theirSource = `a preceding clip from "${preceding.#video}" runs to that point, because ${preceding.startTimeMinReason}`;
					succeeding.raiseStartTimeMinMs(earliestMs, theirSource);
				}
			}
			preceding = succeeding;
		}
	}

	/** @returns The number of clips that are said to precede this one. */
	get precedingClipCount() {
		return this.#precedingClips.length;
	}

	/**
	 * Retrieves a clip from the list of preceding clips.
	 * @param {number} idx The index of the preceding clip to return.
	 * @returns The preceeding clip at that index.
	 */
	getPrecedingClip(idx) {
		return this.#precedingClips[idx];
	}

	/** @returns The number of clips that are said to succeede this one. */
	get succeedingClipCount() {
		return this.#succeedingClips.length;
	}

	/**
	 * Retrieves a clip from the list of succeeding clips.
	 * @param {number} idx The index of the succeeding clip to return.
	 * @returns The succeeding clip at that index.
	 */
	getSucceedingClip(idx) {
		return this.#succeedingClips[idx];
	}

	/**
	 * @returns {AnchorTime[]} Anchor times that apply to this clip.
	 */
	get anchorTimes() {
		const result = [];
		for (let i = 0; i < this.#video.getAnchorTimeCount; i++) {
			let anchorTime = this.#video.getAnchorTime(i);
			if (this.#start <= anchorTime.videoTime && this.#start + this.#duration > anchorTime.videoTime) {
				result.push(anchorTime);
			}
		}
		return result;
	}

	/** @returns A URL that leads to this clip. If supported, the start and end time in the video are also set. */
	get url() {
		return this.#video.getUrlForTime(this.#start, this.#duration);
	}

	/** @returns A tooltip text for the clip with basic information. */
	get tooltip() {
		return `Source: ${this.#video}\n` +
		`Timecode:\t${Video.formatVideoTime(this.#start)} to ${Video.formatVideoTime(this.#start + this.#duration)}\n` +
		`Start time:\t${DATE_FORMAT_UGC_TOOLTIP.format(new Date((this.startTimeAvgMs)))}\n` +
		`End time:\t${DATE_FORMAT_UGC_TOOLTIP.format(new Date((this.endTimeAvgMs)))} (Duration: ${Video.formatVideoTime(this.getRealTimeDurationMs(true) / 1000)})\n` +
		`Confidence Interval:\t${this.confidenceIntervalStr}`;
	}

	/** @returns A HTML color string for this clip based on the {@link Person} who owns this clip. */
	get timelineColor() {
		return this.#owner.color;
	}

	toString() {
		return this.#duration === this.#video.duration ? this.#video.toString() : `${Video.formatVideoTime(this.#start)} to ${Video.formatVideoTime(this.#start + this.#duration)} in ${this.#video}`;
	}
}