
import * as THREE from 'three';
import { LightProbeGenerator } from './threeAddons/lights/LightProbeGenerator.js';
import { Mountain } from './mountain';
import { OBJLoader } from './threeAddons/loaders/OBJLoarder';
import { Html3D } from './Html3D';
import { modulo, rgb2hex } from './utils';



const API = {
    lightProbeIntensity: 1.0,
    directionalLightIntensity: 0.6,
    envMapIntensity: 1
};

const FRAME_RATE = 30;
const VIEW = {fov:75, near:0.1,far:1000}

const GROUND_WIDTH = 128;
const GROUND_LENGHT = 500;
const GROUND_SAMPLES = 1; // pts per unit
const GROUND_SIZE_W = GROUND_WIDTH * GROUND_SAMPLES;
const GROUND_SIZE_L = GROUND_LENGHT * GROUND_SAMPLES;

const plane_model = require("../assets/LP_Airplane.obj");


const MAX_SPEED  = 170.0/10.0;
const ACCERATION =  20.0/10.0;

class app{

    scene:THREE.Scene;
    renderer:THREE.WebGLRenderer;
    view:THREE.PerspectiveCamera;
    floor:THREE.Mesh;

    rotate = false;
    mouse = {x:0, y:0};

    mountain:Mountain;
    plane:THREE.Object3D;


    texts:Html3D[] = [];

    scoll_offset = 0;
    scroll_momentum = 0;
    move_forward = 1;
    last_stop = 0;
    skipping = false;
    stop_skipping = false;

    main_title = true;



    init() {

        this.scene = new THREE.Scene();
        // this.scene.background = new THREE.Color(rgb2hex(169, 199, 201));

        this.view = new THREE.PerspectiveCamera(VIEW.fov, window.innerWidth / window.innerHeight, VIEW.near, VIEW.far);
        this.view.position.z = -50;
        this.view.position.y = 15;
        this.view.position.x = 5;
        this.view.lookAt(0, 10, 0);

        // const ambientLight = new THREE.AmbientLight(0x999999); // soft white light
        // this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(rgb2hex(255, 221, 179), 1.0);
        directionalLight.position.set(-10, 50, -20);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048; // default
        directionalLight.shadow.mapSize.height = 2048; // default
        directionalLight.shadow.camera.near = 0.5; // default
        directionalLight.shadow.camera.far = 200; // default
        directionalLight.shadow.camera.left = -50;
        directionalLight.shadow.camera.right = 150;
        directionalLight.shadow.camera.top = 150;
        directionalLight.shadow.camera.bottom = -50;
        this.scene.add(directionalLight);
        // this.scene.add( new THREE.CameraHelper( directionalLight.shadow.camera ) );

        const hemiLight = new THREE.HemisphereLight(
            rgb2hex(255, 255, 255),
            rgb2hex(84, 71, 148), 1);
        hemiLight.position.set(-10, 50, -20);
        this.scene.add(hemiLight);


        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, canvas: document.getElementById('threejs')});
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.toneMapping = THREE.ReinhardToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        
        // document.body.appendChild(this.renderer.domElement);

        
        this.mountain = new Mountain(GROUND_WIDTH, GROUND_LENGHT);
        this.mountain.setPosition(0, -40, 0);

        this.mountain.onLoad(()=>{
            var meshes = this.mountain.getMeshs()
            for (let i = 0; i < meshes.length; i++) {
                this.scene.add(meshes[i])
            }
        });

        const objLoader = new OBJLoader();
        objLoader.load(plane_model, (object) => {
            // rotate 90 degrees
            object.rotation.y = -Math.PI/2;
            object.scale.set(6, 6, 6);
            this.plane = object;
            // this.plane.castShadow = true;
            for (let i = 0; i < this.plane.children.length; i++) {
                this.plane.children[i].castShadow = true;
                this.plane.children[i].receiveShadow = true;
            }
            
            this.scene.add(this.plane);
        });

        


        var title = new Html3D('<div class="text-container"> <h1> Projet DAPIA </h1> <h2> Sécuriser le contrôle du traffic aérien </h2> <div>'); //<span class="material-icons-outlined big"> south </span> 
        title.setPosition(0, 20, 10);
        this.texts.push(title);

        for (let i = 1; i < 5; i++) {
            var paragraph = new Html3D('<div class="text-container"> <h1> Lorem ipsum dolor sit amet </h1> <p> Consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum </p> <div>');
            paragraph.setPosition(0, 20, i * 500 + 10);
            this.texts.push(paragraph);
        }


        
        setInterval(()=>{
            this.frame()
            for (let i = 0; i < this.texts.length; i++) {
                this.texts[i].render(this.view);
            }
            this.render()
        }, 1000.0/FRAME_RATE);
    }

    frame(){
        var t = new Date().getTime() / 1000.0;
        if (this.scoll_offset > 80){
            this.plane.position.y = Math.cos(t*1.5) * 0.25;
        }

        var scoll_interval = modulo(this.scoll_offset, 500);
        var scoll_region = Math.floor((this.scoll_offset+200) / 500) * 500;
        
        
        // if we are in the middle of two pages : fast scroll
        if ((scoll_interval > 150 && scoll_interval < 450))
        {
            this.skipping = true;
            this.scroll_momentum += this.move_forward * ACCERATION;
            if (Math.abs(this.scroll_momentum) > MAX_SPEED){
                this.scroll_momentum = MAX_SPEED * this.move_forward;
            }
        }
        
        // if we get out of a skip zone, we must slow down !
        else if (this.skipping){
            // activate air resistance
            this.stop_skipping = true;

            // manage perfect stop
            if (this.move_forward > 0){
                var scroll_stop = scoll_region + 0

                if (this.scoll_offset + this.scroll_momentum > scroll_stop){
                    this.scroll_momentum = (scroll_stop - this.scoll_offset)/2.0;
                    if ((scroll_stop - this.scoll_offset) < 1.0) this.scroll_momentum = (scroll_stop - this.scoll_offset)
                }
            }
            else{
                var scroll_stop = scoll_region + 0
                if (this.move_forward < 0 && this.scoll_offset + this.scroll_momentum < scroll_stop){
                    this.scroll_momentum = (scroll_stop - this.scoll_offset)/2.0;
                    if ((scroll_stop - this.scoll_offset) > -1.0) this.scroll_momentum = (scroll_stop - this.scoll_offset)
                }
            }
        }

        
        if (Math.abs(this.scroll_momentum) > 0.1){
            this.forward(this.scroll_momentum);
        }
        else{
            this.scroll_momentum = 0;
            this.skipping = false;
            this.stop_skipping = false;
        }

        // apply the down force
        if (this.skipping){
            if (!this.stop_skipping) this.scroll_momentum *= 1.0;
            else this.scroll_momentum *= 0.90;
        }
        else{
            this.scroll_momentum *= 0.75;
        }

        this.mountain.update(this.scoll_offset);
    }

    render(){
        this.renderer.render(this.scene, this.view);
    }



    forward(speed){
        var scoll = speed;
        if (scoll > 0) this.move_forward = 1;
        else this.move_forward = -1;

        // force the backward if the user scroll back to title
        if (this.scoll_offset < 100 && this.move_forward < 0){
            this.scroll_momentum = -MAX_SPEED;
        }

        if (this.move_forward < 0){
            if (this.scoll_offset + scoll <= 250){

                if (!this.main_title){
                    this.main_title = true;
                    this.anime_in();
                }
            }
        } else {
            if (this.scoll_offset + scoll > 0){
                if (this.main_title){
                    this.main_title = false;
                    this.anime_out();
                }
            }
        }
        if (this.scoll_offset + scoll < 0){
            scoll = -this.scoll_offset;
        }

        this.scoll_offset += scoll;
        this.mountain.shift_noise(scoll);

        for (let i = 0; i < this.texts.length; i++) {
            let z = i*500 + 10 - this.scoll_offset;
            if (z > 10){
                this.texts[i].setPosition(0, 20, 10+ i*500 - this.scoll_offset);
            }
            else{
                this.texts[i].setPosition(0, 20 + (-i * 500 + this.scoll_offset) * 0.07, 10);
            }
        }

    }






    right_pressed(e){
        this.rotate = true;
        this.mouse = {x:e.clientX, y:e.clientY};
    }

    right_released(){
        this.rotate = false;
    }

    mouse_move(event){
        if(this.rotate){
            const dx = event.clientX - this.mouse.x;
            const dy = event.clientY - this.mouse.y;

            var viewX = this.view.position.x;
            var viewY = this.view.position.y;
            var viewZ = this.view.position.z;

            var r = Math.sqrt(viewX**2 + viewY**2 + viewZ**2);
            var teta = Math.atan2(viewZ, viewX);
            var phi = Math.acos(viewY/r);

            teta += dx/100;
            phi -= dy/100;

            this.view.position.x = r * Math.sin(phi) * Math.cos(teta);
            this.view.position.z = r * Math.sin(phi) * Math.sin(teta);
            this.view.position.y = r * Math.cos(phi);

            this.view.lookAt(0, 10, 0);

            this.mouse.x = event.clientX;
            this.mouse.y = event.clientY;
        }
        
    }

    zoom(event){
        var speed = event.deltaY;
        this.scroll_momentum = speed / 5.0;
    }

    anime_out(){
        var header = document.getElementById('header');
        var content = document.getElementById('content');
        var canvas = document.getElementById('threejs');

        var header_target = -header.offsetHeight;
        var content_target = content.offsetHeight;
        var canvas_target = 0; //vh

        var header_origin = 0;
        var content_origin = 0;
        var canvas_origin = -20;

        var header_pos = header_origin;
        var content_pos = content_origin;
        var canvas_pos = -canvas_origin;

        var duration = 600;
        var t = 0;



        var interval = undefined;
        interval = setInterval(()=>{
            t += 1000.0/FRAME_RATE;

            // lerp
            header_pos = header_origin + (header_target - header_origin) * t/duration;
            content_pos = content_origin + (content_target - content_origin) * t/duration;
            canvas_pos = canvas_origin + (canvas_target - canvas_origin) * t/duration;

            header.style.top = header_pos + "px";
            content.style.top = content_pos + "px";
            canvas.style.top = canvas_pos + "vh";


            this.scroll_momentum = MAX_SPEED;

            if (t >= duration){
                clearInterval(interval);
                canvas.style.top = canvas_target + "vh";
                
                header.style.top = header_target + "px";
                content.style.top = content_target + "px";

                header.style.display = 'none';
                content.style.display = 'none';
            }

        }, 1000.0/FRAME_RATE);
    }

    anime_in(){
        var header = document.getElementById('header');
        var content = document.getElementById('content');
        var canvas = document.getElementById('threejs');

        var header_target = 0;
        var content_target = 0;
        var canvas_target = -20; //vh

        var header_origin = parseInt(header.style.top);
        var content_origin = parseInt(content.style.top);
        var canvas_origin = 0;

        var header_pos = header_origin;
        var content_pos = content_origin;
        var canvas_pos = -canvas_origin;

        var duration = 600;
        var t = 0;

        header.style.display = 'flex';
        content.style.display = 'flex';

        var interval = undefined;
        interval = setInterval(()=>{
            t += 1000.0/FRAME_RATE;

            // lerp
            header_pos = header_origin + (header_target - header_origin) * t/duration;
            content_pos = content_origin + (content_target - content_origin) * t/duration;
            canvas_pos = canvas_origin + (canvas_target - canvas_origin) * t/duration;

            header.style.top = header_pos + "px";
            content.style.top = content_pos + "px";
            canvas.style.top = canvas_pos + "vh";

            if (t >= duration){
                clearInterval(interval);
                canvas.style.top = canvas_target + "vh";
                
                header.style.top = header_target + "px";
                content.style.top = content_target + "px";
            }

        }, 1000.0/FRAME_RATE);
    }



    
    resize(event){
        for (let i = 0; i < this.texts.length; i++) {
            this.texts[i].update();
        }
        this.view.aspect = window.innerWidth / window.innerHeight;
        this.view.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}


const a = new app();
document.addEventListener('DOMContentLoaded', () => {
    a.init();
});

// right mouse button
// document.addEventListener('contextmenu', (event) => {
//     event.preventDefault();
// });
// document.addEventListener('mousedown', (event) => {
//     if(event.button == 2){
//         a.right_pressed(event);
//     }
// });
// document.addEventListener('mouseup', (event) => {
//     if(event.button == 2){
//         a.right_released();
//     }
// });
document.addEventListener('mousemove', (event) => {
    a.mouse_move(event);
});
document.addEventListener('wheel', (event) => {
    a.zoom(event);
    // a.forward(40*event.deltaY/120);
});

window.addEventListener("resize", (event)=>{
    a.resize(event);
});

