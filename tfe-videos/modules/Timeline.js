// @ts-check

import { Camera } from "./Camera.js";
import { Clip } from "./Clip.js";
import { Person } from "./Person.js";
import { SyncPoint } from "./SyncPoint.js";
import { TimelineEvent } from "./TimelineEvent.js";
import { MCToonDjiUpload, Video, YouTubeVideo } from "./Video.js";

/** Milliseconds to an hour. */
const MS_PER_HOUR = 60 * 60 * 1000;
/** Milliseconds to a day. */
const MS_PER_DAY = 24 * MS_PER_HOUR;
/** Formats the day portion of {@link Date} in the Union Glacier time zone for a header. */
const DATE_FORMAT_HEADER = new Intl.DateTimeFormat("en-US", { timeZone: "Etc/GMT+3", dateStyle: "medium" });
/** Formats a {@link Date} in the Union Glacier time zone for a tooltip. */
export const DATE_FORMAT_UGC_TOOLTIP = new Intl.DateTimeFormat("en-US", { timeZone: "Etc/GMT+3", dateStyle: "short", timeStyle: "medium" });
/** Formats a {@link Date} in the Union Glacier time zone for a detailed reading down to the millisecond. */
export const DATE_FORMAT_UGC_DETAILED = new Intl.DateTimeFormat("en-US", { timeZone: "Etc/GMT+3", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit", fractionalSecondDigits: 3 });

/**
 * The timeline is what all {@link Video} {@link Clip}s are placed on.
 */
export class Timeline {
	/** All videos created for this timeline. @type {Video[]} */
	#videos;
	/** All clips placed on this timeline. @type {Clip[]} */
	#clips;
	/** Links in time between different timestamps in videos. @type {SyncPoint[]} */
	#syncPoints;
	/** Interesting events that happened during the trip. @type {TimelineEvent[]} */
	#events;
	/** Current zoom level of for the timeline. */
	#zoom;
	/** @type {number} */
	#minTimeMs;
	/** @type {number} */
	#maxTimeMs;
	/** @type {number} */
	#rowsNeeded;
	/** @type {SVGSVGElement} */
	#svg;

	constructor() {
		this.#videos     = [];
		this.#clips      = [];
		this.#syncPoints = [];
		this.#events     = [];
		this.#zoom       = NaN;
		this.#minTimeMs  = +Infinity;
		this.#maxTimeMs  = -Infinity;
		this.#rowsNeeded = 0;
	}

	/**
	 * Returns a video time code string like `01:23:45.678` from a number in seconds.
	 * @param {number} timeCode Time code in seconds.
	 * @returns {string} The time code string.
	 */
	static formatTimeCode(timeCode) {
		return new Date(1000 * timeCode).toISOString().substring(11, 23);
	}

	/**
	 * Adds a video to the timeline.
	 * @param {Video} video The video to be added.
	 */
	addVideo(video) {
		this.#videos.push(video);
	}

	/**
	 * Adds a video clip to the timeline.
	 * @param {Clip} clip The video clip to be added.
	 */
	addSegment(clip) {
		this.#clips.push(clip);
	}

	/**
	 * Adds an event symbol to the timeline.
	 * @param {Date|string} date Date (or shortened date string), time of event.
	 * @param {string} name Name or title of the event.
	 * @param {string} symbol Unicode emoji that represents the event on the timeline.
	 */
	addEvent(date, name, symbol) {
		this.#events.push(new TimelineEvent(date instanceof Date ? date : new Date("2024-12-" + date), name, symbol));
	}

	/**
	 * Establishes the timelapse rate of a {@link Video} {@link Clip} using two synched up timestamps in a reference video playing at normal speed.
	 * @param {Video} video1 The video containing the sped up clip.
	 * @param {string} time1a The first timestamp in the sped up video.
	 * @param {string} time1b The second timestamp in the sped up video.
	 * @param {Video} video2 The video containing the clip playing at a normal rate.
	 * @param {string} time2a The first timestamp in the normal video.
	 * @param {string} time2b The second timestamp in the normal video.
	 */
	establishTimelapseRate(video1, time1a, time1b, video2, time2a, time2b) {
		const time1aNum = video1.parseVideoTime(time1a);
		const time1bNum = video1.parseVideoTime(time1b);
		const time2aNum = video2.parseVideoTime(time2a);
		const time2bNum = video2.parseVideoTime(time2b);
		const clip1a = video1.getClipAtTime(time1aNum);
		const clip1b = video1.getClipAtTime(time1bNum);
		const clip2a = video2.getClipAtTime(time2aNum);
		const clip2b = video2.getClipAtTime(time2bNum);
		if (clip1a !== clip1b) throw new Error("Clips at time A and B in the first video are not identical.");
		if (clip1a.timelapseRate !== undefined) throw new Error("First clip must be the one with unset timelapse rate.");
		if (clip2a !== clip2b) throw new Error("Clips at time A and B in the second video are not identical.");
		if (clip2a.timelapseRate !== 1) throw new Error("Second clip must be the one with a timelapse rate of 1.");
		clip1a.setTimelapseRate((time2bNum - time2aNum) / (time1bNum - time1aNum));
		this.addSyncPoint(video1, time1a, video2, time2a);
	}

	/**
	 * Declares that two videos show the same moment at the given respective times.
	 * @param {Video} video1 Video 1.
	 * @param {string|number} time1 Time code in video 1 as a string in HH:mm:ss.sss format or number in seconds.
	 * @param {Video} video2 Video 2.
	 * @param {string|number} time2 Time code in video 2 as a string in HH:mm:ss.sss format or number in seconds.
	 * @param {number} [tolerance=0] If the sync isn't perfect, state the tolerance (+/-) in seconds here.
	 * @param {number} [deltaMs=0] Time in milliseconds between the event in the first video and the second video. Used to set video clips apart by a known amount of time. Defaults to 0.
	 * @returns {SyncPoint} The added sync point.
	 */
	addSyncPoint(video1, time1, video2, time2, tolerance = 0, deltaMs = 0) {
		time1 = typeof time1 === "number" ? time1 : video1.parseVideoTime(time1);
		time2 = typeof time2 === "number" ? time2 : video2.parseVideoTime(time2);
		const syncPoint = new SyncPoint(video1, time1, video2, time2, tolerance, deltaMs);
		this.#syncPoints.push(syncPoint);
		this.#applySyncPoint(syncPoint, syncPoint.getClip(0), syncPoint.getClip(1));
		return syncPoint;
	}

	/**
	 * Declares that points in two videos are a certain time apart.
	 * @param {Video} video1 
	 * @param {string|number} time1 Time code in video 1 as a string in HH:mm:ss.sss format or number in seconds.
	 * @param {Video} video2 
	 * @param {string|number} time2 Time code in video 2 as a string in HH:mm:ss.sss format or number in seconds.
	 * @param {number} days Full days from `time1` to `time2`.
	 * @param {number} hours Full hours from `time1` to `time2`.
	 * @param {number} minutes Full minutes from `time1` to `time2`.
	 * @param {number} seconds Full seconds from `time1` to `time2`.
	 * @returns {SyncPoint} The added sync point.
	 */
	chronology(video1, time1, video2, time2, days, hours, minutes, seconds) {
		return this.addSyncPoint(video1, time1, video2, time2, 0, (((days * 24 + hours) * 60 + minutes) * 60 + seconds) * 1000);
	}

	/**
	 * Applies existing {@link SyncPoint}s pertaining to a given {@link Clip} that has been newly added or it’s start time dialed in more precisely.
	 * @param {Clip} clip The video clip.
	 */
	applySyncPoints(clip) {
		for (const syncPoint of this.#syncPoints) {
			if (syncPoint.video1 === clip.video && clip.start <= syncPoint.time1 && clip.start + clip.duration > syncPoint.time1) {
				for (const clip2 of this.#clips) {
					if (syncPoint.video2 === clip2.video && clip2.start <= syncPoint.time2 && clip2.start + clip2.duration > syncPoint.time2) {
						this.#applySyncPoint(syncPoint, clip, clip2);
					}
				}
			}
			else if (syncPoint.video2 === clip.video && clip.start <= syncPoint.time2 && clip.start + clip.duration > syncPoint.time2) {
				for (const clip1 of this.#clips) {
					if (syncPoint.video1 === clip1.video && clip1.start <= syncPoint.time1 && clip1.start + clip1.duration > syncPoint.time1) {
						this.#applySyncPoint(syncPoint, clip1, clip);
					}
				}
			}
		}
	}
		
	/**
	 * Helper function that applies the effects of a {@link SyncPoint} to two {@link Clip}s.
	 * @param {SyncPoint} syncPoint The sync point object.
	 * @param {Clip} clip1 The clip found at the time stamp in the first video.
	 * @param {Clip} clip2 The clip found at the time stamp in the second video.
	 */
	#applySyncPoint(syncPoint, clip1, clip2) {
		if (clip1.timelapseRate !== undefined && clip2.timelapseRate !== undefined) {
			const clips = [ clip1, clip2 ];
			const times = [ syncPoint.time1, syncPoint.time2 ];
			const deltaMss = [ (syncPoint.time1 - clip1.start) * clip1.timelapseRate * 1000, (syncPoint.time2 - clip2.start) * clip2.timelapseRate * 1000 ];
			for (let i = 0; i < 2; i++) {
				const deltaSign = 2 * i - 1;
				if (clips[1-i].startTimeMinMs !== -Infinity) {
					clips[i].raiseStartTimeMinMs(clips[1-i].startTimeMinMs + deltaSign * syncPoint.deltaMs + deltaMss[1-i] - syncPoint.toleranceMs - deltaMss[i], `at ${Video.formatVideoTime(times[i] + deltaSign * syncPoint.deltaMs / 1000)} into its video, it matches ${Video.formatVideoTime(times[1-i])} in "${clips[1-i].video.title}" to an accuracy of ±${syncPoint.toleranceMs} ms, for which ${clips[1-i].startTimeMinReason}`);
				}
				if (clips[1-i].startTimeMaxMs !== +Infinity) {
					clips[i].lowerStartTimeMaxMs(clips[1-i].startTimeMaxMs + deltaSign * syncPoint.deltaMs + deltaMss[1-i] + syncPoint.toleranceMs - deltaMss[i], `at ${Video.formatVideoTime(times[i] + deltaSign * syncPoint.deltaMs / 1000)} into its video, it matches ${Video.formatVideoTime(times[1-i])} in "${clips[1-i].video.title}" to an accuracy of ±${syncPoint.toleranceMs} ms, for which ${clips[1-i].startTimeMaxReason}`);
				}
			}
		}
	}

	/**
	 * Searches all segments that are known (to a +/-10 minute accuracy) to run across a given date. The list of segments is printed to the JavaScritp console.
	 * @param {Date} date Data and time for which to print segments.
	 */
	printSegmentsForDate(date) {
		let foundOne = false;
		for (const seg of this.#clips) {
			if (seg.startTimeMinMs !== undefined && seg.startTimeMaxMs !== undefined && seg.startTimeMaxMs - seg.startTimeMinMs < 20 * 60 * 1000 && seg.timelapseRate) {
				const segStartTimeAvgMs = seg.startTimeAvgMs;
				const segEndTimeAvgMs = seg.endTimeAvgMs;
				if (date.valueOf() >= segStartTimeAvgMs && date.valueOf() < segEndTimeAvgMs) {
					if (!foundOne) {
						foundOne = true;
						console.log(`The following segments contain ${date}:`);
					}
					const videoTime = new Date((date.valueOf() - segStartTimeAvgMs) / seg.timelapseRate).toISOString().substring(11, 19);
					console.log(`  ${seg.video} at ${videoTime}`);
				}
			}
		}
		if (!foundOne) {
			console.log(`No segments are known to contain the date ${date}!`);
		}
	}

	process() {
		MCToonDjiUpload.calculateTimeDrift();
		YouTubeVideo.calculateStreamTimes();
		
		for (const clipA of this.#clips) {
			if (clipA.hasDefinedStartTimes) {
				for (let i = 0; i < clipA.succeedingClipCount; i++) {
					const clipB = clipA.getSucceedingClip(i);
					const overTime = clipA.endTimeAvgMs - clipB.startTimeAvgMs;
					if (overTime > 0) {
						//console.log(`${overTime} ms: ${clipA} -> ${clipB}`);
					}
				}
			}
		}

		/** @type Set<string> */
		const unfixable = new Set();
		unfixable.add("0:41.067 to 1:33.221 in tHere flafter mee ,a hhhomage tu meye bestee"); // MCFlatty drawing a passport (likely in the dining tent).
		unfixable.add("0:13.367 to 1:16.633 in The Final Experiment: The Final Day"); // MCToon walking through Punta Arenas, talking about police and having a flashback.
		unfixable.add("The Globe Predicts 24-Hour Sun AND 24-Hour Moon in Antarctica!"); // Will speaking about the 24h Moon the 1st time after his prerecorded video.
		unfixable.add("10:55.767 to 11:05.868 in THE FINAL EXPERIMENTS - South Celestial Pole"); // MCToon’s star trail footage from Punta Arenas.
		unfixable.add("11:10.667 to 11:18.267 in THE FINAL EXPERIMENTS - South Celestial Pole"); // Dave’s star trail footage from Punta Arenas.
		unfixable.add("16:40.16 to 16:50.08 in THE FINAL EXPERIMENTS - Sunrise & Sunset Direction"); // Will’s drone in the afernoon/evening filming monument, sunny.
		unfixable.add("16:56.08 to 17:04.4 in THE FINAL EXPERIMENTS - Sunrise & Sunset Direction"); // Will’s drone filming orange sculpture, overcast.

		console.log("Remaining clips are:");
		let skip = 0;
		for (let i = 0; i < this.#clips.length; i++) {
			const clip = this.#clips[i];
			if (clip.confidenceIntervalMs === Infinity && !unfixable.has(clip.toString())) {
				if (skip > 0) {
					skip--;
					continue;
				}
				console.log(clip.toString());
			}
		}

		for (const clip of this.#clips) {
			if (clip.hasDefinedStartTimes) {
				if (this.#minTimeMs === +Infinity || (clip.startTimeMinMs !== undefined && this.#minTimeMs > clip.startTimeMinMs)) {
					this.#minTimeMs = clip.startTimeMinMs;
				}
				if (this.#maxTimeMs === -Infinity || (clip.endTimeMaxMs !== undefined && this.#maxTimeMs < clip.endTimeMaxMs)) {
					this.#maxTimeMs = clip.endTimeMaxMs;
				}
			}
		}
		if (this.#minTimeMs === +Infinity || this.#maxTimeMs === -Infinity) {
			throw new Error("Could not determine a time frame for the trip for rendering the SVG timeline");
		}

		/** @type {Map<Person,Map<Camera?,Clip[][]>>} */
		const clipsByOwner = new Map();
		for (const clip of this.#clips) {
			if (clip.hasDefinedStartTimes) {
				let tmp1 = clipsByOwner.get(clip.owner);
				if (tmp1 === undefined) {
					tmp1 = new Map();
					clipsByOwner.set(clip.owner, tmp1);
				}
				let tmp2 = tmp1.get(clip.camera ?? null);
				if (tmp2 === undefined) {
					tmp2 = [[]];
					tmp1.set(clip.camera ?? null, tmp2);
				}
				tmp2[0].push(clip);
			}
		}
		for (const tmp1 of clipsByOwner.values()) {
			for (const tmp2 of tmp1.values()) {
				tmp2[0].sort(function(a, b) {
					return a.startTimeAvgMs - b.startTimeAvgMs;
				});
			}
		}
		this.#rowsNeeded = 0;
		for (const tmp1 of clipsByOwner.values()) {
			for (const tmp2 of tmp1.values()) {
				let level = 0;
				while (true) {
					let escalate = [];
					tmp2[level][0].timelineRow = this.#rowsNeeded;
					for (let i = 1; i < tmp2[level].length; i++) {
						if (tmp2[level][i-1].endTimeAvgMs > tmp2[level][i].startTimeAvgMs) {
							escalate.push(tmp2[level][i]);
							tmp2[level].splice(i--, 1);
						}
						else {
							tmp2[level][i].timelineRow = this.#rowsNeeded;
						}
					}
					this.#rowsNeeded++;
					if (escalate.length == 0) {
						break;
					}
					tmp2.push(escalate);
					level++;
				}
			}
		}
	}

	/**
	 * 
	 * @param {HTMLElement} parent The HTML element that is serving as the parent node for the SVG.
	 * @returns 
	 */
	produceSvg(parent) {
		if (!(this.#minTimeMs < this.#maxTimeMs)) {
			throw new Error("Before rendering the timeline, the start and end date need to be determined.");
		}
		
		if (Number.isNaN(this.#zoom)) {
			this.#zoom = (this.#maxTimeMs - this.#minTimeMs) / parent.clientWidth * 0.25;
		}
		this.#svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
		this.#svg.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
		this.#svg.setAttribute("style", "background-color:#333333");
		this.#svg.onwheel = (event) => {
			const scrollTimeMs = parent.scrollLeft * this.#zoom + this.#minTimeMs;
			const mouseTimeMs = event.offsetX * this.#zoom + this.#minTimeMs;
			let scrollDelta = (mouseTimeMs - scrollTimeMs) / this.#zoom;
			const oldSvg = this.#svg;
			this.#zoom = Math.min(Math.max(this.#zoom * Math.pow(1.007, event.deltaY), 1000), (this.#maxTimeMs - this.#minTimeMs) / parent.clientWidth);
			scrollDelta *= this.#zoom;
			const newSvg = this.produceSvg(parent);
			parent.replaceChild(newSvg, oldSvg);
			parent.scrollTo(mouseTimeMs - scrollDelta, 0);
		};

		const rowHeight = 1;
		for (const clip of this.#clips) {
			if (clip.hasDefinedStartTimes) {
				const capA = document.createElementNS("http://www.w3.org/2000/svg", "line");
				const capB = document.createElementNS("http://www.w3.org/2000/svg", "line");
				const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
				const width = clip.realTimeDurationMs / this.#zoom;
				const x1 = (clip.startTimeMinMs - this.#minTimeMs) / this.#zoom;
				capA.setAttribute("x1", `${x1}px`);
				capA.setAttribute("x2", `${x1}px`);
				line.setAttribute("x1", `${x1}px`);
				const x2 = (clip.startTimeMaxMs + clip.realTimeDurationMs - this.#minTimeMs) / this.#zoom;
				capB.setAttribute("x1", `${x2}px`);
				capB.setAttribute("x2", `${x2}px`);
				line.setAttribute("x2", `${x2}px`);
				const y = rowHeight * (3.5 + clip.timelineRow);
				line.setAttribute("y1", `${y}em`);
				line.setAttribute("y2", `${y}em`);
				capA.setAttribute("y1", `${y - 0.3 * rowHeight}em`);
				capB.setAttribute("y1", `${y - 0.3 * rowHeight}em`);
				capA.setAttribute("y2", `${y + 0.3 * rowHeight}em`);
				capB.setAttribute("y2", `${y + 0.3 * rowHeight}em`);
				const dasharray = `${0.2 * rowHeight}em,${0.2 * rowHeight}em`;
				const color = "#101010";
				line.setAttribute("stroke", color);
				capA.setAttribute("stroke", color);
				capB.setAttribute("stroke", color);
				line.setAttribute("stroke-dasharray", dasharray);
				line.setAttribute("stroke-dashoffset", `${0.1 * rowHeight}em`);
				this.#svg.appendChild(line);
				this.#svg.appendChild(capA);
				this.#svg.appendChild(capB);
			}
		}
		for (const clip of this.#clips) {
			if (clip.hasDefinedStartTimes) {
				const a = document.createElementNS("http://www.w3.org/2000/svg", "a");
				a.setAttribute("href", clip.url);
				const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
				const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
				title.innerHTML = clip.tooltip;
				rect.appendChild(title);
				const width = clip.realTimeDurationMs / this.#zoom;
				const x = (clip.startTimeAvgMs - this.#minTimeMs) / this.#zoom;
				const y = rowHeight * (3 + clip.timelineRow);
				rect.setAttribute("x", `${x}px`);
				rect.setAttribute("y", `${y}em`);
				rect.setAttribute("width", `${width}px`);
				rect.setAttribute("height", `${rowHeight}em`);
				rect.setAttribute("style", `fill:${clip.timelineColor};stroke-width:1px;stroke:black`);
				a.appendChild(rect);
				this.#svg.appendChild(a);
			}
		}

		const offsetMs = -3 * MS_PER_HOUR;
		const firstDayMarkerMs = Math.ceil((this.#minTimeMs + offsetMs) / MS_PER_DAY) * MS_PER_DAY - offsetMs;
		const numDayMarkers = Math.floor((this.#maxTimeMs + offsetMs) / MS_PER_DAY) - Math.ceil((this.#minTimeMs + offsetMs) / MS_PER_DAY) + 1;
		for (let i = 0; i < numDayMarkers; i++) {
			const dayMs = firstDayMarkerMs + i * MS_PER_DAY;
			const x = (dayMs - this.#minTimeMs) / this.#zoom;
			const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
			line.setAttribute("x1", `${x}px`);
			line.setAttribute("x2", `${x}px`);
			line.setAttribute("y1", "0em");
			line.setAttribute("y2", `${(3 + this.#rowsNeeded) * rowHeight}em`);
			line.setAttribute("stroke", "white");
			this.#svg.prepend(line);
			const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
			text.setAttribute("style", `font:italic ${rowHeight}em serif;fill:white`);
			text.setAttribute("x", `${x + 0.2}px`);
			text.setAttribute("y", `${rowHeight * 0.85}em`);
			text.setAttribute("cursor", "default");
			text.innerHTML = DATE_FORMAT_HEADER.format(new Date(dayMs));
			this.#svg.prepend(text);
		}

		for (const event of this.#events) {
			const x = (event.date.valueOf() - this.#minTimeMs) / this.#zoom;
			const a = document.createElementNS("http://www.w3.org/2000/svg", "a");
			const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
			title.innerHTML = event.name + "\n" + DATE_FORMAT_UGC_TOOLTIP.format(event.date);
			a.appendChild(title);
			const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
			text.setAttribute("font-size-adjust", "0.9");
			text.setAttribute("text-anchor", "middle");
			text.setAttribute("x", `${x}px`);
			text.setAttribute("y", `${rowHeight * 2.6}em`);
			text.setAttribute("cursor", "default");
			text.innerHTML = event.symbol;
			a.appendChild(text);
			this.#svg.appendChild(a);
			const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
			line.setAttribute("x1", `${x}px`);
			line.setAttribute("x2", `${x}px`);
			line.setAttribute("y1", `${3 * rowHeight}em`);
			line.setAttribute("y2", `${(3 + this.#rowsNeeded) * rowHeight}em`);
			line.setAttribute("stroke", "grey");
			line.setAttribute("stroke-dasharray", `${0.1 * rowHeight}em,${0.1 * rowHeight}em`);
			line.setAttribute("stroke-dashoffset", `${0.05 * rowHeight}em`);
			this.#svg.prepend(line);
		}

		this.#svg.setAttribute("width", `${(this.#maxTimeMs - this.#minTimeMs) / this.#zoom}px`);
		this.#svg.setAttribute("height", `${rowHeight * (3 + this.#rowsNeeded) + 0.05}em`);
		return this.#svg;
	}
}