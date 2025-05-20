// @ts-check

/**
 * A sequence of actions that are to be run asynchronously.
 */
class CourseOfActions {
	/** Courses of actions with the same group number replace each other if multiple are queued. Useful for commands like `seekTo` which may be send frequently before the previous `seekTo` completes. */
	#group;
	/** The actions to be performed, in pairs of two. The first function is the actual action, while the second function is called before it to set up callbacks that test for the success of the action. */
	#actions;

	/**
	 * @param {number|undefined} group Courses of actions with the same group number replace each other if multiple are queued. Useful for commands like `seekTo` which may be send frequently before the previous `seekTo` completes.
	 * @param {Function[]} actions The actions to be performed, in pairs of two. The first function is the parameter-less action, while the second function is called before it to set up callbacks that test for the success of the action.
	 * It takes a success callback as its only argument which itself takes a `boolean` as its argument. Calling this callback with `true` continues the sequence, `false` aborts it.
	 */
	constructor(group, actions) {
		this.#group = group;
		this.#actions = actions;
	}

	/** @returns The group of this courses of actions. When they have the same group number, they replace each other if multiple are queued. */
	get group() {
		return this.#group;
	}

	/**
	 * @param {number} i Index of the action to be returned.
	 * @returns The action at index `i`, which is every even index of the original callback array passed in the constructor.
	 */
	getAction(i) {
		return this.#actions[2 * i];
	}

	/**
	 * @param {number} i Index of the success callback to be returned.
	 * @returns The success callback at index `i`, which is every odd index of the original callback array passed in the constructor.
	 */
	getSuccess(i) {
		return this.#actions[2 * i + 1];
	}

	/**
	 * Marks the first action & success callback as completed and removes them from the queue.
	 * @returns Whether there are still more actions queued.
	 */
	success() {
		this.#actions.splice(0, 2);
		return this.#actions.length > 0;
	}
}

/**
 * An embedded video player base class.
 */
export class EmbeddedVideoPlayer {
	/** Video playback and seeking is limited to this start time in seconds. */
	#start;
	/** Video playback and seeking is limited to this end time in seconds. */
	#end;
	/** The playhead position that we want to be at. A seek to that position may be pending. */
	#position;
	/** The HTML element representing this video player. */
	#element;
	/** @type {Array<CourseOfActions>} Action sequences currently executing for this video player. */
	#coas;

	/**
	 * @param {number} start Minimum video time that the player should be limited to.
	 * @param {number} end Maximum video time that the player should be limited to.
	 * @param {number} position The time in seconds into the video.
	 * @param {HTMLElement} element The HTML element for this player to place it on a web site.
	 */
	constructor(start, end, position, element) {
		this.#start = start;
		this.#end = end;
		this.#position = position;
		this.#element = element;
		this.element.style.gridArea = `auto / auto / span 9 / span 16`;
		this.#coas = [];
	}

	/** @returns Minimum video time that the player should be limited to. */
	get start() {
		return this.#start;
	}

	/** @returns Maximum video time that the player should be limited to. */
	get end() {
		return this.#end;
	}

	/** @returns The current position in the video. */
	get position() {
		return this.#position;
	}

	/** @returns {HTMLElement} The HTML element for this player to place it on a web site. */
	get element() {
		return this.#element;
	}

	/**
	 * Pushes a sequence of actions to be performed on this video player onto the stack.
	 * @param {number|undefined} group If another course of actions with the same group number is added, existing courses of actions that are not currently running are removed. Useful for seeking.
	 * @param {Function[]} actions The actions to be performed, in pairs of two. The first function is the actual action, while the second function is called before it to set up callbacks that test for the success of the action.
	 */
	courseOfActions(group, actions) {
		const coa = new CourseOfActions(group, actions);
		if (group !== undefined) {
			for (let i = 1; i < this.#coas.length; i++) {
				if (coa.group == group) {
					this.#coas.splice(i, 1);
				}
			}
		}
		this.#coas.push(coa);
		if (this.#coas.length == 1) {
			this.#element.style.pointerEvents = "none";
			this.#element.tabIndex = -1;
			document.body.focus({ preventScroll: true });
			this.#processAction();
		}
	}

	/**
	 * Processes the next action within the current sequence. May recurse if the action’s success callback fires synchronously.
	 */
	#processAction() {
		let immediateReturn = false;
		this.#coas[0].getSuccess(0)((success) => {
			immediateReturn = true;
			this.#success(success);
		});
		if (!immediateReturn) {
			this.#coas[0].getAction(0)();
		}
	}

	/**
	 * Our internal handling of the success or failure of an action.
	 * @param {boolean} success Passed in by the action’s success callback. We abort the current sequence if it is `false` or continue with the next action if `true`.
	 */
	#success(success) {
		if (!success || !this.#coas[0].success()) {
			this.#coas.splice(0, 1);
		}
		if (this.#coas.length > 0) {
			this.#processAction();
		}
		else {
			this.#element.tabIndex = 0;
			this.#element.style.pointerEvents = "";
		}
	}

	/**
	 * Updates clip limits and playhead.
	 * @param {number} start Minimum video time that the player should be limited to.
	 * @param {number} end Maximum video time that the player should be limited to.
	 * @param {number} [position] The time in seconds into the video.
	 */
	updateLimits(start, end, position) {
		this.#start = start;
		this.#end = end;
		if (position !== undefined) {
			this.seekTo(position);
		}
	}

	/**
	 * Shows the player again, after it has been hidden.
	 */
	show() {
		this.#element.style.removeProperty("position");
		this.#element.style.removeProperty("visibility");
	}

	/**
	 * The player is kept alive, but hidden. This is useful of you need it again at a later point.
	 */
	hide() {
		this.#element.style.visibility = "hidden";
		this.#element.style.position = "absolute";
	}

	/**
	 * Seeks to a second in the video.
	 * @param {number} position Time in the video to seek to.
	 */
	seekTo(position) {
		this.#position = position;
	}

	resize(w, h) {
		const zoom = 480 / Math.max(w, h);
		w *= zoom;
		h *= zoom;
		this.element.style.width = `${w}px`;
		this.element.style.height = `${h}px`;
		this.element.style.gridArea = `auto / auto / span ${h / 30} / span ${w / 30}`;
	}
}

/**
 * A helper class for embedded players that use IFrames.
 */
class EmbeddedIframePlayer extends EmbeddedVideoPlayer {
	/** The domain of the IFrame content for security reasons. */
	#targetOrigin;

	/**
	 * @param {number} start Minimum video time that the player should be limited to.
	 * @param {number} end Maximum video time that the player should be limited to.
	 * @param {number} position The time in seconds into the video.
	 * @param {string} targetOrigin The domain of the IFrame content for security reasons.
	 */
	constructor(start, end, position, targetOrigin) {
		const iframe = document.createElement("iframe");
		iframe.loading = "eager";
		iframe.allowFullscreen = true;
		iframe.style.border = "0";
		super(start, end, position, iframe);
		this.#targetOrigin = targetOrigin;
		knownIframePlayers.add(this);
	}

	/** @returns The domain of the IFrame content. */
	get targetOrigin() {
		return this.#targetOrigin;
	}

	/** @returns {HTMLIFrameElement} The player HTML element as an IFrame. */
	get iframe() {
		if (!(this.element instanceof HTMLIFrameElement)) {
			throw new Error("Player HTML element is expected to be an IFrame");
		}
		return this.element;
	}

	/**
	 * Sends a control message to the embedded player.
	 * @param message The message sent to the embedded player.
	 */
	postMessage(message) {
		this.iframe.contentWindow?.postMessage(message, this.#targetOrigin);
	}

	/**
	 * Processes incoming messages from the embedded player.
	 * @param message The message sent from the embedded player to the host.
	 */
	handleMessage(message) {
		alert(`Unhandled IFrame player message: ${message}`);
	}
}

/** @type Set<EmbeddedIframePlayer> List of the players we created and monitor for incoming `window.postMessage()` messages. */
const knownIframePlayers = new Set();

if (typeof window !== "undefined") {
	window.addEventListener("message", (event) => {
		for (const player of knownIframePlayers) {
			if (event.source === player.iframe.contentWindow && event.origin === player.targetOrigin) {
				player.handleMessage(event.data);
				break;
			}
		}
	});
}

/**
 * A YouTube embed.
 */
export class EmbeddedYouTubePlayer extends EmbeddedIframePlayer {
	static #nextSerial = 1;
	#id;
	#serial;
	#currentTime;
	#intervalId;
	#seekableEnd;
	/** @type {function|null} */
	#messageHandler = null;
	#playerState = -1;

	/**
	 * @param {number} start Minimum video time that the player should be limited to.
	 * @param {number} end Maximum video time that the player should be limited to.
	 * @param {number} position The time in seconds into the video.
	 * @param {string} id YouTube video ID.
	 */
	constructor(start, end, position, id) {
		let origin = document.baseURI;
		origin = origin.substring(0, origin.indexOf("/", 8));
		super(start, end, position, "https://www.youtube.com");
		this.iframe.style.width = "480px";
		this.iframe.style.height = "270px";
		this.#id = id;
		this.#serial = EmbeddedYouTubePlayer.#nextSerial++;
		this.courseOfActions(undefined, [
			// Load IFrame
			()        => { this.iframe.src = `https://www.youtube.com/embed/${id}?enablejsapi=1&autoplay=0&rel=0&origin=${origin}`; },
			(success) => { this.element.onload = () => { this.element.onload = null; success(true); } },
			// Establish communication with YouTube Player and mute audio
			()        => { this.#establishCommunicationsWithPlayer(); },
			(success) => {
				this.#messageHandler = (message) => {
					switch (message.event) {
						case "onReady":
							window.clearInterval(this.#intervalId);
							this.#intervalId = 0;
							this.#postMessage({ event: "command", func: "mute" });
							success(true);
							break;
					}
				};
			},
		].concat(this.#commonOpenActions()));
	}

	/**
	 * Opens a different video at the chosen time.
	 * @param {number} start Minimum video time that the player should be limited to.
	 * @param {number} end Maximum video time that the player should be limited to.
	 * @param {number} position The time in seconds into the video.
	 * @param {string} id YouTube video ID.
	 */
	open(start, end, position, id) {
		if (this.#id == id) {
			this.updateLimits(start, end, position);
		}
		else {
			this.#id = id;
			this.courseOfActions(undefined, [
				// Load new video
				()        => {
					this.#postMessage({ event: "command", func: "mute" });
					this.#postMessage({ event: "command", func: "loadVideoById", args: [ id ] });
				},
				(success) => {
					this.#messageHandler = (message) => {
						if (message.event == "infoDelivery") {
							super.updateLimits(start, end);
							super.seekTo(position);
							success(true);
						}
					};
				},
			].concat(this.#commonOpenActions()));
		}
	}

	#commonOpenActions() {
		return [
			// Seek into position, which starts playback
			()        => { this.#seekToInternal(); },
			(success) => {
				this.#messageHandler = (message) => {
					const ps = message.info.playerState;
					if (message.event == "infoDelivery" && (ps == 0 || ps == 1)) {
						this.resize(message.info.videoContentRect.width, message.info.videoContentRect.height);
						success(true);
					}
				};
			},
			// Pause video and unmute
			()        => {
				this.#postMessage({ event: "command", func: "pauseVideo" });
				this.#postMessage({ event: "command", func: "unMute" });
			},
			(success) => {
				this.#messageHandler = (message) => {
					const ps = message.info.playerState;
					if (message.event == "infoDelivery" && (ps == 2 || ps == 3)) {
						success(true);
					}
				};
			},
			// Seek into position again, this time in paused state
			()        => { this.#seekToInternal(); },
			(success) => {
				this.#messageHandler = (message) => {
					if (message.info.currentTime == this.position) {
						this.#messageHandler = null;
						success(true);
					}
				};
			}
		];
	}

	/** @inheritdoc @type {EmbeddedVideoPlayer['hide']} */
	hide() {
		this.courseOfActions(undefined, [
			()        => {
				if (this.#playerState == 1 || this.#playerState == 3) {
					this.#postMessage({ event: "command", func: "pauseVideo" });
				}
				else {
					this.#messageHandler && this.#messageHandler({ event: "infoDelivery", info: { playerState: this.#playerState } });
				}
			},
			(success) => {
				this.#messageHandler = (message) => {
					const ps = message.info.playerState;
					if (message.event == "infoDelivery" && (ps == 0 || ps == 2)) {
						success(true);
					}
				};
			},
		]);
		super.hide();
	}

	/** @inheritdoc @type {EmbeddedVideoPlayer['seekTo']} */
	seekTo(position) {
		const clippedPosition = Math.max(Math.min(position, this.#seekableEnd, this.end), this.start);
		this.courseOfActions(1, [
			()        => {
				this.#postMessage({ event: "command", func: "pauseVideo" });
				super.seekTo(clippedPosition);
				this.#seekToInternal();
			},
			(success) => {
				this.#messageHandler = (message) => {
					if (message.info.currentTime == this.position) {
						this.#messageHandler = null;
						success(true);
					}
					else {
						this.#seekToInternal();
					}
				};
			}
		]);
	}

	#seekToInternal() {
		const delta = this.#currentTime === undefined ? Infinity : Math.abs(this.#currentTime - this.position);
		// The player doesn't stop showing "buffering" when seeking within 5 ms of the current position so we will accept this "inaccuracy".
		if (delta >= 0.0051) {
			this.#postMessage({ event: "command", func: "seekTo", args: [ this.position, true ] });
		}
		else {
			super.seekTo(this.#currentTime);
			this.#messageHandler && this.#messageHandler({ event: "infoDelivery", info: { currentTime: this.#currentTime } });
		}
	}

	/** @param {Object} message */
	#postMessage(message) {
		super.postMessage(JSON.stringify(message));
	}

	/** @inheritdoc @type {EmbeddedIframePlayer['handleMessage']} */
	handleMessage(message) {
		message = JSON.parse(message);
		if (message.channel == "widget" && message.id == this.#serial) {
			switch (message.event) {
				case "infoDelivery": // All regular updates like player state playback time, volume changes etc.
					if (message.info.progressState?.seekableEnd) {
						// If we seek past 110 ms short of the seekable end of the video, YouTube will just stop the video and not show anything.
						this.#seekableEnd = message.info.progressState.seekableEnd - 0.110;
					}
					if (message.info.playerState !== undefined) {
						this.#playerState = message.info.playerState;
					}
					// Make sure current time stays within the clip.
					if (message.info.currentTime !== undefined) {
						this.#currentTime = message.info.currentTime;
						if (!this.#messageHandler) {
							const clippedPosition = Math.max(Math.min(this.#currentTime, this.#seekableEnd, this.end), this.start);
							if (clippedPosition !== this.#currentTime) {
								this.seekTo(clippedPosition);
							}
						}
					}
					// Jump to the last frame if playback ended (or user seeked past the end of the video).
					if (message.info.playerState == 0 && !this.#messageHandler) {
						this.courseOfActions(undefined, [
							()        => { this.#postMessage({ event: "command", func: "playVideo" }); },
							(success) => {
								this.#messageHandler = (message) => {
									if (message.info.playerState == 1) {
										success(true);
									}
								};
							},
							()        => { this.#postMessage({ event: "command", func: "pauseVideo" }); },
							(success) => {
								this.#messageHandler = (message) => {
									if (message.info.playerState == 2) {
										success(true);
									}
								};
							},
							()        => {
								super.seekTo(Math.min(this.#seekableEnd, this.end));
								this.#seekToInternal();
							},
							(success) => {
								this.#messageHandler = (message) => {
									if (message.info.currentTime == this.position) {
										this.#messageHandler = null;
										success(true);
									}
									else {
										this.#seekToInternal();
									}
								};
							},
						]);
					}
					break;
			}
			this.#messageHandler && this.#messageHandler(message);
		}
	}

	#establishCommunicationsWithPlayer() {
		this.#postMessage({ event: "listening", id: this.#serial });
		this.#intervalId = window.setInterval(() => {
			this.#postMessage({ event: "listening", id: this.#serial });
		}, 500);
	}
}

/**
 * A TikTop embed.
 */
export class EmbeddedTikTokPlayer extends EmbeddedIframePlayer {
	#id;
	/** @type {function|null} */
	#messageHandler = null;
	#playerState = -1;
	#currentTime = 0;

	/**
	 * @param {number} start Minimum video time that the player should be limited to.
	 * @param {number} end Maximum video time that the player should be limited to.
	 * @param {number} position The time in seconds into the video.
	 * @param {string} id TikTok video ID.
	 */
	constructor(start, end, position, id) {
		super(start, end, position, `https://www.tiktok.com`);
		this.resize(576, 768)
		this.#id = id;
		this.courseOfActions(undefined, this.#commonOpenActions());
	}

	/**
	 * Opens a different video at the chosen time.
	 * @param {number} start Minimum video time that the player should be limited to.
	 * @param {number} end Maximum video time that the player should be limited to.
	 * @param {number} position The time in seconds into the video.
	 * @param {string} id TikTok video ID.
	 */
	open(start, end, position, id) {
		if (this.#id == id) {
			this.updateLimits(start, end, position);
		}
		else {
			this.#id = id;
			super.updateLimits(start, end);
			super.seekTo(position);
			this.courseOfActions(undefined, this.#commonOpenActions());
		}
	}

	#commonOpenActions() {
		return [
			// Load IFrame
			()        => { this.iframe.src = `https://www.tiktok.com/player/v1/${this.#id}?rel=0`; },
			(success) => { this.#messageHandler = (message) => { if (message.type == "onPlayerReady") { success(true); } } },
			// Seek into position
			()        => { this.#postMessage("seekTo", this.position); },
			(success) => { 
				this.#messageHandler = (message) => {
					if (message.type == "onCurrentTime") {
						if (message.value.currentTime == this.position) {
							this.#messageHandler = null;
							success(true);
						}
						else {
							this.#postMessage("seekTo", this.position);
						}
					}
				};
			},
		];
	}

	/** @inheritdoc @type {EmbeddedVideoPlayer['hide']} */
	hide() {
		this.courseOfActions(undefined, [
			()        => {
				if (this.#playerState != -1 && this.#playerState != 0 && this.#playerState != 2) {
					this.#postMessage("pause");
				}
				else {
					this.#messageHandler && this.#messageHandler({ type: "onStateChange", value: 2 });
				}
			},
			(success) => {
				this.#messageHandler = (message) => {
					if (message.type == "onStateChange" && (message.value == 0 || message.value == 2)) {
						this.#messageHandler = null;
						success(true);
					}
				};
			},
		]);
		super.hide();
	}

	/** @inheritdoc @type {EmbeddedVideoPlayer['seekTo']} */
	seekTo(position) {
		this.courseOfActions(1, [
			()        => {
				this.#postMessage("pause");
				if (this.#currentTime != position) {
					super.seekTo(position);
					this.#postMessage("seekTo", position);
				}
				else {
					this.#messageHandler && this.#messageHandler({ type: "onCurrentTime", value: { currentTime: this.#currentTime } });
				}
			},
			(success) => {
				this.#messageHandler = (message) => {
					if (message.type == "onCurrentTime") {
						if (message.value.currentTime == this.position) {
							this.#messageHandler = null;
							success(true);
						}
						else {
							this.#postMessage("seekTo", position);
						}
					}
				};
			}
		]);
	}

	/**
	 * Sends a message to the embedded player.
	 * @param {string} type The TikTok message type.
	 * @param {any} [value] The message data.
	 */
	#postMessage(type, value) {
		const message = {type: type, "x-tiktok-player": true};
		if (value !== undefined) {
			message.value = value;
		}
		super.postMessage(message);
	}

	/** @inheritdoc @type {EmbeddedIframePlayer['handleMessage']} */
	handleMessage(message) {
		if (message["x-tiktok-player"] === true) {
			this.#messageHandler && this.#messageHandler(message);
			switch (message.type) {
				case "onPlayerReady":
					break;
				case "onStateChange":
					this.#playerState = message.value;
					break;
				case "onCurrentTime":
					this.#currentTime = message.value.currentTime;
					break;
				case "onMute":
					break;
				case "onVolumeChange":
					break;
				case "onError":
					break;
				case "onImageChange":
					break;
				default:
					alert(`Unhandled TikTok player message: ${message.type}`);
			}
		}
	}
}

/**
 * A basic HTML5 embedded video player.
 */
export class EmbeddedHtmlVideoPlayer extends EmbeddedVideoPlayer {
	#url;

	/**
	 * @param {number} start Minimum video time that the player should be limited to.
	 * @param {number} end Maximum video time that the player should be limited to.
	 * @param {number} position The time in seconds into the video.
	 * @param {string} url Video URL.
	 */
	constructor(start, end, position, url) {
		const videoElement = document.createElement("video");
		videoElement.width = 480;
		videoElement.height = 270;
		videoElement.preservesPitch = true;
		videoElement.controls = true;
		videoElement.preload = "metadata";
		super(start, end, position, videoElement);
		this.#url = url;
		this.courseOfActions(undefined, this.#commonOpenActions());
	}

	/** @returns {HTMLVideoElement} The player HTMLVideoElement */
	get #videoElement() {
		if (!(this.element instanceof HTMLVideoElement)) {
			throw new Error("Player HTML element is expected to be a Video element.");
		}
		return this.element;
	}

	/**
	 * Opens a different video at the chosen time.
	 * @param {number} start Minimum video time that the player should be limited to.
	 * @param {number} end Maximum video time that the player should be limited to.
	 * @param {number} position The time in seconds into the video.
	 * @param {string} url Video URL.
	 */
	open(start, end, position, url) {
		if (this.#url == url) {
			this.updateLimits(start, end, position);
		}
		else {
			super.updateLimits(start, end);
			super.seekTo(position);
			this.#url = url;
			this.courseOfActions(undefined, this.#commonOpenActions());
		}
	}

	#commonOpenActions() {
		return [
			()        => {
				this.#videoElement.src = this.#url;
				this.#videoElement.currentTime = this.position;
			},
			(success) => { 
				if (this.#videoElement.src == this.#url) {
					success(true);
				}
				else {
					this.#videoElement.onerror = () => {
						this.#videoElement.onerror = null;
						this.#videoElement.onloadedmetadata = null;
						success(false);
					}
					this.#videoElement.onloadedmetadata = () => {
						this.#videoElement.onerror = null;
						this.#videoElement.onloadedmetadata = null;
						this.resize(this.#videoElement.videoWidth, this.#videoElement.videoHeight);
						success(true);
					}
				}
			},
		].concat(this.#commonSeekActions());
	}

	/** @inheritdoc @type {EmbeddedVideoPlayer['hide']} */
	hide() {
		this.courseOfActions(undefined, [
			()        => { this.#videoElement.pause(); },
			(success) => {
				if (this.#videoElement.paused) {
					success(true);
				}
				else {
					this.#videoElement.onpause = () => {
						this.#videoElement.onpause = null;
						success(true);
					}
				}
			},
		]);
		super.hide();
	}

	/** @inheritdoc @type {EmbeddedVideoPlayer['seekTo']} */
	seekTo(position) {
		super.seekTo(position);
		this.courseOfActions(1, [
			()        => { this.#videoElement.pause(); },
			(success) => {
				if (this.#videoElement.paused) {
					success(true);
				}
				else {
					this.#videoElement.onpause = () => {
						this.#videoElement.onpause = null;
						success(true);
					}
				}
			},
		].concat(this.#commonSeekActions()));
	}

	#commonSeekActions() {
		return [
			()        => {
				if (this.#videoElement.currentTime != this.position) {
					this.#videoElement.currentTime = this.position;
				}
			},
			(success) => {
				if (this.#videoElement.currentTime == this.position) {
					success(true);
				}
				else {
					this.#videoElement.onseeked = () => {
						this.#videoElement.onseeked = null;
						success(true);
					}
				}
			},
		];
	}
}