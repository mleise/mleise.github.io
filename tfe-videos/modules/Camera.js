// @ts-check

import { Person } from "./Person.js";

export const NTSC24 = 24000 / 1001;
export const NTSC30 = 30000 / 1001;
export const NTSC60 = 60000 / 1001;

/**
 * A camera used to capture some of the video footage.
 */
export class Camera {
	/** The owner of the camera. */
	#owner;
	/** Whether the camera is carried by its owner and gives a personal view (versus being set up once to record the Sun for 24h or similar). */
	#isPersonal;
	/** Camera model. */
	#model;
	/** Camera lens if applicable. Left `undefined` for devices with a fixed lens. */
	#lens;

	/**
	 * @param {Person} owner The owner of the camera.
	 * @param {boolean} isPersonal Whether the camera is carried by its owner and gives a personal view (versus being set up once to record the Sun for 24h or similar).
	 * @param {string} model The model of the camera or device.
	 * @param {string|undefined} lens The camera lens if applicable. Leave out for devices with a fixed lens.
	 */
	constructor(owner, isPersonal, model, lens = undefined) {
		this.#owner = owner;
		this.#isPersonal = isPersonal
		this.#model = model;
		this.#lens = lens;
	}

	/** @returns The owner of the camera. */
	get owner() {
		return this.#owner
	}

	/** @returns Whether the camera is carried by its owner and gives a personal view (versus being set up once to record the Sun for 24h or similar). */
	get isPersonal() {
		return this.#isPersonal;
	}
}