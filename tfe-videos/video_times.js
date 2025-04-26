// @ts-check

import { clips, timeline } from "./data.js";

timeline.process();

//console.log(clips.criticalArrivedC.endTimeAvgMs);
//console.log(clips.criticalArrivedD.startTimeAvgMs);

//console.log(clips.mctoonLive100Percent.confidenceIntervalMs + " from David Weiss’ app");
//console.log(clips.will360Part1.confidenceIntervalMs);
//console.log(vids.willSecond360.videoToRealTime("00:16:40"));
//console.log(vids.willSecond360.videoToRealTime("00:16:50"));
//timeline.printSegmentsForDate(new Date(vids.willSecond360.videoToRealTime("00:16:40").valueOf() - 24*3600000));

if (typeof window !== "undefined") {
	const container = document.getElementById("svgContainer");
	if (container) {
		const svg = timeline.produceSvg(container);
		container.appendChild(svg);
	}
}

/*
var tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
var firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

var player;
function onYouTubeIframeAPIReady() {
	//player = new YT.Player('player1', {
	//    height: '390',
	//    width: '640',
	//    videoId: 'M7lc1UVf-VE',
	//    events: {
	//        'onReady': onPlayerReady,
	//        'onStateChange': onPlayerStateChange
	//    }
	//});
}

function onPlayerReady(event) {
	//event.target.playVideo();
}

var done = false;
function onPlayerStateChange(event) {
	//if (event.data == YT.PlayerState.PLAYING && !done) {
	//    setTimeout(stopVideo, 6000);
	//    done = true;
	//}
}
function stopVideo() {
	player.stopVideo();
}
*/