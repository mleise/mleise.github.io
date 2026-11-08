const SCALE = 6;
const MAX_VERTICES = 57;
let outputIsRedeem = true;
let output;
let canvas;
let ctx;
let selectedIdx = 0;
let vertices = [{
	x: 80,
	y: 72,
	command: undefined,
}];
let redeem;

const angleRotation = [
	0x10, 0x50, 0x68, 0x28, 0x38, 0x78, 0x70, 0x30,
	0x20, 0x60, 0x58, 0x18, 0x08, 0x48, 0x40, 0x00,
];

const angleNames = [
	"se4", "se1", "ne1", "sw4", "sw1", "ne4", "nw4", "nw1",
	"se3", "se2", "ne2", "sw3", "sw2", "ne3", "nw3", "nw2",
];

document.addEventListener("DOMContentLoaded", function() {
	output = document.getElementById("output");
	canvas = document.getElementById("drawing");
	canvas.width = SCALE * 160;
	canvas.height = SCALE * 144;
	ctx = canvas.getContext("2d");
	document.addEventListener("keydown", onKeyDown);
	document.addEventListener("mousedown", onMouseDown);
	updateDrawing();
});

function updateDrawing() {
	ctx.fillStyle = "#448844";
	ctx.fillRect(0, 0, SCALE * 160, SCALE * 144);
	ctx.fillStyle = "#99ff99";
	ctx.fillRect(SCALE * 16, SCALE * 8, SCALE * 128, SCALE * 128);
	let code = "";
	if (outputIsRedeem) {
		code += "21008001001cc5cd1d202122980e1050722314280a7de61ffe1238f40918f12180ff36";
		code += intToHexString(vertices[0].x - 16);
		code += "2c36";
		code += intToHexString(vertices[0].y - 8);
		code += "2c36c116003e91e040f044fe9020fa7ae6072019f082fe";
		code += intToHexString(250 - (MAX_VERTICES - (vertices.length - 1)));
		code += "200ce12be57c3d20e8e040e118b326006f3ce082561e04cb7228011d2181ffcb";
		code += "5a28012b7e3ccb622802d602777dee016f7e3ccb6a2802d60277cb7a282df080";
		code += "47f0814fd5e57907cb37e60f6779a8e6f8a9076f1101801978e6075f3e802804";
		code += "0f1d20fc56b2320f32e1d1cb72280c1d7bfe0228a7fe0020b818031d20b314c33000";
	} else {
		code = "<pre>";
		code += "		DEF X = " + (vertices[0].x - 16) + "<br>";
		code += "		DEF Y = " + (vertices[0].y - 8) + "<br>";
		code += "<br>";
	}
	for (let i = 1; i < vertices.length; i++) {
		drawLine(i);
		let command = vertices[i].command;
		if (outputIsRedeem) {
			code += intToHexString(command);
		} else {
			code += (command & 0x80) ? "		line " : "		move ";
			code += angleNames[(command >> 3) & 15] + ", ";
			code += 8 - (command & 7) + "<br>";
		}
	}
	for (let i = 0; i < vertices.length; i++) {
		drawVertex(i);
	}
	if (outputIsRedeem) {
		redeem = code;
		code = "<b>Redeem:</b><br>" + code;
		code += "<br><button type=\"button\" onclick=\"copyRedeem()\">Copy</button>";
	} else {
		code += "</pre>";
	}
	output.innerHTML = code;
}

function drawLine(vertexIdx) {
	let x = vertices[vertexIdx - 1].x;
	let y = vertices[vertexIdx - 1].y;
	const vertex = vertices[vertexIdx];
	let dx = 4;
	let dy = 1;
	if (vertex.command & 0x40) {
		dx = 3
		dy = 2
	}
	const visible = vertex.command & 0x80;
	const xFlip = vertex.command & 0x20;
	const yFlip = vertex.command & 0x10;
	const yDominant = vertex.command & 0x08;
	let length = 8 - (vertex.command & 7);
	for (let k = 0; k < length; k++) {
		if (yDominant) {
			x += yFlip ? -1 : +1;
			for (let i = 0; i < dx; i++) {
				if (dy == 2 && i == 1) {
					x += yFlip ? -1 : +1;
				}
				y += xFlip ? -1 : +1;
				if (visible) {
					drawPixel(x, y, vertexIdx == selectedIdx);
				}
			}
		} else {
			y += yFlip ? -1 : +1;
			for (let i = 0; i < dx; i++) {
				if (dy == 2 && i == 1) {
					y += yFlip ? -1 : +1;
				}
				x += xFlip ? -1 : +1;
				if (visible) {
					drawPixel(x, y, vertexIdx == selectedIdx);
				}
			}
		}
	}
}

function drawPixel(x, y, selected) {
	const error = (x < 16) | (x >= 144) | (y < 8) | (y >= 136);
	ctx.fillStyle = error ? "Red" : selected ? "HotPink" : "DarkSlateGray";
	ctx.fillRect(SCALE * x, SCALE * y, SCALE, SCALE);
}

function drawVertex(vertexIdx) {
	let vertex = vertices[vertexIdx];
	ctx.fillStyle = ctx.strokeStyle = vertexIdx == selectedIdx ? "HotPink" : "#00000030";
	ctx.beginPath();
	ctx.ellipse(SCALE * (vertex.x + 0.5), SCALE * (vertex.y + 0.5), SCALE * 2, SCALE * 2, 0, 0, Math.PI * 2);
	ctx.stroke();
	ctx.font = "" + 2 * SCALE + "px Arial";
	ctx.fillText(vertexIdx, SCALE * (vertex.x), SCALE * (vertex.y + 4.3));
}

function onKeyDown(e) {
	let changesMade = false;
	switch (e.keyCode) {
		case 32: // space
			if (selectedIdx > 0) {
				let command = vertices[selectedIdx].command;
				command ^= 0x80;
				vertices[selectedIdx].command = command;
				updateDrawing();
			}
			break;
		case 33: // page up
			if (selectedIdx < vertices.length - 1) {
				selectedIdx++;
			} else {
				selectedIdx = 0;
			}
			updateDrawing();
			break;
		case 34: // page down
			if (selectedIdx > 0) {
				selectedIdx--;
			} else {
				selectedIdx = vertices.length - 1;
			}
			updateDrawing();
			break;
		case 37: // arrow left
			if (selectedIdx == 0) {
				if (vertices[0].x == 0) {
					break;
				}
				vertices[0].x--;
			} else {
				let command = vertices[selectedIdx].command;
				let angle = (command & 0x78);
				for (let i = 0; i < 16; i++) {
					if (angleRotation[i] == angle) {
						angle = angleRotation[(i + 1) % 16];
						break;
					}
				}
				vertices[selectedIdx].command = (command & 0x87) | angle;
			}
			updateTargetCoordinates(selectedIdx);
			updateDrawing();
			break;
		case 38: // arrow up
			if (selectedIdx == 0) {
				if (vertices[0].y == 0) {
					break;
				}
				vertices[0].y--;
			} else {
				let command = vertices[selectedIdx].command;
				if ((command & 7) == 0) {
					break;
				}
				vertices[selectedIdx].command = (command & 0xF8) | ((command & 7) - 1);
			}
			updateTargetCoordinates(selectedIdx);
			updateDrawing();
			break;
		case 39: // arrow right
			if (selectedIdx == 0) {
				if (vertices[0].x == 159) {
					break;
				}
				vertices[0].x++;
			} else {
				let command = vertices[selectedIdx].command;
				let angle = (command & 0x78);
				for (let i = 0; i < 16; i++) {
					if (angleRotation[i] == angle) {
						angle = angleRotation[(i - 1) % 16];
						break;
					}
				}
				vertices[selectedIdx].command = (command & 0x87) | angle;
			}
			updateTargetCoordinates(selectedIdx);
			updateDrawing();
			break;
		case 40: // arrow down
			if (selectedIdx == 0) {
				if (vertices[0].y == 143) {
					break;
				}
				vertices[0].y++;
			} else {
				let command = vertices[selectedIdx].command;
				if ((command & 7) == 7) {
					break;
				}
				vertices[selectedIdx].command = (command & 0xF8) | ((command & 7) + 1);
			}
			updateTargetCoordinates(selectedIdx);
			updateDrawing();
			break;
		case 45: // insert
			if (vertices.length <= MAX_VERTICES) { // One extra for the starting location.
				const baseIdx = selectedIdx === undefined ? vertices.length - 1 : selectedIdx;
				spawnVertex(baseIdx);
				changesMade = true;
			}
			break;
		case 46: // delete
			if (selectedIdx > 0) {
				vertices.splice(selectedIdx, 1);
				if (selectedIdx < vertices.length) {
					updateTargetCoordinates(selectedIdx);
				}
				selectedIdx--;
				changesMade = true;
			}
			break;
	}
	if (changesMade) {
		updateDrawing();
	}
}

function onMouseDown(e) {
	const c = getCoordinates(e);
	for (let i = 0; i < vertices.length; i++) {
		const dist = Math.sqrt(Math.pow(c.x - vertices[i].x, 2) + Math.pow(c.y - vertices[i].y, 2));
		if (dist < 3) {
			selectedIdx = i;
			updateDrawing();
			break;
		}
	}
}

function getCoordinates(e) {
	return {
		x: (e.clientX - canvas.getBoundingClientRect().left) / SCALE,
		y: (e.clientY - canvas.getBoundingClientRect().top) / SCALE
	};
}

function spawnVertex(baseIdx) {
	const baseVertex = vertices[baseIdx];
	let vertex;
	if (baseIdx > 0) {
		vertex = {
			command: baseVertex.command | 0x80
		};
	} else {
		vertex = {
			command: 0x84
		};
	}
	vertices.splice(baseIdx + 1, 0, vertex);
	selectedIdx = baseIdx + 1;
	updateTargetCoordinates(selectedIdx);
	return vertex;
}

function updateTargetCoordinates(vertexIdx) {
	if (vertexIdx > 0) {
		let x = vertices[vertexIdx - 1].x;
		let y = vertices[vertexIdx - 1].y;
		let dx = 4;
		let dy = 1;
		let vertex = vertices[vertexIdx];
		if (vertex.command & 0x40) {
			dx = 3
			dy = 2
		}
		if (vertex.command & 0x20) {
			dx = -dx;
		}
		if (vertex.command & 0x10) {
			dy = -dy;
		}
		if (vertex.command & 0x08) {
			let tmp = dx;
			dx = dy;
			dy = tmp;
		}
		let length = 8 - (vertex.command & 7);
		dx *= length;
		dy *= length;
		vertex.x = x + dx;
		vertex.y = y + dy;
	}
	vertexIdx += 1;
	if (vertexIdx < vertices.length) {
		updateTargetCoordinates(vertexIdx);
	}
}

function intToHexString(i) {
	let result = i.toString(16);
	if (result.length < 2) {
		result = '0' + result;
	}
	return result;
}

function copyRedeem() {
	 navigator.clipboard.writeText(redeem);
}
