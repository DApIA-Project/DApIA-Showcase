
import { Noise2D, genSeed, multiLayeredNoise } from './noise';

import { FBXLoader } from './threeAddons/loaders/FBXLoader';

import * as THREE from 'three';
import { genColorArray, rgb2hex } from './utils';

const SAMPLES = 1/4; // pts per unit

function sfloor(x, n){
    return Math.floor(x / n) * n;
}

function im_getPosition(instanced_mesh:THREE.InstancedMesh, i:number):THREE.Vector3{
    return new THREE.Vector3(
        instanced_mesh.instanceMatrix.array[i*16+12],
        instanced_mesh.instanceMatrix.array[i*16+13],
        instanced_mesh.instanceMatrix.array[i*16+14]);
}
function im_getX(instanced_mesh:THREE.InstancedMesh, i:number):number{
    return instanced_mesh.instanceMatrix.array[i*16+12];
}
function im_getY(instanced_mesh:THREE.InstancedMesh, i:number):number{
    return instanced_mesh.instanceMatrix.array[i*16+13];
}
function im_getZ(instanced_mesh:THREE.InstancedMesh, i:number):number{

    return instanced_mesh.instanceMatrix.array[i*16+14];
}
function im_setPosition(instanced_mesh:THREE.InstancedMesh, i:number, pos):void{
    instanced_mesh.instanceMatrix.array[i*16+12] = pos.x;
    instanced_mesh.instanceMatrix.array[i*16+13] = pos.y;
    instanced_mesh.instanceMatrix.array[i*16+14] = pos.z;
}
function im_setX(instanced_mesh:THREE.InstancedMesh, i:number, x:number):void{
    instanced_mesh.instanceMatrix.array[i*16+12] = x;
}
function im_setY(instanced_mesh:THREE.InstancedMesh, i:number, y:number):void{
    instanced_mesh.instanceMatrix.array[i*16+13] = y;
}
function im_setZ(instanced_mesh:THREE.InstancedMesh, i:number, z:number):void{
    instanced_mesh.instanceMatrix.array[i*16+14] = z;
}




function f_amp(x) {return Math.exp(-(5*(x)**2))}
function f_tree_amp(x){
    const C = 0.5;
    const H = 15;

    if (x > HIGH_PEAK_ZONE) return 0;
    if (x > HIGH_PEAK_ZONE - H) return (HIGH_PEAK_ZONE - x) / H;
    if (x > CAMPAIGN_ZONE + C) return 1;
    if (x > CAMPAIGN_ZONE) return (x - CAMPAIGN_ZONE) / C;
    return 0;
}


const CAMPAIGN_ZONE = 0;
const MOUNTAIN_ZONE = 20;
const HIGH_PEAK_ZONE = 35;
const COLORS = [
    [94, 173, 52], // CAMPAGNE
    [158, 119, 51], // MONTAGNE
    [209, 216, 224] // NEIGE

].map((c) => [c[0]/255, c[1]/255, c[2]/255])


const min_amplitude = 0.0;
const max_amplitude = 60.0;


const tree_model = require("../assets/tree.fbx");
const cloud_models = [
    require("../assets/Cloud_1.fbx"),
    require("../assets/Cloud_2.fbx"),
    require("../assets/Cloud_3.fbx"),
    require("../assets/Cloud_4.fbx")
];

export class Mountain{

    width: number;
    length: number;
    GROUND_SIZE_W: number;
    GROUND_SIZE_L: number;
    THREE_INSTANCE_MAX = 1000;
    CLOUD_INSTANCE_MAX = 10;


    floor: THREE.Mesh;
    seed_floor = genSeed(2)

    trees: THREE.InstancedMesh[] = [];
    seed_tree = genSeed(1)
    TREES_INIT_MATRIX = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(-Math.PI/2, 0, 0)).scale(new THREE.Vector3(3, 3, 3));

    clouds: THREE.InstancedMesh[] = [];
    seed_cloud = genSeed(1)

    trajectory: THREE.Mesh;



    mesh_loaded = -6
    _onLoad_

    debug_mesh:THREE.InstancedMesh;



    origin: THREE.Vector3;
    last_shift = 0;
    shift = 0;


    constructor(width:number, length:number){

        this.GROUND_SIZE_W = width * SAMPLES;
        this.GROUND_SIZE_L = length * SAMPLES;

        this.width = width;
        this.length = length;
        this.origin = new THREE.Vector3(0, 0, 0);
        this.shift = 0;
        this.last_shift = 0;


        this.loadTreeModel();
        this.loadCloudModel();

        // create a grid of points
        const geometry = new THREE.PlaneGeometry(this.width, this.length, this.GROUND_SIZE_W-1, this.GROUND_SIZE_L-1);
        geometry.setAttribute('color', genColorArray(new THREE.Color(0xfffff), geometry.attributes.position.count));

        const material = new THREE.MeshStandardMaterial({ side: THREE.FrontSide, vertexColors: true })
        this.floor = new THREE.Mesh(geometry, material);
        this.floor.receiveShadow = true;
        this.floor.castShadow = false;

        this.add_mesh_loaded()

        var s = new THREE.SphereGeometry(0.1, 8, 4);
        var m = new THREE.MeshBasicMaterial({color: 0xff0000});
        this.debug_mesh = new THREE.InstancedMesh(s, m, this.GROUND_SIZE_W * this.GROUND_SIZE_L);
    

        var trajectoryGeometry = new THREE.PlaneGeometry(0.5, 400, 1, 1);  
        trajectoryGeometry.attributes.position.setXYZ(0, 0.2, 5, -15); 
        trajectoryGeometry.attributes.position.setXYZ(1, -0.2, 5, -15);
        trajectoryGeometry.attributes.position.setXYZ(2, 0.15, 5, -40);
        trajectoryGeometry.attributes.position.setXYZ(3, -0.15, 5, -40);        
        trajectoryGeometry.setAttribute('color', genColorArray(new THREE.Color(rgb2hex(44, 44, 184)), trajectoryGeometry.attributes.position.count));

        var trajectoryMaterial = new THREE.MeshBasicMaterial({ side: THREE.FrontSide, vertexColors: true });

        this.trajectory = new THREE.Mesh(trajectoryGeometry, trajectoryMaterial);

        

    }

    public setPosition(x, y, z){
        this.origin = new THREE.Vector3(x, y, z);
        this.computeMoutainModel();
    }

    public update(scoll_offset){
        if (scoll_offset > 80){
            var t = new Date().getTime() / 1000.0;
            // this.plane.position.y = Math.cos(t*1.5) * 0.25;
            var y = Math.cos(t* 1.5) * 0.25;
            this.trajectory.geometry.attributes.position.setXYZ(0, 0.2, 5 + y, -15);
            this.trajectory.geometry.attributes.position.setXYZ(1, -0.2, 5 + y, -15);
            // this.trajectory.geometry.attributes.position.setXYZ(2, 0.15, 5 + y, -40);
            // this.trajectory.geometry.attributes.position.setXYZ(3, -0.15, 5 + y, -40);

            this.trajectory.geometry.attributes.position.needsUpdate = true;
        }
    }


    /////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //////                               PROCEDURAL GENERATION
    /////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    private computeMoutainModel(){
        if (this.mesh_loaded < 0) return;

        for (let i = 0; i < this.trees.length; i++) {
            this.trees[i].count = 0;
        }
        for (var zi = 0; zi < this.GROUND_SIZE_L; zi++) {
            this.computeMountainLayer(zi);
        }
        this.computeNormals()
    }


    public computeMountainLayer(zi, shift=0){
        const X_NORM = [-0.2, 1 ]
        const MOUNTAIN_FREQ = 0.015;
        const TREE_FREQ = 0.05;

        const CLOUD_FREQ = 0.05;
        const CLOUD_PROBA = 0.1;


        var vertices = this.floor.geometry.getAttribute('position').array;
        var colors = this.floor.geometry.getAttribute('color').array;


        for (var xi = 0; xi < this.GROUND_SIZE_W; xi++) {


            
            var xn = 1-Math.abs((xi / (this.GROUND_SIZE_W-1)) * 2 - 1) * (X_NORM[1] - X_NORM[0]);
            var moutain_amp = f_amp(xn) * (max_amplitude - min_amplitude) + min_amplitude;


            var x = xi / SAMPLES - this.width / 2.0 + this.origin.x;
            var z = zi / SAMPLES - this.width / 2.0 + this.origin.z;

            var moutain_noise = multiLayeredNoise(x * MOUNTAIN_FREQ, (z + shift - this.origin.z)  * MOUNTAIN_FREQ, this.seed_floor) * moutain_amp;
            var y = moutain_noise + this.origin.y;

            var color_i = 0;
            if (y - this.origin.y > MOUNTAIN_ZONE){
                color_i = 1;
            }
            if (y - this.origin.y > HIGH_PEAK_ZONE){
                color_i = 2;
            }
            
            var i = xi + zi * this.GROUND_SIZE_W;

            
            colors[i * 3 + 0] = COLORS[color_i][0]
            colors[i * 3 + 1] = COLORS[color_i][1]
            colors[i * 3 + 2] = COLORS[color_i][2]

            vertices[i * 3 + 0] = x
            vertices[i * 3 + 1] = y//f_tree_amp(amp) * 20
            vertices[i * 3 + 2] = z
            im_setPosition(this.debug_mesh, i, new THREE.Vector3(x, y, z));

            
            var amp = f_tree_amp(y - this.origin.y);
            var tree_noise = multiLayeredNoise(x * TREE_FREQ, (z + shift - this.origin.z)  * TREE_FREQ, this.seed_tree)* amp;
            if (tree_noise > 0.65 && 
                x > this.origin.x - this.width/2.0 + this.width/15.0 && 
                x < this.origin.x + this.width/2.0 + this.width/15.0 && 
                xi != this.GROUND_SIZE_W-1)
            {

                var first_free = this.trees[0].count;
                if (first_free >= this.THREE_INSTANCE_MAX) continue;

                // x += 1;
                var cxi = xi + (Math.random()-0.5);
                var czi = zi + (Math.random()-0.5);
                var xn = 1-Math.abs((cxi / (this.GROUND_SIZE_W-1)) * 2 - 1) * (X_NORM[1] - X_NORM[0]);
                var moutain_amp = f_amp(xn) * (max_amplitude - min_amplitude) + min_amplitude;

                var x = cxi / SAMPLES - this.width / 2.0 + this.origin.x;
                var z = czi / SAMPLES - this.width / 2.0 + this.origin.z;

                var moutain_noise = multiLayeredNoise(x * MOUNTAIN_FREQ, (z + shift - this.origin.z)  * MOUNTAIN_FREQ, this.seed_floor) * moutain_amp;
                var y = moutain_noise + this.origin.y;


                this.trees[0].count += 1;
                this.trees[1].count += 1;
                this.trees[0].setMatrixAt(first_free, this.TREES_INIT_MATRIX.multiply(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(0, 0, Math.random()*Math.PI*2))));
                this.trees[1].setMatrixAt(first_free, this.TREES_INIT_MATRIX.multiply(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(0, 0, Math.random()*Math.PI*2))));
                im_setPosition(this.trees[0], first_free, new THREE.Vector3(x, y, z));
                im_setPosition(this.trees[1], first_free, new THREE.Vector3(x, y, z));
            }
            var cloud_noise = multiLayeredNoise(x * CLOUD_FREQ, (z + shift - this.origin.z)  * CLOUD_FREQ, this.seed_cloud);
            var cloud_id = Math.floor(Math.random() * this.clouds.length);
            if (cloud_noise < CLOUD_PROBA){
                var first_free = this.clouds[cloud_id].count;
                if (first_free >= this.CLOUD_INSTANCE_MAX) continue;
                this.clouds[cloud_id].count += 1;
                this.clouds[cloud_id].setMatrixAt(first_free, new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(0, Math.random()*Math.PI*2, 0)));
                im_setPosition(this.clouds[cloud_id], first_free, new THREE.Vector3(x, 30, z));
            }
        }
    }

    private shift_vertexs(to_shift){
        var vertices = this.floor.geometry.getAttribute('position').array;
        var colors = this.floor.geometry.getAttribute('color').array;

        var zio = 0
        var sens = 1
        if (to_shift < 0){
            zio = this.GROUND_SIZE_L - 1
            sens = -1
        }

        for (var xi = 0; xi < this.GROUND_SIZE_W; xi++) {
            var zi = zio;

            while (zi + to_shift < this.GROUND_SIZE_L && zi + to_shift >= 0){

                var i = xi + zi * this.GROUND_SIZE_W;
                var to_i = xi + (zi + to_shift) * this.GROUND_SIZE_W;

                vertices[i * 3 + 1] = vertices[to_i * 3 + 1];
                colors[i * 3 + 0] = colors[to_i * 3 + 0];
                colors[i * 3 + 1] = colors[to_i * 3 + 1];
                colors[i * 3 + 2] = colors[to_i * 3 + 2];

                var y = im_getY(this.debug_mesh, to_i);
                im_setY(this.debug_mesh, i, y);

                zi += sens;
            }
        }

        this.debug_mesh.instanceMatrix.needsUpdate = true;
    }

    private shift_trees(to_shift){
        for (let i = 0; i < this.trees.length; i++) {
            for (let j = 0; j < this.trees[i].count; j++) {
                var p = im_getPosition(this.trees[i], j);
                p.z -= to_shift;
                im_setPosition(this.trees[i], j, p);
            }
        }
    }

    private shift_clouds(to_shift){
        for (let i = 0; i < this.clouds.length; i++) {
            for (let j = 0; j < this.clouds[i].count; j++) {
                var p = im_getPosition(this.clouds[i], j);
                p.z -= to_shift;
                im_setPosition(this.clouds[i], j, p);
            }
        }
    }


    public shift_noise(v){
        this.shift += v;

        var rshift = sfloor(this.shift, 1.0/SAMPLES);
        var decay = this.shift - rshift;


        var to_shift = (rshift - this.last_shift) * SAMPLES;
        if (Math.abs(to_shift) >= 1){

            var vertices = this.floor.geometry.getAttribute('position').array;
            var colors = this.floor.geometry.getAttribute('color').array;

            var zio = this.GROUND_SIZE_L
            var sens = 1
            if (to_shift < 0){
                zio = -1
                sens = -1
            }

            this.shift_vertexs(to_shift)
            this.shift_trees(to_shift/SAMPLES)
            this.shift_clouds(to_shift/SAMPLES)
            var zi = zio - to_shift;
            while (zi < this.GROUND_SIZE_L && zi >= 0){
                this.computeMountainLayer(zi, rshift);
                zi += sens;
            }

            this.floor.geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
            this.floor.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

            this.last_shift = rshift;
        }
        this.floor.position.z = -decay
        this.debug_mesh.position.z = -decay
        for (let i = 0; i < this.trees.length; i++) {
            this.trees[i].position.z = -decay
        }
        for (let i = 0; i < this.clouds.length; i++) {
            this.clouds[i].position.z = -decay
        }

        this.drop_trees()
        this.drop_clouds()

        for (let j = 0; j < this.trees.length; j++) {
            this.trees[j].instanceMatrix.needsUpdate = true;
        }
        for (let j = 0; j < this.clouds.length; j++) {
            this.clouds[j].instanceMatrix.needsUpdate = true;
        }
        this.computeNormals()
    }

    private drop_trees(){
        let to_drop = []
        for (let j = 0; j < this.trees[0].count; j++) {
            for (let i = 0; i < this.trees.length; i++) {
                var z = im_getZ(this.trees[i], j);
                if (z < this.origin.z - this.width /2.0 - 10 || z > this.origin.z + this.length - this.width/2.0 + 10){
                    if (i == 0)
                        to_drop.push(j);
                }
            }
        }
        for (let j = to_drop.length-1; j >= 0; j--) {
            for (let i = to_drop[j]; i < this.trees[0].count-1; i++) {
                for (let k = 0; k < this.trees.length; k++) {
                    var  p = im_getPosition(this.trees[k], i+1)
                    im_setPosition(this.trees[k], i, p);
                }
            }
        }
        for (let j = 0; j < this.trees.length; j++) {
            this.trees[j].count -= to_drop.length;
        }
    }

    private drop_clouds(){
        for (let c = 0; c < this.clouds.length; c++) {
            let to_drop = []
            for (let j = 0; j < this.clouds[c].count; j++) {
                var z = im_getZ(this.clouds[c], j);
                if (z < this.origin.z - this.width /2.0 - 10 || z > this.origin.z + this.length - this.width/2.0 + 10){
                    to_drop.push(j);
                }
            }
            for (let j = to_drop.length-1; j >= 0; j--) {
                for (let i = to_drop[j]; i < this.clouds[c].count-1; i++) {
                    var  p = im_getPosition(this.clouds[c], i+1)
                    im_setPosition(this.clouds[c], i, p);
                }
            }
            this.clouds[c].count -= to_drop.length;
        }
    }




    /////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //////                               LOADING FUNCTIONS
    /////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    private loadTreeModel(){
        const fbxLoader = new FBXLoader();
        fbxLoader.load(tree_model, (object) => {


            let v = 0
            v = object.children[1].geometry.attributes.position.count;
            object.children[1].geometry.setAttribute('color', genColorArray(new THREE.Color(40/255, 180/255, 100/255), v), 3);
            object.children[1].material = new THREE.MeshStandardMaterial({ side: THREE.FrontSide, vertexColors: true });

            v = object.children[0].geometry.attributes.position.count;
            object.children[0].geometry.setAttribute('color', genColorArray(new THREE.Color(0xd35400), v), 3);
            object.children[0].material = new THREE.MeshStandardMaterial({ side: THREE.FrontSide, vertexColors: true });

            for (let i = 0; i < object.children.length; i++) {
                var position = object.children[i].geometry.attributes.position.array;
                for (let i = 0; i < position.length; i+=3) {
                    position[i+2] += 0.2;
                }
            }

            var object0 = new THREE.InstancedMesh(object.children[0].geometry, object.children[0].material, this.THREE_INSTANCE_MAX);
            var object1 = new THREE.InstancedMesh(object.children[1].geometry, object.children[1].material, this.THREE_INSTANCE_MAX);
            object0.count = 0;
            object1.count = 0;
            object0.castShadow = true;
            object1.castShadow = true;
            object0.receiveShadow = false;
            object1.receiveShadow = false;

            this.trees = [object0, object1];
            this.add_mesh_loaded()
        });
    }

    private loadCloudModel(){
        const fbxLoader = new FBXLoader();
        for (let i = 0; i < cloud_models.length; i++) {

            fbxLoader.load(cloud_models[i], (object) => {
                
                object.children[0].geometry.setAttribute('color', genColorArray(new THREE.Color(1, 1, 1), object.children[0].geometry.attributes.position.count), 3);
                object.children[0].material = new THREE.MeshStandardMaterial({ side: THREE.FrontSide, vertexColors: true });

                var object0 = new THREE.InstancedMesh(object.children[0].geometry, object.children[0].material, this.CLOUD_INSTANCE_MAX);
                object0.count = 0;
                object0.castShadow = false;
                object0.receiveShadow = false;
                // im_setPosition(object0, 0, new THREE.Vector3(Math.random()*60-30, 30, Math.random()*60-30));
                this.clouds.push(object0);
                this.add_mesh_loaded()
            });
        }
    }

    public onLoad(f){
        this._onLoad_ = f
    }

    public getMeshs(){
        var meshs = [this.floor, this.trajectory];
        // meshs.push(this.debug_mesh);
        for (let i = 0; i < this.trees.length; i++) {
            meshs.push(this.trees[i]);
        }
        for (let i = 0; i < this.clouds.length; i++) {
            meshs.push(this.clouds[i]);
        }
        return meshs;
    }


    /////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //////                               PRIVATE
    /////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    private computeNormals(){
        
        this.floor.geometry.computeVertexNormals();
        // set the normals of the sides to vertical
        var normals = this.floor.geometry.getAttribute('normal').array;

        for (var zi = 0; zi < this.GROUND_SIZE_L; zi++) {
            var xi = 0;
            var i = xi + zi * this.GROUND_SIZE_W;
            normals[i * 3 + 0] = 0;
            normals[i * 3 + 1] = 1;
            normals[i * 3 + 2] = 0;

            xi = this.GROUND_SIZE_W - 1;
            i = xi + zi * this.GROUND_SIZE_W;
            normals[i * 3 + 0] = 0;
            normals[i * 3 + 1] = 1;
            normals[i * 3 + 2] = 0;
        }

        for (let i = 0; i < this.trees.length; i++) {
            this.trees[i].geometry.computeVertexNormals();
        }
    }


    private add_mesh_loaded(){
        this.mesh_loaded +=1
        if (this.mesh_loaded == 0){
            this._onLoad_()
            this.computeMoutainModel()
        }

    }

}


    // private plane_vertexs(xi, zi){

    //     const XR = 2
    //     const YR = 1
    //     const FA = 3
        

    //     if (xi > 0 && xi < this.GROUND_SIZE_W-1 && zi > 0 && zi < this.GROUND_SIZE_L-1){
    //         return [
    //             ((xi-1) * XR + 0) * FA + 1  + (zi-1) * this.GROUND_SIZE_W * FA * XR * YR, // left bottom
    //             ((xi-1) * XR + 1) * FA + 1  + (zi-1) * this.GROUND_SIZE_W * FA * XR * YR, // middle bottom
    //             ((xi+0) * XR + 0) * FA + 0  + (zi-1) * this.GROUND_SIZE_W * FA * XR * YR, // right bottom
    //             ((xi-1) * XR + 1) * FA + 2  + (zi) * this.GROUND_SIZE_W * FA * XR * YR,   // left top
    //             ((xi+0) * XR + 0) * FA + 2  + (zi) * this.GROUND_SIZE_W * FA * XR * YR,   // right top
    //             ((xi+0) * XR + 1) * FA + 0  + (zi) * this.GROUND_SIZE_W * FA * XR * YR,   // middle top
    //         ]
    //     }
    //     if (xi == 0 && zi > 0 && zi < this.GROUND_SIZE_L-1){
    //         return [
    //             ((xi+0) * XR + 0) * FA + 0  + (zi-1) * this.GROUND_SIZE_W * FA * XR * YR, // right bottom
    //             ((xi+0) * XR + 0) * FA + 2  + (zi) * this.GROUND_SIZE_W * FA * XR * YR,  // right top
    //             ((xi+0) * XR + 1) * FA + 0  + (zi) * this.GROUND_SIZE_W * FA * XR * YR,  // middle top
    //         ]
    //     }
    //     if (xi == this.GROUND_SIZE_W-1 && zi > 0 && zi < this.GROUND_SIZE_L-1){
    //         return [
    //             ((xi-1) * XR + 0) * FA + 1  + (zi-1) * this.GROUND_SIZE_W * FA * XR * YR, // left bottom
    //             ((xi-1) * XR + 1) * FA + 1  + (zi-1) * this.GROUND_SIZE_W * FA * XR * YR, // middle bottom
    //             ((xi-1) * XR + 1) * FA + 2  + (zi) * this.GROUND_SIZE_W * FA * XR * YR,   // left top
    //         ]
    //     }
    //     if (zi == 0 && xi > 0 && xi < this.GROUND_SIZE_W-1){
    //         return [
    //             ((xi-1) * XR + 1) * FA + 2  + (zi) * this.GROUND_SIZE_W * FA * XR * YR,   // left top
    //             ((xi+0) * XR + 0) * FA + 2  + (zi) * this.GROUND_SIZE_W * FA * XR * YR,   // right top
    //             ((xi+0) * XR + 1) * FA + 0  + (zi) * this.GROUND_SIZE_W * FA * XR * YR,   // middle top
    //         ]
    //     }
    //     if (zi == this.GROUND_SIZE_L-1 && xi > 0 && xi < this.GROUND_SIZE_W-1){
    //         return [
    //             ((xi-1) * XR + 0) * FA + 1  + (zi-1) * this.GROUND_SIZE_W * FA * XR * YR, // left bottom
    //             ((xi-1) * XR + 1) * FA + 1  + (zi-1) * this.GROUND_SIZE_W * FA * XR * YR, // middle bottom
    //             ((xi+0) * XR + 0) * FA + 0  + (zi-1) * this.GROUND_SIZE_W * FA * XR * YR, // right bottom
    //         ]
    //     }

    //     return []
    // }