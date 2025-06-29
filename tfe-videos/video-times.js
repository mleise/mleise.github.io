// @ts-check

import { timeline, peeps } from "./data.js";
import { DATE_FORMAT_UGC_TIMECODE } from "./modules/Timeline.mjs";

/**
 * @param {string} value Timecode string.
 * @returns A time in milliseconds from a provided timecode.
 */
function parseTimecode(value) {
	const parts = value.split(",");
	return Date.parse(parts[0] + " 2024," + parts[1] + " GMT-0300");
}

/** Re-centers the timeline on the playhead. */
function centerOnPlayhead() {
	const container = document.getElementById("svgContainer");
	if (container) {
		container.scrollLeft = (timeline.trackerMs - timeline.minTimeMs) / timeline.zoomLevel - container.clientWidth / 2;
	}
}

/** Verifies that the entered timecode is valid and enables the "Go" button if so. */
export function validateTimecode() {
	const timecodeTxt = document.getElementById("timecode");
	if (timecodeTxt instanceof HTMLInputElement) {
		const dateMs = parseTimecode(timecodeTxt.value);
		const dateValid = dateMs >= timeline.minTimeMs && dateMs <= timeline.maxTimeMs;
		timecodeTxt.style.borderColor = dateValid ? "inherit" : "red";
		const timecodeGoBtn = document.getElementById("timecodeGo");
		if (timecodeGoBtn instanceof HTMLButtonElement) {
			timecodeGoBtn.disabled = !dateValid;
		}
	}
}

/** Jumps directly to the entered timecode. */
export function jumpToTimecode() {
	const timecodeTxt = document.getElementById("timecode");
	if (timecodeTxt instanceof HTMLInputElement) {
		timeline.trackerMs = parseTimecode(timecodeTxt.value);
	}
	centerOnPlayhead();
}

/** Enables/disables the jump back/forward buttons depending on whether there is enough time for the jump. */
export function checkJumpInterval() {
	const jumpIntervalLst = document.getElementById("jumpInterval");
	if (jumpIntervalLst instanceof HTMLSelectElement) {
		const jumpMs = Number.parseInt(jumpIntervalLst.value) * 1000;
		const jumpBackBtn = document.getElementById("jumpBack");
		if (jumpBackBtn instanceof HTMLButtonElement) {
			jumpBackBtn.disabled = timeline.trackerMs - jumpMs < timeline.minTimeMs;
		}
		const jumpFwdBtn = document.getElementById("jumpFwd");
		if (jumpFwdBtn instanceof HTMLButtonElement) {
			jumpFwdBtn.disabled = timeline.trackerMs + jumpMs > timeline.maxTimeMs;
		}
	}
}

/** Jumps forwards in time by the selected amount. */
export function jumpFwd() {
	const jumpIntervalLst = document.getElementById("jumpInterval");
	if (jumpIntervalLst instanceof HTMLSelectElement) {
		const jumpMs = Number.parseInt(jumpIntervalLst.value) * 1000;
		timeline.trackerMs += jumpMs;
	}
	centerOnPlayhead();
}

/** Jumps backwards in time by the selected amount. */
export function jumpBack() {
	const jumpIntervalLst = document.getElementById("jumpInterval");
	if (jumpIntervalLst instanceof HTMLSelectElement) {
		const jumpMs = Number.parseInt(jumpIntervalLst.value) * 1000;
		timeline.trackerMs -= jumpMs;
	}
	centerOnPlayhead();
}

/** @returns A filter function for clips based on the selected options. */
function getClipFilter() {
	let categoryFilter = (clip) => false;
	const clipCategoryLst = document.getElementById("clipCategory");
	if (clipCategoryLst instanceof HTMLSelectElement) {
		switch (clipCategoryLst.value) {
			case "all":
				categoryFilter = () => true;
				break;
			case "personal":
				categoryFilter = (clip) => (clip.camera ? clip.camera.isPersonal : true);
				break;
			case "live":
				categoryFilter = (clip) => clip.video.isLive;
				break;
			case "static":
				categoryFilter = (clip) => !(clip.camera ? clip.camera.isPersonal : true);
				break;
			case "timelapse":
				categoryFilter = (clip) => clip.timeLapseRate != 1;
				break;
		}
	}
	let ownerFilter = (clip) => false;
	const cameraOwnerLst = document.getElementById("cameraOwner");
	if (cameraOwnerLst instanceof HTMLSelectElement) {
		switch (cameraOwnerLst.value) {
			case "anyone":
				ownerFilter = () => true;
				break;
			default: // Assume this is a person
				ownerFilter = (clip) => clip.owner === peeps[cameraOwnerLst.value];
		}
	}
	return (clip) => {
		return categoryFilter(clip) && ownerFilter(clip);
	};
}

/** Enables/disables previous and next clip buttons if no further clips match the current filter. */
export function checkClipCategory() {
	const filter = getClipFilter();
	const prevClipBtn = document.getElementById("prevClipBtn")
	if (prevClipBtn instanceof HTMLButtonElement) {
		prevClipBtn.disabled = timeline.getFirstClipBefore(timeline.trackerMs, filter) === undefined;
	}
	const nextClipBtn = document.getElementById("nextClipBtn")
	if (nextClipBtn instanceof HTMLButtonElement) {
		nextClipBtn.disabled = timeline.getFirstClipAfter(timeline.trackerMs, filter) === undefined;
	}
}

/** Jump to previous clip of a type and person. */
export function jumpToPrevClip() {
	const filter = getClipFilter();
	const clip = timeline.getFirstClipBefore(timeline.trackerMs, filter);
	if (clip) {
		timeline.selectedClip = clip;
		timeline.trackerMs = clip.startTimeAvgMs;
	}
	centerOnPlayhead();
}

/** Jump to next clip of a type and person. */
export function jumpToNextClip() {
	const filter = getClipFilter();
	const clip = timeline.getFirstClipAfter(timeline.trackerMs, filter);
	if (clip) {
		timeline.selectedClip = clip;
		timeline.trackerMs = clip.startTimeAvgMs;
	}
	centerOnPlayhead();
}

export function closePopupWindow() {
	const popup = document.getElementById("popup-background");
	if (popup) popup.style.display = "none";
}

export function showClipInfo() {
	const popup = document.getElementById("popup-background");
	if (popup) popup.style.display = "block";
}

export function openClipLink() {
	if (timeline.selectedClip) {
		window.open(timeline.selectedClip.url);
	}
}

/** Zoom in button functionality. */
export function zoomIn() {
	const container = document.getElementById("svgContainer");
	if (container) {
		timeline.zoom(0.5 * container.clientWidth + container.scrollLeft, -108);
	}
}

/** Zoom out button functionality. */
export function zoomOut() {
	const container = document.getElementById("svgContainer");
	if (container) {
		timeline.zoom(0.5 * container.clientWidth + container.scrollLeft, +108);
	}
}

timeline.onTimecodeUpdate = () => {
	const timecodeNode = document.getElementById("timecode");
	if (timecodeNode instanceof HTMLInputElement) {
		timecodeNode.value = DATE_FORMAT_UGC_TIMECODE.format(timeline.trackerMs);
	}

	checkJumpInterval();
	checkClipCategory();
}

timeline.process();

if (typeof window !== "undefined") {
	const container = document.getElementById("svgContainer");
	if (container) {
		window.onresize = () => {
			timeline.updateZoom();
		}
		const svg = timeline.produceSvg(container, false);
		container.appendChild(svg);
		container.scrollLeft = (timeline.trackerMs - timeline.minTimeMs) / timeline.zoomLevel - container.clientWidth / 2;
	}

	const cameraOwnerLst = document.getElementById("cameraOwner");
	if (cameraOwnerLst instanceof HTMLSelectElement) {
		for (const person in peeps) {
			const option = document.createElement("option");
			option.value = person;
			option.innerText = peeps[person].toString();
			cameraOwnerLst.appendChild(option);
		}
	}

	timeline.onTimecodeUpdate();
}
