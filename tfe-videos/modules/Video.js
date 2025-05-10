// @ts-check

import { AnchorTime } from "./AnchorTime.js";
import { Camera, NTSC30 } from "./Camera.js";
import { Clip } from "./Clip.js";
import { EmbeddedHtmlVideoPlayer, EmbeddedPlayer, EmbeddedTikTokPlayer, EmbeddedYouTubePlayer } from "./EmbeddedPlayer.js";
import { Person } from "./Person.js";
import { Timeline } from "./Timeline.js";
import { TimeSource } from "./TimeSource.js";

/**
 * Abstact base class for videos from a video platform. A video had to be segmented into {@link Clip}s to be placed on the timeline.
 */
export class Video {
	/** The timeline that this video is a part of. */
	#timeline;
	/** Title of the video (e.g. YouTube title or next best thing to a title if not applicable). */
	#title;
	/** Video duration in seconds. */
	#duration;
	/** Frame rate of the video in frames per second. */
	#fps;
	/** Date and time this video was published on. Gives the program an upper bound for when this was shot. @type {Date|undefined} */
	#publishTime;
	/** Timelapse rate (defaulting to 1) for this video. Set to `undefined` to automatically calculate from two sync points into a video playing at normal rate. @type {number|undefined} */
	#timelapseRate;
	/** The camera this video was shot on. If this is an edited video with segments from multiple cameras, leave it as `undefined` and set the camera for each segment instead. */
	#camera
	/** The owner of the camera(s) used for this video. */
	#owner;
	/** Timestamps in the video that give us clues about the real time this was shot. @type {AnchorTime[]} */
	#anchorTimes;
	/** If this is set, creating a new {@link Clip} ensures that it wont start earlier than the previous clip from this video ended. Defaults to `true`. */
	#clipsAreSequential;
	/** Clips already created from this Video. @type {Clip[]} */
	#clips;
	/** Time into the video that has already been turned into {@link Clip}s. Start of the next clip. */
	#nextClipStart;

	/**
	 * @param {Timeline} timeline The timeline this video will be added to.
	 * @param {string} title The title of this video, or whatever comes closest to a "title".
	 * @param {number} duration The duration of the video in seconds.
	 * @param {number} fps The frame rate of the video in frames per second.
	 * @param {Camera|Person} cameraOrOwner The camera/device this was recorded on or the owner of the camera/device/channel if unknown.
	 */
	constructor(timeline, title, duration, fps, cameraOrOwner) {
		if (!(fps > 0)) throw new Error("Frame rate has to be positive.");
		if (!cameraOrOwner) throw new Error("Camera or owner not provided.");
		this.#timeline           = timeline;
		this.#title              = title;
		this.#duration           = duration;
		this.#fps                = fps;
		this.#timelapseRate      = 1;
		this.#camera             = cameraOrOwner instanceof Camera ? cameraOrOwner : undefined;
		this.#owner              = cameraOrOwner instanceof Camera ? cameraOrOwner.owner : cameraOrOwner;
		this.#anchorTimes        = [];
		this.#clipsAreSequential = true;
		this.#clips              = [];
		this.#nextClipStart      = 0;
	}

	/** @returns The timeline that this video is a part of. */
	get timeline() {
		return this.#timeline;
	}

	/** @returns The video title that was passed into the constructor. */
	get title() {
		return this.#title;
	}

	/** @returns The video duration in seconds. Note that if this video is a single full length {@link Clip}, the duration of that clip can be shorter if {@link Clip.autoDuration} is enabled for the clip. */
	get duration() {
		return this.#duration;
	}

	/**
	 * The publish date & time of this video.
	 * @param {string} publishTime The date and time as a `string` that can be parsed by the {@link Date} constructor.
	 */
	set publishTime(publishTime) {
		if (this.#publishTime !== undefined) {
			throw new Error("The publish time for this video has already been set.");
		}
		this.#publishTime = new Date(publishTime);
		for (const clip of this.#clips) {
			clip.applyPublishTime();
		}
	}

	/**
	 * @returns {Date|undefined} The publish date & time of this video if set.
	 */
	get publishTime() {
		return this.#publishTime;
	}

	/** @returns Whether this video was a live stream. */
	get isLive() {
		return false;
	}

	/**
	 * Sets the timelapse rate for this entire video. Can be overridden by segments. An `undefined` value means that the
	 * rate is to be determined automatically from two sync times with another video that plays at normal speed.
	 * @param {(number|undefined)} value The speedup factor of this video compared to real time playback.
	 */
	setTimelapseRate(value) {
		if (value !== undefined && !(value >= 1)) throw new Error("Time-lapse rate has to be greater than or equal 1 or undefined.");
		this.#timelapseRate = value;
		return this;
	}

	/**
	 * @returns The timelapse rate for this entire video. Can be overridden by segments. An `undefined` value means that the
	 * rate is to be determined automatically from two sync times with another video that plays at normal speed.
	 */
	get timelapseRate() {
		return this.#timelapseRate;
	}

	/** @returns The camera this video was recorded on, if a single camera was used, `undefined` otherwise. */
	get camera() {
		return this.#camera;
	}

	/** @returns The owner of this video or the camera this video was shot on. */
	get owner() {
		return this.#owner;
	}

	/** @returns The number of timestamps in the video that give us clues about the real time this was shot. */
	get getAnchorTimeCount() {
		return this.#anchorTimes.length;
	}

	/**
	 * @param {number} idx Index into the array of timestamps.
	 * @returns An entry in the array of timestamps in the video that give us clues about the real time this was shot.
	 */
	getAnchorTime(idx) {
		return this.#anchorTimes[idx >= 0 ? idx : this.#anchorTimes.length + idx];
	}

	/**
	 * If this is set, creating a new {@link Clip} ensures that it wont start earlier than the previous clip from this video ended. Defaults to `true`.
	 * @param {boolean} value New value.
	 */
	setClipsAreSequential(value) {
		this.#clipsAreSequential = value;
		return this;
	}

	/**
	 * Converts a video time string into a number in seconds.
	 * @param {string} videoTime A video time in "HH:MM:ss.sss" format or "HH:MM:ss/frame" format.
	 * @returns The video time converted to a number in seconds.
	 */
	parseVideoTime(videoTime) {
		let slashPos = videoTime.search("\\/");
		let videoTimeParseable = videoTime;
		let frames = 0;
		if (slashPos !== -1) {
			videoTimeParseable = videoTime.substring(0, slashPos);
			frames = Number.parseInt(videoTime.substring(slashPos + 1));
		}
		return Date.parse("1970-01-01T" + videoTimeParseable + "Z") / 1000 + frames / this.#fps;
	}

	/**
	 * Converts a time in seconds to a video time string in "HH:MM:ss.sss" format by omitting leading parts that are zero.
	 * @param {number} videoTime The video time in seconds.
	 * @returns The video time formatted as a string.
	 */
	static formatVideoTime(videoTime) {
		const hours = Math.floor(videoTime / 3600);
		videoTime -= 3600 * hours;
		const minutes = Math.floor(videoTime / 60);
		videoTime -= 60 * minutes;
		const seconds = Math.round(videoTime * 1000) / 1000;
		let result = hours ? hours.toString() + ":" : "";
		if (minutes < 10 && hours) result += "0";
		result += minutes.toString() + ":";
		if (seconds < 10) result += "0";
		result += seconds.toString();
		return result;
	}

	/**
	 * Anchors a frame or event in the video to a real time.
	 * @param {string|Date} realTime Real time of event.
	 * @param {string|number} videoTime Time stamp in video showing the event.
	 * @param {TimeSource} timeSource Time source providing the imprecision of the estimated real time.
	 * @returns {Video} This video.
	 */
	addAnchorTime(realTime, videoTime, timeSource) {
		videoTime = typeof videoTime === "number" ? videoTime : this.parseVideoTime(videoTime);
		const anchorTime = new AnchorTime(realTime, videoTime, timeSource);
		this.#anchorTimes.push(anchorTime);
		for (const clip of this.#clips) {
			clip.applyAnchorTime(anchorTime);
		}
		return this;
	}

	/**
	 * Skips the video frames from the current position up to, but not including the given time stamp, without adding them to any clip.
	 * @param {string} videoTime 
	 */
	skipClip(videoTime) {
		const seconds = this.parseVideoTime(videoTime);
		if (this.#nextClipStart >= seconds) {
			throw new Error("Clip time before last segment end.");
		}
		this.#nextClipStart = seconds;
		if (this.#nextClipStart > this.#duration) {
			throw new Error("Video clip past end of video.");
		}
		return this;
	}

	/**
	 * Creates a {@link Clip} from the current position up to, but not including the given time stamp.
	 * @param {string} [videoTime]
	 * @returns The created clip.
	 */
	createClip(videoTime) {
		let start = this.#nextClipStart;
		let duration;
		if (videoTime === undefined) {
			duration = this.#duration - this.#nextClipStart;
			this.#nextClipStart = this.#duration;
		}
		else {
			this.skipClip(videoTime);
			duration = this.#nextClipStart - start;
		}
		let clip = new Clip(this, start, duration, this.#camera ?? this.#owner);
		if (this.#clipsAreSequential && this.#clips.length > 0) {
			const lastClip = this.#clips.at(-1);
			if (lastClip) {
				Clip.orderClips(lastClip, clip);
			}
		}
		this.#timeline.addClip(clip);
		this.#clips.push(clip);
		return clip;
	}

	/**
	 * Iterates over all the {@link Clip}s of this video.
	 * @returns {Iterator<Clip>}
	 */
	[Symbol.iterator]() {
		const clips = this.#clips;
		let idx = 0;
		return {
			next() {
				return idx < clips.length ? { value: clips[idx++] } : { value: undefined, done: true };
			}
		}
	}

	/**
	 * Retrieves the {@link Clip} at a specific time in this {@link Video}.
	 * @param {number} time Time in the video in seconds.
	 * @returns The clip at that time in the video.
	 */
	getClipAtTime(time) {
		let lo = 0, hi = this.#clips.length - 1
		do {
			const mid = Math.floor((lo + hi) / 2);
			const clip = this.#clips[mid];
			if (clip.start > time) {
				hi = mid - 1;
			}
			else if (clip.start + clip.duration <= time) {
				lo = mid + 1;
			}
			else {
				return clip;
			}
		} while (lo <= hi);
		throw Error("No clip found at the specified time.");
	}

	/**
	 * Appends a video to this video, or more precisely the single segment of another video to the single segment of this video.
	 * This video's segment as well as the other segment must start at 00:00:00.000.
	 * @param {Video} other The video to be appended.
	 * @returns {Video} The appended video.
	 */
	concat(other) {
		if (this.#clips.length != 1 || other.#clips.length != 1 || this.#clips[0].start != 0 || other.#clips[0].start != 0) {
			throw new Error("Concatenated videos must each be a single segment");
		}
		this.#timeline.chronology(this, "00:00:00", other, "00:00:00", 0, 0, 0, this.#clips[0].duration);
		return other;
	}

	/**
	 * Converts a time in the video to the date at which it happened.
	 * @param {string} videoTime Time code in the video.
	 * @returns {Date} The date of that time in the video.
	 */
	videoToRealTime(videoTime) {
		const seconds = this.parseVideoTime(videoTime);
		for (const seg of this.#clips) {
			if (seg.start <= seconds && seg.start + seg.duration > seconds) {
				if (seg.timelapseRate === undefined) throw new Error("Timelapse rate is missing.");
				return new Date(seg.startTimeAvgMs + (seconds - seg.start) * 1000 * seg.timelapseRate);
			}
		}
		throw new Error("Video time is not found in any segment");
	}

	/**
	 * Retrieves a URL to this video at a certain play time.
	 * @param {number} seconds Seconds into the video. Some platforms may truncate to full seconds.
	 * @param {number} duration Duration of the section to be played.
	 * @returns {string}
	 */
	getUrlForTime(seconds, duration) {
		throw new Error("not implemented");
	}

	/**
	 * Spawns an embedded video player for this video.
	 * @param {number} videoTime Time in the video in seconds, for which to spawn a player. The video is seeked to that position.
	 * @returns {EmbeddedPlayer|undefined}
	 */
	spawnEmbededPlayer(videoTime) {
		return undefined;
	}

	toString() {
		return this.#title;
	}
}

/**
 * A YouTube video.
 */
export class YouTubeVideo extends Video {
	/** All YouTube videos created so far. @type {YouTubeVideo[]} */
	static #allVideos = [];
	/** YouTube video ID. Uniquely identifies the video and allows retrieval. */
	#id;
	/** YouTube channel that this video is posted under. Not technically required as you can find the channel name from the video. */
	#channelName;
	/** For live streams: The start time retrieved from YouTube’s API (often 30 seconds late). @type {Date|undefined} */
	#streamStartTime;
	/** For live streams: The end time retrieved from YouTube’s API (often inaccurate). @type {Date|undefined} */
	#streamEndTime;
	/** Optional latitude for the video in degrees. @type {number|undefined} */
	#lat;
	/** Optional longitude for the video in degrees. @type {number|undefined} */
	#lon;

	/**
	 * Creates a new YouTube video on a timeline.
	 * @param {Timeline} timeline The timeline this video will be added to.
	 * @param {string} id YouTube video ID.
	 * @param {string} channelName YouTube channel name (not channel ID).
	 * @param {string} title YouTube video title.
	 * @param {number} duration Video duration in seconds (from debug info).
	 * @param {number} fps Video frame rate (from OSD).
	 * @param {Camera|Person} cameraOrOwner Camera used to film this video or owner of the camera if unknown, if a single camera was used to film all of it.
	 * @param {string} date1 Publish date of this video or stream start time.
	 * @param {string} [date2] Stream end time.
	 */
	constructor(timeline, id, channelName, title, duration, fps, cameraOrOwner, date1, date2) {
		super(timeline, title, duration, fps, cameraOrOwner);
		this.#id = id;
		this.#channelName = channelName;
		if (date2 === undefined) {
			super.publishTime = date1;
		}
		else {
			this.#streamStartTime = new Date(date1);
			this.#streamEndTime = new Date(date2);
		}
		YouTubeVideo.#allVideos.push(this);
	}

	/** @returns The YouTube ID of this video. */
	get id() {
		return this.#id;
	}

	/** @returns Whether this video was a live stream. */
	get isLive() {
		return this.#streamStartTime !== undefined || this.#streamEndTime !== undefined;
	}

	/** @returns The previously set live stream start time. */
	get streamStartTime() {
		if (this.#streamStartTime === undefined) {
			throw new Error("Cannot query live stream start time unless stream times have been set.");
		}
		return this.#streamStartTime;
	}

	/** @returns The previously set live stream end time. */
	get streamEndTime() {
		if (this.#streamEndTime === undefined) {
			throw new Error("Cannot query live stream end time unless stream times have been set.");
		}
		return this.#streamEndTime;
	}

	/**
	 * Sets the optional GPS coordinates for a video.
	 * @param {number} lat Latitude in degrees.
	 * @param {number} lon Longitude in degrees.
	 */
	setCoordinates(lat, lon) {
		this.#lat = lat;
		this.#lon = lon;
		return this;
	}

	/**
	 * @param {number} seconds Seconds into the video.
	 * @param {number} duration Duration of the segment to be played back in seconds. (Ignored by YouTube.)
	 * @returns A URL that opens the video in YouTube at the given timestamp rounded up to the next second.
	 */
	getUrlForTime(seconds, duration) {
		return `https://www.youtube.com/watch?v=${this.#id}&t=${Math.ceil(seconds)}s`;
	}

	/**
	 * Goes through all YouTube live streams and compares their stream times as returned by YouTube’s API
	 * with other time sources for these videos to determine the accuracy of these stream times.
	 */
	static calculateStreamTimes() {
		let startLowerToleranceMs = +Infinity, endLowerToleranceMs = +Infinity;
		let startUpperToleranceMs = -Infinity, endUpperToleranceMs = -Infinity;
		for (const video of this.#allVideos) {
			if (video.isLive) {
				for (const clip of video) {
					if (clip.start == 0) {
						const deltaStartMinMs = clip.startTimeMinMs - video.streamStartTime.valueOf();
						const deltaStartMaxMs = clip.startTimeMaxMs - video.streamStartTime.valueOf();
						if (startLowerToleranceMs > deltaStartMaxMs) {
							startLowerToleranceMs = deltaStartMaxMs;
						}
						if (startUpperToleranceMs < deltaStartMinMs) {
							startUpperToleranceMs = deltaStartMinMs;
						}
					}
					if (Math.abs(clip.start + clip.duration - video.duration) < 0.0005) {
						const deltaEndMinMs = clip.startTimeMinMs - video.streamEndTime.valueOf() + 1000 * clip.duration;
						const deltaEndMaxMs = clip.startTimeMaxMs - video.streamEndTime.valueOf() + 1000 * clip.duration;
						if (endLowerToleranceMs > deltaEndMaxMs) {
							endLowerToleranceMs = deltaEndMaxMs;
						}
						if (endUpperToleranceMs < deltaEndMinMs) {
							endUpperToleranceMs = deltaEndMinMs;
						}
					}
				}
			}
		}
		const ytStreamStart = new TimeSource("YouTube stream start time", startLowerToleranceMs, startUpperToleranceMs);
		const ytStreamEnd   = new TimeSource("YouTube stream end time", endLowerToleranceMs, endUpperToleranceMs);
		const ytStreamTimes = new TimeSource("YouTube stream start & end times", Math.max(startLowerToleranceMs, endLowerToleranceMs), Math.min(startUpperToleranceMs, endUpperToleranceMs));

		for (const video of this.#allVideos) {
			if (video.isLive) {
				for (const clip of video) {
					const isLast = Math.abs(clip.start + clip.duration - video.duration) < 0.0005;
					let realTime, videoTime, timeSource;
					if (clip.start == 0) {
						realTime = video.streamStartTime;
						videoTime = "00:00:00.000";
						timeSource = isLast ? ytStreamTimes : ytStreamStart;
					}
					else if (isLast) {
						realTime = new Date(video.streamEndTime.valueOf() - 1000 * clip.duration);
						videoTime = Timeline.formatTimeCode(Math.ceil(1000 * clip.start) / 1000); // Round up to next millisecond to be safely in the clip.
						timeSource = ytStreamEnd;
					}
					if (realTime && videoTime && timeSource) {
						video.addAnchorTime(realTime.toISOString().substring(8, 19) + "-00", videoTime, timeSource);
					}
				}
			}
		}
	}

	/** @inheritdoc */
	spawnEmbededPlayer(videoTime) {
		return new EmbeddedYouTubePlayer(this, videoTime, this.#id);
	}
}

/**
 * A TikTok video.
 */
export class TikTokVideo extends Video {
	/** The TikTok channel this video was posted on. */
	#channelId;
	/** The TikTok video ID within the channel. */
	#videoId;

	/**
	 * Creates a new TikTok video on a timeline.
	 * @param {Timeline} timeline The timeline this video will be added to.
	 * @param {string} channelId TikTok channel ID.
	 * @param {string} videoId TikTok video ID.
	 * @param {string} title TikTok video title.
	 * @param {number} duration Video duration in seconds.
	 * @param {number} fps Video frame rate.
	 * @param {Camera|Person} cameraOrOwner Camera used to film this video or owner of the camera if unknown, if a single camera was used to film all of it.
	 * @param {string} publishTime Publish date of this video.
	 */
	constructor(timeline, channelId, videoId, title, duration, fps, cameraOrOwner, publishTime) {
		super(timeline, title, duration, fps, cameraOrOwner);
		this.#channelId = channelId;
		this.#videoId = videoId;
		super.publishTime = publishTime;
	}

	/**
	 * @param {number} seconds Seconds into the video. (Ignored by TikTok.)
	 * @param {number} duration Duration of the segment to be played back in seconds. (Ignored by TikTok.)
	 * @returns A URL that opens the video in TikTok.
	 */
	getUrlForTime(seconds, duration) {
		return `https://www.tiktok.com/@${this.#channelId}/video/${this.#videoId}`;
	}

	/** @inheritdoc */
	spawnEmbededPlayer(videoTime) {
		return new EmbeddedTikTokPlayer(this, videoTime, this.#channelId, this.#videoId);
	}
}

/**
 * Unedited video file uploads from MCToon’s camera. This DJI OSMO Action 5 Pro writes a start frame timecode into the file,
 * which provides accuracy down to 33.4 ms, but there are caveats with it. The camera splits files at 16 GiB and in places where
 * this happened - like sitting in the restaurant or recording an entire flight - we can already see that earlier segments are
 * longer than the delta between their start timecode and the start timecode of the next segments in the sequence.
 * An averaging over 15 files that were too long, suggests that a video's runtime is ~1.00006x longer than the pacing of the
 * frame timecode. (That is ~214 ms per hour or ~5.13 seconds a day.)
 * To complicate matters using an iPhone clock visible in the videos as reference, it seems that the camera's frame time clock
 * runs ~1.00004x faster than the iPhone, which syncs with NTP servers and GPS.
 */
export class MCToonDjiUpload extends Video {
	/** MCToon’s action camera that was used to record these videos. Needs to be set externally. @type {Camera} */
	static camera;
	/** All the clips created from videos of this class in order. @type {Clip[]} */
	static #allClips = [];
	/** File name without path or extension. */
	#fileName;
	/** Date of recording according to the metadata (drop frame time-code) of the video. */
	#frameTimer;

	/**
	 * Creates a new archive.org video on a timeline.
	 * @param {Timeline} timeline The timeline this video will be added to.
	 * @param {string} fileName File name without extension.
	 * @param {string} frameTimer QuickTime time code from MediaInfo or ffprobe.
	 * @param {number} duration Video duration in seconds (from debug info).
	 * @param {string} [title] Title.
	 */
	constructor(timeline, fileName, frameTimer, duration, title) {
		if (MCToonDjiUpload.camera === undefined) throw new Error("Camera not yet set.");
		super(timeline, title ?? fileName, duration, NTSC30, MCToonDjiUpload.camera);
		this.#fileName = fileName;
		// Convert the file name to a date, because the drop frame time-code only counts from midnight.
		let startTime = fileName.substring(4, 8) + "-" + fileName.substring(8, 10) + "-" + fileName.substring(10, 12) + "T";
		startTime += fileName.substring(12, 14) + ":" + fileName.substring(14, 16) + ":" + fileName.substring(16, 18) + "Z";
		const fileNameDate = new Date(startTime);
		// Parse drop-frame timecode
		const tcHours = Number.parseInt(frameTimer.substring(0, 2));
		const tcTens = Number.parseInt(frameTimer.substring(3, 4));
		const tcOnes = Number.parseInt(frameTimer.substring(4, 5));
		const tcSecs = Number.parseInt(frameTimer.substring(6, 8));
		const tcFrames = Number.parseInt(frameTimer.substring(9, 11));
		const framesSinceMidnight = (tcHours * 6 + tcTens) * (18000 - 18) + (tcOnes * 60 + tcSecs) * 30 + tcFrames - 2 * tcOnes;
		const msSinceMidnight = framesSinceMidnight * 1001 / 30;
		const days = Math.round((fileNameDate.valueOf() - msSinceMidnight) / (1000 * 3600 * 24)) * 1000 * 3600 * 24;
		this.#frameTimer = new Date(days + msSinceMidnight + 6 * 3600000);
		// Create single clip
		const clip = this.createClip().enableAutoDuration();
		if (MCToonDjiUpload.#allClips.length > 0) {
			Clip.orderClips(MCToonDjiUpload.#allClips[MCToonDjiUpload.#allClips.length - 1], clip);
		}
		MCToonDjiUpload.#allClips.push(clip);
	}

	/** @returns The video recording date according to the file name data and the metadata time-code. */
	get frameTimer() {
		return this.#frameTimer;
	}

	/**
	 * Fixes all video from this camera to their recording date based on the date from the file name and the time from the
	 * metadata time-code. The clock drift is calculated from 2 videos in which MCToon’s iPhone is seen flipping the clock
	 * from one minute to the next and seems to be 112.5 frames per day. This clock drift is taken into account.
	 */
	static calculateTimeDrift() {
		const firstActualStart = new Date("2024-12-09T23:43:00Z");
		const firstCameraStart = new Date("2024-12-09T00:00:00-06:00").valueOf() + (1903093 + 11907) * 1001000 / 30000;
		const firstDeltaMs = firstCameraStart.valueOf() - firstActualStart.valueOf();
		const addedDriftPerDay = 118;
		const framesPerDayNom = 24 * 3600 * 30000;
		const framesPerDayDen = 1001;
		const driftFactor = (framesPerDayNom + addedDriftPerDay * framesPerDayDen) / framesPerDayNom;
		const driftFraction = (addedDriftPerDay * framesPerDayDen) / framesPerDayNom;
		const startDate = new Date(firstActualStart.valueOf() - firstDeltaMs / driftFraction);
		const djiTimeSource = new TimeSource("the daily frame counter in MCToon's chest cam (compensated for clock drift)", -1000, +1000);
		let lastActualStart;
		for (let i = this.#allClips.length - 1; i >= 0; i--) {
			const clip = this.#allClips[i];
			if (clip.video instanceof MCToonDjiUpload) {
				const actualStart = new Date((clip.video.#frameTimer.valueOf() - startDate.valueOf()) / driftFactor + startDate.valueOf());
				clip.video.addAnchorTime(actualStart, "00:00:00.000", djiTimeSource);
				if (lastActualStart) {
					const maxDuration = (lastActualStart.valueOf() - actualStart.valueOf()) / 1000;
					if (clip.duration > maxDuration) {
						clip.duration = maxDuration;
					}
				}
				lastActualStart = actualStart;
			}
		}
	}

	/**
	 * @param {number} seconds Seconds into the video. (Ignored by Archive.org.)
	 * @param {number} duration Duration of the segment to be played back in seconds. (Ignored by Archive.org.)
	 * @returns A URL that opens the video on Archive.org.
	 */
	getUrlForTime(seconds, duration) {
		return `https://archive.org/details/${this.title}`;
	}

	/** @inheritdoc */
	spawnEmbededPlayer(videoTime) {
		return new EmbeddedHtmlVideoPlayer(this, videoTime, `https://archive.org/download/${this.title}/${this.#fileName}.mp4`);
	}
}