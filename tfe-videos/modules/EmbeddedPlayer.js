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
 * A YouTube embed.
 */
export class EmbeddedYouTubePlayer extends EmbeddedPlayer {
	static #apiReady = false;
	#element;
	#player;
	#playerReady;
	#videoTime;
	#seekPending;
	#seeking;
	#lastSeekPosition;

	/**
	 * @param {Video} video The video to create the player for.
	 * @param {number} videoTime The time in seconds into the video.
	 * @param {string} id The YouTube video ID.
	 */
	constructor(video, videoTime, id) {
		super(video.getClipAtTime(videoTime));
		this.#element = document.createElement("iframe");
		this.#element.allowFullscreen = true;
		this.#element.width = "640px";
		this.#element.height = "360px";
		let origin = document.baseURI;
		origin = origin.substring(0, origin.indexOf("/", 8));
		this.#element.src = `https://www.youtube.com/embed/${id}?enablejsapi=1&autoplay=1&start=${videoTime}&origin=${origin}`;
		this.#playerReady = false;
		this.#videoTime = videoTime;
		this.#seekPending = true;
		this.#seeking = false;
		if (EmbeddedYouTubePlayer.#apiReady) {
			// @ts-ignore
			this.#player = new YT.Player(this.#element, {
				events: {
					"onReady": (event) => {
						this.#playerReady = true;
						if (this.#seekPending) {
							this.seek(this.#videoTime);
						}
					},
					"onStateChange": (event) => {
						if (event.data === 1 && this.#seeking) {
							this.#player.pauseVideo();
							this.#player.seekTo(this.#videoTime, true);
							this.#player.unMute();
							this.#lastSeekPosition = this.#videoTime;
							this.#seeking = false;
						}
					},
				}
			});
		}
	}

	static apiReady() {
		EmbeddedYouTubePlayer.#apiReady = true;
	}

	/** @inheritdoc */
	get element() {
		return this.#element;
	}

	/** @inheritdoc */
	close() {
		this.#player?.destroy();
	}

	/** @inheritdoc */
	seek(videoTime) {
		if (videoTime === this.#lastSeekPosition) {
			return;
		}
		this.#videoTime = videoTime;
		if (this.#playerReady) {
			this.#player.mute();
			this.#player.seekTo(videoTime, true);
			this.#lastSeekPosition = this.#videoTime;
			this.#seeking = true;
		}
		else {
			this.#seekPending = true;
		}
	}
}

/**
 * A TikTop embed.
 */
export class EmbeddedTikTokPlayer extends EmbeddedPlayer {
	#element;

	/**
	 * @param {Video} video The video to create the player for.
	 * @param {number} videoTime The time in seconds into the video.
	 * @param {string} channelId The content creator’s channel name.
	 * @param {string} videoId The TikTok video ID.
	 */
	constructor(video, videoTime, channelId, videoId) {
		super(video.getClipAtTime(videoTime));
		this.#element = document.createElement("iframe");
		this.#element.src = `https://www.tiktok.com/player/v1/${videoId}?rel=0`;
		this.#element.width = "640px";
		this.#element.height = "360px";
	}

	/** @inheritdoc */
	get element() {
		return this.#element;
	}

	/** @inheritdoc */
	close() {
		this.#element.src = "";
	}

	/** @inheritdoc */
	seek(videoTime) {
		this.#element.contentWindow?.postMessage({type: "seekTo", value: videoTime, "x-tiktok-player": true}, '*');
	}
}

/**
 * A basic HTML5 embedded video player.
 */
export class EmbeddedHtmlVideoPlayer extends EmbeddedPlayer {
	#element;

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