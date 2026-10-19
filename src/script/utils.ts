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

export function im_getPosition(instanced_mesh:THREE.InstancedMesh, i:number):THREE.Vector3{
    return new THREE.Vector3(
        instanced_mesh.instanceMatrix.array[i*16+12],
        instanced_mesh.instanceMatrix.array[i*16+13],
        instanced_mesh.instanceMatrix.array[i*16+14]);
}
export function im_getX(instanced_mesh:THREE.InstancedMesh, i:number):number{
    return instanced_mesh.instanceMatrix.array[i*16+12];
}
export function im_getY(instanced_mesh:THREE.InstancedMesh, i:number):number{
    return instanced_mesh.instanceMatrix.array[i*16+13];
}
export function im_getZ(instanced_mesh:THREE.InstancedMesh, i:number):number{

    return instanced_mesh.instanceMatrix.array[i*16+14];
}
export function im_setPosition(instanced_mesh:THREE.InstancedMesh, i:number, pos):void{
    instanced_mesh.instanceMatrix.array[i*16+12] = pos.x;
    instanced_mesh.instanceMatrix.array[i*16+13] = pos.y;
    instanced_mesh.instanceMatrix.array[i*16+14] = pos.z;
}
export function im_setX(instanced_mesh:THREE.InstancedMesh, i:number, x:number):void{
    instanced_mesh.instanceMatrix.array[i*16+12] = x;
}
export function im_setY(instanced_mesh:THREE.InstancedMesh, i:number, y:number):void{
    instanced_mesh.instanceMatrix.array[i*16+13] = y;
}
export function im_setZ(instanced_mesh:THREE.InstancedMesh, i:number, z:number):void{
    instanced_mesh.instanceMatrix.array[i*16+14] = z;
}
