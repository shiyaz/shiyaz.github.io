let fortunesText = null;
let fortunes = null;

const footerTextElement = document.getElementById('footer-text');

function getQueryParams() {
	const urlParams = new URLSearchParams(window.location.search);
	const params = {};
	for (const [key, value] of urlParams.entries()) {
		params[key] = value;
	}
	return params;
}

const queryParams = getQueryParams();

async function getFortune(fortuneFileUrl) {
	try {
		if (fortunesText == null) {
			const response = await fetch(fortuneFileUrl);

			if (!response.ok) {
				throw new Error(`Failed to fetch fortunes: ${response.status}`);
			}

			fortunesText = await response.text();
			fortunes = fortunesText.split('\n%\n').map(fortune => fortune.trim()).filter(fortune => fortune !== '');
		}

		if (fortunes.length === 0) {
			return "---";
		}

		const randomIndex = Math.floor(Math.random() * fortunes.length);

		return fortunes[randomIndex];

	} catch (error) {
		return "!!!";
	}
}

function showFortune(el) {
	getFortune('fortunes')
		.then(fortune => {
			el.innerHTML = fortune.split('\n').join('<br>');
		});
}

class LotteryWheel {
	constructor(wheelElement, spinButton, resultElement, inputSegmentsElement) {
		this.wheelElement = wheelElement;
		this.spinButton = spinButton;
		this.resultElement = resultElement;
		this.inputSegmentsElement = inputSegmentsElement;
		this.segments = this.getSegmentsFromInput();
		this.numSegments = this.segments.length;
		this.spinning = false;
		this.rotation = 0;
		this.radius = 95;
		this.centerX = 100;
		this.centerY = 100;
		this.markerOffset = -90;

		this.renderSegments();

		this.spinButton.addEventListener('click', () => {
			if (!this.spinning) {
				this.segments = this.getSegmentsFromInput();
				this.numSegments = this.segments.length;
				this.renderSegments();
				this.spin();
			}
		});
	}

	getSegmentsFromInput() {
		return this.inputSegmentsElement.value.split('\n').map(line => line.trim()).filter(line => line !== '');
	}

	renderSegments() {
		while (this.wheelElement.firstChild) {
			this.wheelElement.removeChild(this.wheelElement.firstChild);
		}

		if (this.segments.length == 0) {
			return;
		}

		this.segments.forEach((segment, index) => {
			const angleStart = (360 / this.numSegments) * index;
			const angleEnd = (360 / this.numSegments) * (index + 1);
			const midAngleDegrees = (angleStart + angleEnd) / 2;
			const midAngleRadians = midAngleDegrees * Math.PI / 180;
			const segmentAngleRadians = (angleEnd - angleStart) * Math.PI / 180;

			const largeArcFlag = angleEnd - angleStart <= 180 ? 0 : 1;
			const startX = this.centerX + this.radius * Math.cos(Math.PI * angleStart / 180);
			const startY = this.centerY + this.radius * Math.sin(Math.PI * angleStart / 180);
			const endX = this.centerX + this.radius * Math.cos(Math.PI * angleEnd / 180);
			const endY = this.centerY + this.radius * Math.sin(Math.PI * angleEnd / 180);

			const pathD = `M ${this.centerX},${this.centerY} L ${startX},${startY} A ${this.radius},${this.radius} 0 ${largeArcFlag},1 ${endX},${endY} Z`;

			const segmentElement = document.createElementNS('http://www.w3.org/2000/svg', 'g');
			segmentElement.classList.add('segment');

			const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
			path.classList.add('segment-path');
			path.setAttribute('d', pathD);
			path.setAttribute('fill', this.getSegmentColor(index));

			const textRadius = this.radius * 0.85;
			const textX = this.centerX + textRadius * Math.cos(midAngleRadians);
			const textY = this.centerY + textRadius * Math.sin(midAngleRadians);

			const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
			text.classList.add('segment-text');
			text.setAttribute('x', textX);
			text.setAttribute('y', textY);
			text.setAttribute('text-anchor', 'middle');
			text.setAttribute('dominant-baseline', 'central');
			text.style.transformOrigin = `${textX}px ${textY}px`;

			text.style.transform = `rotate(${midAngleDegrees + 90}deg)`;
			text.textContent = segment;

			const approximateTextWidth = segment.length * 10;
			const availableWidth = this.radius * Math.sin(segmentAngleRadians / 2) * 2 * 0.7;
			const scaleFactor = Math.min(1, availableWidth / approximateTextWidth);
			text.style.fontSize = `${1.2 * scaleFactor}em`;

			segmentElement.appendChild(path);
			segmentElement.appendChild(text);
			this.wheelElement.appendChild(segmentElement);
		});
	}

	getSegmentColor(index) {
		const colors = ['#e74c3c', '#f39c12', '#3498db', '#2ecc71', '#9b59b6', '#1abc9c', '#f1c40f', '#e67e22'];
		return colors[index % colors.length];
	}

	spin() {
		if (this.segments.length == 0) {
			return;
		}

		this.spinning = true;
		this.resultElement.textContent = '';
		const randomSpins = 5 + Math.random() * 15;
		this.rotation += 360 * randomSpins;
		const decelerationTime = 5000;
		const easeOutCubic = 'cubic-bezier(0.175, 0.885, 0.32, 1.275)';

		this.wheelElement.style.transition = `transform ${decelerationTime}ms ${easeOutCubic}`;
		this.wheelElement.style.transform = `rotate(${this.rotation}deg)`;

		setTimeout(() => {
			this.stopSpin();
		}, decelerationTime);
	}

	stopSpin() {
		this.wheelElement.style.transition = 'none';
		const degreesPerSegment = 360 / this.numSegments;
		const spunDegrees = this.rotation % 360;
		const rawWinningSegmentIndex = Math.floor((360 - spunDegrees + this.markerOffset) % 360 / degreesPerSegment);
		const winningSegmentIndex = rawWinningSegmentIndex >= 0 ? rawWinningSegmentIndex : this.numSegments + rawWinningSegmentIndex;
		const winningSegment = this.segments[winningSegmentIndex];
		this.resultElement.textContent = `${winningSegment} is the lucky winner!`;
		this.spinning = false;
		showFortune(footerTextElement);
	}
}

const wheelElement = document.querySelector('.svg-wheel');
const buttonSpin = document.getElementById('button-spin');
const resultElement = document.getElementById('container-result');
const inputSegmentsElement = document.getElementById('input-names');

inputSegmentsElement.textContent = Object.keys(queryParams).join('\n');

const myWheel = new LotteryWheel(wheelElement, buttonSpin, resultElement, inputSegmentsElement);

showFortune(footerTextElement);
