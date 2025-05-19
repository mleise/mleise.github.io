// @ts-check

import { timeline } from "./data.js";

timeline.process();

if (typeof window !== "undefined") {
	const container = document.getElementById("svgContainer");
	if (container) {
		const svg = timeline.produceSvg(container, false);
		container.appendChild(svg);
	}
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
	window.open(timeline.selectedClip.url);
}