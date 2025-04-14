// @ts-check

/**
 * A point in time with a description and icon to be shown above the timeline.
 */
export class TimelineEvent {
	/** The date when the event happened or started. */
	date;
	/** The description of the event. */
	name;
	/** An emoji to be shown above the timeline. */
	symbol;
	/** Duration in seconds of the event if applicable. */
	duration;

	/**
	 * @param {Date} date The date when the event happened or started.
	 * @param {string} name The description of the event.
	 * @param {string} symbol An emoji to be shown above the timeline.
	 * @param {number} duration Duration in seconds of the event if applicable.
	 */
	constructor(date, name, symbol, duration = 0) {
		this.date = date;
		this.name = name;
		this.symbol = symbol;
		this.duration = duration;
	}
}