


class Vector2 {
	x: number;
	y: number;

	constructor(x, y) {
		this.x = x;
		this.y = y;
	}

	dot(other) {
		return this.x*other.x + this.y*other.y;
	}
}

function Shuffle(arrayToShuffle) {
	for(let e = arrayToShuffle.length-1; e > 0; e--) {
		const index = Math.round(Math.random()*(e-1));
		const temp = arrayToShuffle[e];
		
		arrayToShuffle[e] = arrayToShuffle[index];
		arrayToShuffle[index] = temp;
	}
}

export function genSeed(detail) {
	const permutations = [];
	for (let i = 0; i < detail; i++) {

		const perm = [];
		for(let i = 0; i < 256; i++) {
			perm.push(i);
		}
		Shuffle(perm);
		for(let i = 0; i < 256; i++) {
			perm.push(perm[i]);
		}
		permutations.push(perm)
	}
	return permutations;
}

function GetConstantVector(v) {
	// v is the value from the permutation table
	const h = v & 3;
	if(h == 0)
		return new Vector2(1.0, 1.0);
	else if(h == 1)
		return new Vector2(-1.0, 1.0);
	else if(h == 2)
		return new Vector2(-1.0, -1.0);
	else
		return new Vector2(1.0, -1.0);
}

function Fade(t) {
	return ((6*t - 15)*t + 10)*t*t*t;
}

function Lerp(t, a1, a2) {
	return a1 + t*(a2-a1);
}


export function Noise2D(x, y, perm) {
	const X = Math.floor(x) & 255;
	const Y = Math.floor(y) & 255;

	const xf = x-Math.floor(x);
	const yf = y-Math.floor(y);

	const topRight = new Vector2(xf-1.0, yf-1.0);
	const topLeft = new Vector2(xf, yf-1.0);
	const bottomRight = new Vector2(xf-1.0, yf);
	const bottomLeft = new Vector2(xf, yf);
	
	// Select a value from the permutation array for each of the 4 corners
	const valueTopRight = perm[perm[X+1]+Y+1];
	const valueTopLeft = perm[perm[X]+Y+1];
	const valueBottomRight = perm[perm[X+1]+Y];
	const valueBottomLeft = perm[perm[X]+Y];
	
	const dotTopRight = topRight.dot(GetConstantVector(valueTopRight));
	const dotTopLeft = topLeft.dot(GetConstantVector(valueTopLeft));
	const dotBottomRight = bottomRight.dot(GetConstantVector(valueBottomRight));
	const dotBottomLeft = bottomLeft.dot(GetConstantVector(valueBottomLeft));
	
	const u = Fade(xf);
	const v = Fade(yf);
	
	return Lerp(u,
		Lerp(v, dotBottomLeft, dotTopLeft),
		Lerp(v, dotBottomRight, dotTopRight)
	); 
}


export function multiLayeredNoise(x, y, seed) {

	let result = 0;
	let tot = 0;
	for(let i = 0; i < seed.length; i++) {
		let x_p = x * 2**i;
		let y_p = y * 2**i;

		result += Noise2D(x_p, y_p, seed[i]) / (2.0**i);
		tot += 1.0 / (2.0**i);
	}
	
	return (result/tot + 1) / (2.0);
}
