// @ts-check

/**
 * Represents a person that was part of the trip or sent a camera on the way as part of an experient, if they couldn’t make it in person.
 */
export class Person {
	/** The person’s full name if public. */
	#realName;
	/** The person’s nick name. */
	#nickName;
	/** A color to be used for the person in simple graphics. */
	#color;
	/** A photo of the person or the person’s channel. */
	#photo;

	/**
	 * @param {string|undefined} realName The person’s full name, if public.
	 * @param {string|undefined} nickName The person’s nick name, if available.
	 * @param {string} color A color to be used for the person in simple graphics.
	 * @param {string} photo A photo of the person or the person’s channel.
	 */
	constructor(realName, nickName, color, photo) {
		this.#realName = realName;
		this.#nickName = nickName;
		this.#color = color;
		this.#photo = photo;
	}

	/** @returns The color to be used for the person in simple graphics. */
	get color() {
		return this.#color;
	}

	/** @returns The photo of the person or the person’s channel. */
	get photo() {
		return this.#photo;
	}

	/** @returns Real or nickname of the person, whichever is available. */
	toString() {
		return this.#realName ?? this.#nickName ?? "(no name)";
	}
}