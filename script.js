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

function breakLongLines(text, element, maxWidth) {
    const words = text.split(' ');
    let line = '';
    let result = '';

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    context.font = getComputedStyle(element).font;

    for (const word of words) {
        const testLine = line + (line ? ' ' : '') + word;
        const testWidth = context.measureText(testLine).width;

        if (testWidth > maxWidth && line) {
            result += line + '<br>';
            line = word;
        } else {
            line = testLine;
        }
    }
    result += line;
    return result;
}

function showFortune(el) {
	getFortune('fortunes')
		.then(fortune => {
			let text = fortune.replaceAll('\n', ' ').trim();
			// Add line breaks after sentence-ending punctuation, but not if it's part of an ellipsis, a URL-like string, or inside parentheses
			text = text.replace(/(?<!\.)([.?!])(?![.?!'"]|\))/g, '$1<br>');

			const footer = document.querySelector('footer');
			const maxWidth = footer.clientWidth - 40; // Adjust for padding

			// For each segment created by a punctuation break, apply word wrapping if it's too long
			const lines = text.split('<br>');
			const wrappedLines = lines.map(line => breakLongLines(line.trim(), el, maxWidth));

			el.innerHTML = wrappedLines.join('<br>');
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
		return this.inputSegmentsElement.value.split('\n').map(line => {
			const trimmed = line.trim();
			if (trimmed) {
				const lower = trimmed.toLowerCase();
				return lower.charAt(0).toUpperCase() + lower.slice(1);
			}
			return '';
		}).filter(line => line !== '');
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
		const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FED766', '#2AB7CA', '#F0CF65', '#FE4A49', '#2C3E50'];
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
		const decelerationTime = 8000;
		const easeOut = 'ease-out';

		this.wheelElement.style.transition = `transform ${decelerationTime}ms ${easeOut}`;
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
		this.resultElement.innerHTML = `🎉 <span style="font-weight: bold; color: #ff4757;">${winningSegment}</span> is the lucky winner! 🥳`;
		this.spinning = false;
	}
}

const wheelElement = document.querySelector('.svg-wheel');
const buttonSpin = document.getElementById('button-spin');
const resultElement = document.getElementById('container-result');
const inputSegmentsElement = document.getElementById('input-names');

inputSegmentsElement.textContent = Object.keys(queryParams).join('\n');

const myWheel = new LotteryWheel(wheelElement, buttonSpin, resultElement, inputSegmentsElement);

showFortune(footerTextElement);
