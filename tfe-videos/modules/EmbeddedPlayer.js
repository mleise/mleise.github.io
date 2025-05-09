// @ts-check

import { Clip } from "./Clip.js";
import { Video } from "./Video.js";

/**
 * An embedded video player base class.
 */
export class EmbeddedPlayer {
	#clip;

	/**
	 * @param {Clip} clip The clip to create a player for.
	 */
	constructor(clip) {
		this.#clip = clip;
	}

	/**
	 * @returns The video associated with the clip for this player.
	 */
	get video() {
		return this.#clip.video;
	}

	/**
	 * @returns The clip that this player was created for.
	 */
	get clip() {
		return this.#clip;
	}

	/**
	 * @returns {HTMLElement} The HTML element for this player to place it on a web site.
	 */
	get element() {
		throw new Error("Not implemented!");
	}

	/**
	 * Stops loading the video and closes it.
	 */
	close() {}

	/**
	 * Seeks to a second in the video.
	 * @param {number} videoTime Time in the video to seek to.
	 */
	seek(videoTime) {}
}

/**
 * A basic HTML5 embedded video player.
 */
export class EmbeddedHtmlVideoPlayer extends EmbeddedPlayer {
	#element

	/**
	 * @param {Video} video The video to create the player for.
	 * @param {number} videoTime The time in seconds into the video.
	 * @param {string} src The video source URL.
	 */
	constructor(video, videoTime, src) {
		super(video.getClipAtTime(videoTime));
		this.#element = document.createElement("video");
		this.#element.width = 640;
		this.#element.height = 360;
		this.#element.preservesPitch = true;
		this.#element.controls = true;
		this.#element.currentTime = videoTime;
		this.#element.src = src;
	}

	/** @inheritdoc */
	get element() {
		return this.#element;
	}

	/** @inheritdoc */
	close() {
		this.#element.src = "";
		this.#element.load();
	}

	/** @inheritdoc */
	seek(videoTime) {
		this.#element.currentTime = videoTime;
	}
}