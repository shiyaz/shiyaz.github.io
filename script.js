const FORTUNE_FILE_URL = 'fortunes';
const WHEEL_RADIUS = 95;
const WHEEL_CENTER_X = 100;
const WHEEL_CENTER_Y = 100;
const MARKER_OFFSET_DEGREES = -90;
const DEGREES_IN_CIRCLE = 360;
const SPIN_DECELERATION_TIME_MS = 8000;
const SPIN_EASING = 'ease-out';

const SEGMENT_COLORS = [
	'#FF4136', '#0074D9', '#2ECC40', '#FFDC00',
	'#B10DC9', '#FF851B', '#39CCCC', '#F012BE',
	'#01FF70', '#7FDBFF', '#85144b', '#001f3f',
	'#3D9970', '#FFD700', '#FF69B4', '#4B0082'
];

let rawFortuneContent = null;
let fortuneCollection = null;

async function fetchRandomFortune(url) {
	try {
		if (rawFortuneContent == null) {
			const response = await fetch(url);

			if (!response.ok) {
				throw new Error(`Failed to fetch fortunes: ${response.status}`);
			}

			rawFortuneContent = await response.text();
			fortuneCollection = rawFortuneContent.split('\n%\n')
				.map(fortune => fortune.trim())
				.filter(fortune => fortune !== '');
		}

		if (fortuneCollection.length === 0) {
			return "---";
		}

		const randomIndex = Math.floor(Math.random() * fortuneCollection.length);
		return fortuneCollection[randomIndex];

	} catch (error) {
		console.error("Error getting fortune:", error);
		return "!!!";
	}
}

function wrapTextWithBreaks(text, element, maxWidth) {
	const words = text.split(' ');
	let currentLine = '';
	let result = '';

	const canvas = document.createElement('canvas');
	const context = canvas.getContext('2d');
	context.font = getComputedStyle(element).font;

	for (const word of words) {
		const testLine = currentLine + (currentLine ? ' ' : '') + word;
		const testWidth = context.measureText(testLine).width;

		if (testWidth > maxWidth && currentLine) {
			result += currentLine + '<br>';
			currentLine = word;
		} else {
			currentLine = testLine;
		}
	}
	result += currentLine;
	return result;
}

function displayFortuneInFooter(element) {
	fetchRandomFortune(FORTUNE_FILE_URL)
		.then(fortune => {
			let text = fortune.replaceAll('\n', ' ').trim();

			text = text.replace(/(?<!\.)([.?!])(?![.?!'"]|\))/g, '$1<br>');

			const footer = document.querySelector('footer');
			const maxWidth = footer.clientWidth - 40;

			const lines = text.split('<br>');
			const wrappedLines = lines.map(line => wrapTextWithBreaks(line.trim(), element, maxWidth));

			element.innerHTML = wrappedLines.join('<br>');
		});
}

class LotteryWheel {
	constructor(wheelSvg, triggerButton, resultDisplay, inputArea) {
		this.wheelSvg = wheelSvg;
		this.triggerButton = triggerButton;
		this.resultDisplay = resultDisplay;
		this.inputArea = inputArea;

		this.segments = this.parseInputSegments();
		this.numSegments = this.segments.length;
		this.isSpinning = false;
		this.currentRotation = 0;

		this.drawWheel();
		this.setupEventListeners();
	}

	setupEventListeners() {
		this.triggerButton.addEventListener('click', () => {
			if (!this.isSpinning) {
				this.spin();
			}
		});
	}

	parseInputSegments() {
		return this.inputArea.value.split('\n')
			.map(line => {
				const trimmed = line.trim();
				if (trimmed) {
					const lower = trimmed.toLowerCase();
					return lower.charAt(0).toUpperCase() + lower.slice(1);
				}
				return '';
			})
			.filter(line => line !== '');
	}

	drawWheel() {
		while (this.wheelSvg.firstChild) {
			this.wheelSvg.removeChild(this.wheelSvg.firstChild);
		}

		if (this.segments.length === 0) {
			return;
		}

		this.segments.forEach((segment, index) => {
			this.drawSegment(segment, index);
		});
	}

	drawSegment(segmentText, index) {
		const angleStart = (DEGREES_IN_CIRCLE / this.numSegments) * index;
		const angleEnd = (DEGREES_IN_CIRCLE / this.numSegments) * (index + 1);
		const midAngleDegrees = (angleStart + angleEnd) / 2;
		const midAngleRadians = midAngleDegrees * Math.PI / 180;
		const segmentAngleRadians = (angleEnd - angleStart) * Math.PI / 180;

		const startX = WHEEL_CENTER_X + WHEEL_RADIUS * Math.cos(Math.PI * angleStart / 180);
		const startY = WHEEL_CENTER_Y + WHEEL_RADIUS * Math.sin(Math.PI * angleStart / 180);
		const endX = WHEEL_CENTER_X + WHEEL_RADIUS * Math.cos(Math.PI * angleEnd / 180);
		const endY = WHEEL_CENTER_Y + WHEEL_RADIUS * Math.sin(Math.PI * angleEnd / 180);
		const largeArcFlag = angleEnd - angleStart <= 180 ? 0 : 1;

		const pathD = `M ${WHEEL_CENTER_X},${WHEEL_CENTER_Y} L ${startX},${startY} A ${WHEEL_RADIUS},${WHEEL_RADIUS} 0 ${largeArcFlag},1 ${endX},${endY} Z`;

		const segmentGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
		segmentGroup.classList.add('segment');

		const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
		path.classList.add('segment-path');
		path.setAttribute('d', pathD);
		path.setAttribute('fill', this.getColorForIndex(index));

		const textRadius = WHEEL_RADIUS * 0.85;
		const textX = WHEEL_CENTER_X + textRadius * Math.cos(midAngleRadians);
		const textY = WHEEL_CENTER_Y + textRadius * Math.sin(midAngleRadians);

		const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
		text.classList.add('segment-text');
		text.setAttribute('x', textX);
		text.setAttribute('y', textY);
		text.setAttribute('text-anchor', 'middle');
		text.setAttribute('dominant-baseline', 'central');
		text.style.transformOrigin = `${textX}px ${textY}px`;
		text.style.transform = `rotate(${midAngleDegrees + 90}deg)`;
		text.textContent = segmentText;

		const approximateTextWidth = segmentText.length * 10;
		const availableWidth = WHEEL_RADIUS * Math.sin(segmentAngleRadians / 2) * 2 * 0.7;
		const scaleFactor = Math.min(1, availableWidth / approximateTextWidth);
		text.style.fontSize = `${1.2 * scaleFactor}em`;

		segmentGroup.appendChild(path);
		segmentGroup.appendChild(text);
		this.wheelSvg.appendChild(segmentGroup);
	}

	getColorForIndex(index) {
		return SEGMENT_COLORS[index % SEGMENT_COLORS.length];
	}

	spin() {
		if (this.segments.length === 0) {
			return;
		}

		this.isSpinning = true;
		this.resultDisplay.textContent = '';

		const randomSpins = 5 + Math.random() * 15;
		this.currentRotation += DEGREES_IN_CIRCLE * randomSpins;

		this.wheelSvg.style.transition = `transform ${SPIN_DECELERATION_TIME_MS}ms ${SPIN_EASING}`;
		this.wheelSvg.style.transform = `rotate(${this.currentRotation}deg)`;

		setTimeout(() => {
			this.stopSpin();
		}, SPIN_DECELERATION_TIME_MS);
	}

	stopSpin() {
		this.wheelSvg.style.transition = 'none';

		this.wheelSvg.style.transform = `rotate(${this.currentRotation}deg)`;

		const degreesPerSegment = DEGREES_IN_CIRCLE / this.numSegments;
		const spunDegrees = this.currentRotation % DEGREES_IN_CIRCLE;

		const rawWinningIndex = Math.floor((DEGREES_IN_CIRCLE - spunDegrees + MARKER_OFFSET_DEGREES) % DEGREES_IN_CIRCLE / degreesPerSegment);

		const winningIndex = rawWinningIndex >= 0 ? rawWinningIndex : this.numSegments + rawWinningIndex;

		const winningSegment = this.segments[winningIndex];
		this.resultDisplay.innerHTML = `🎉 <span style="font-weight: bold; color: #ff4757;">${winningSegment}</span> is the lucky winner! 🥳`;

		this.isSpinning = false;
	}
}

function init() {
	const wheelSvg = document.querySelector('.svg-wheel');
	const triggerButton = document.getElementById('button-spin');
	const resultDisplay = document.getElementById('container-result');
	const inputArea = document.getElementById('input-names');
	const footerTextElement = document.getElementById('footer-text');
	const sidebar = document.getElementById('sidebar');
	const sidebarToggle = document.getElementById('sidebar-toggle');

	const storedNames = localStorage.getItem('segmentNames');
	if (storedNames) {
		inputArea.value = storedNames;
	}

	const myWheel = new LotteryWheel(wheelSvg, triggerButton, resultDisplay, inputArea);

	myWheel.triggerButton.addEventListener('click', () => {
		localStorage.setItem('segmentNames', inputArea.value);
	});

	inputArea.addEventListener('input', () => {
		myWheel.segments = myWheel.parseInputSegments();
		myWheel.numSegments = myWheel.segments.length;
		myWheel.drawWheel();
		localStorage.setItem('segmentNames', inputArea.value);
	});

	sidebarToggle.addEventListener('click', () => {
		sidebar.classList.toggle('collapsed');
	});

	displayFortuneInFooter(footerTextElement);
}

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', init);
} else {
	init();
}
