// @ts-check

import { Video } from "./Video.js";
import { Camera } from "./Camera.js"
import { AnchorTime } from "./AnchorTime.js";
import { DATE_FORMAT_UGC_TOOLTIP, DATE_FORMAT_UGC_DETAILED } from "./Timeline.js";
import { Person } from "./Person.js";
import { TimeInterval } from "./TimeInterval.js";

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
	/** Whether the duration of this clip is automatically determined by the closest succeeding clip. */
	#autoDuration;
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
	 * @param {number} [timelapseRate] Sets the timelapse rate for this clip, overriding the one from the {@link Video}.
	 */
	constructor(video, start, duration, cameraOrOwner, timelapseRate) {
		if (timelapseRate !== undefined && !(timelapseRate >= 1)) {
			throw new Error("Time-lapse rate has to be greater than or equal 1 or undefined.");
		}
		this.#video              = video;
		this.#start              = start;
		this.#duration           = duration;
		this.#autoDuration       = false;
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

	/** Sets whether the duration of this clip is automatically determined by the closest succeeding clip. */
	enableAutoDuration() {
		if (this.#succeedingClips.length > 0) {
			throw new Error("Cannot enable auto-duration if succeeding clips have already been added.");
		}
		this.#autoDuration = true;
		return this;
	}
	
	/** @returns Whether the duration of this clip is automatically determined by the closest succeeding clip */
	get autoDuration() {
		return this.#autoDuration;
	}

	/** @returns The camera that this clip was recorded on, if known. */
	get camera() {
		return this.#camera ?? this.#video.camera;
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
	 * Gets the timelapse rate of this clip if set.
	 * @returns {number|undefined} The timelapse rate of this clip.
	 */
	get timelapseRate() {
		return this.#timelapseRate;
	}
	
	/**
	 * The timelapse rate of this clip. Only valid if the timelapse rate is unset.
	 * @param {number} value The timelapse rate. Must be >= 1.
	 */
	setTimelapseRate(value) {
		if (this.#timelapseRate !== undefined) throw new Error("Timelapse rate is already defined.");
		if (!(value >= 1)) throw new Error("Timelapse rate must be >= 1.");
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
		if ((this.#timelapseRate !== undefined || this.#autoDuration) && this.#video.publishTime !== undefined) {
			this.lowerStartTimeMaxMs(this.#video.publishTime.valueOf() - (this.#autoDuration ? 0 : this.realTimeDurationMs), `the video was uploaded ${DATE_FORMAT_UGC_DETAILED.format(this.#video.publishTime)}`);
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

	/** @returns The real time duration of this clip in milliseconds. */
	get realTimeDurationMs() {
		if (!this.#timelapseRate) {
			throw new Error("Timelapse rate has not yet been determined.");
		}
		let durationLimitMs = +Infinity;
		if (this.#autoDuration && this.hasDefinedStartTimes) {
			for (let succeeding of this.#succeedingClips) {
				if (durationLimitMs > succeeding.startTimeAvgMs) {
					durationLimitMs = succeeding.startTimeAvgMs;
				}
			}
			durationLimitMs -= this.startTimeAvgMs;
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
		const naturalEndMs = this.#timeInterval.lowerTimeMs + this.realTimeDurationMs;
		if (this.#autoDuration) {
			for (const clip of this.#succeedingClips) {
				if (clip.startTimeMinMs < naturalEndMs) {
					return clip.startTimeMinMs;
				}
			}
		}
		return naturalEndMs;
	}

	/** @returns The upper bound for the end time of this clip. Auto-duration is applied here. */
	get endTimeMaxMs() {
		const naturalEndMs = this.#timeInterval.upperTimeMs + this.realTimeDurationMs;
		if (this.#autoDuration) {
			for (const clip of this.#succeedingClips) {
				if (clip.startTimeMaxMs < naturalEndMs) {
					return clip.startTimeMaxMs;
				}
			}
		}
		return naturalEndMs;
	}

	/** @returns The average of lower and upper bound for the end time of this clip. */
	get endTimeAvgMs() {
		const naturalEndMs = this.startTimeAvgMs + this.realTimeDurationMs;
		if (this.#autoDuration) {
			for (const clip of this.#succeedingClips) {
				if (clip.startTimeAvgMs < naturalEndMs) {
					return clip.startTimeAvgMs;
				}
			}
		}
		return naturalEndMs;
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
		if (this.#timeInterval.raiseLower(timeMs, ourSource) && !this.#autoDuration && this.#timelapseRate !== undefined) {
			const earliestMs = this.#timeInterval.lowerTimeMs + this.realTimeDurationMs;
			const theirSource = `a preceeding clip from "${this.video}" runs to that point, because ${source}`;
			for (const clip of this.#succeedingClips) {
				clip.raiseStartTimeMinMs(earliestMs, theirSource);
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
				if (!clip.#autoDuration) {
					const lastMs = timeMs - clip.realTimeDurationMs;
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
					const lastMs = succeeding.startTimeMaxMs - (preceding.#autoDuration ? 0 : preceding.realTimeDurationMs);
					const theirSource = `otherwise it would run into a succeeding clip from "${succeeding.video}", which starts no later than ${DATE_FORMAT_UGC_DETAILED.format(succeeding.startTimeMaxMs)}, because ${succeeding.startTimeMaxReason}`;
					preceding.lowerStartTimeMaxMs(lastMs, theirSource);
				}
				if (preceding.startTimeMinMs !== -Infinity) {
					const earliestMs = preceding.startTimeMinMs + (preceding.#autoDuration ? 0 : preceding.realTimeDurationMs);
					const theirSource = `a preceeding clip from "${preceding.#video}" runs to that point, because ${preceding.startTimeMinReason}`;
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
		`End time:\t${DATE_FORMAT_UGC_TOOLTIP.format(new Date((this.endTimeAvgMs)))} (Duration: ${Video.formatVideoTime(this.realTimeDurationMs / 1000)})\n` +
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