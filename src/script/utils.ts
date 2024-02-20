import * as THREE from 'three';

export function modulo(a, b){
    return ((a % b) + b) % b;
}

export function genColorArray(color:THREE.Color, n:number){
    var arr = [];
    for (let i = 0; i < n; i++) {
        arr.push(color.r, color.g, color.b);
    }
    return new THREE.BufferAttribute(new Float32Array(arr), 3);
}

export function rgb2hex(r, g, b){
    return (r << 16) + (g << 8) + b;
}