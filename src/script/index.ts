
import * as THREE from 'three';
import { LightProbeGenerator } from './threeAddons/lights/LightProbeGenerator.js';
import { Mountain } from './mountain';
import { OBJLoader } from './threeAddons/loaders/OBJLoarder';
import { FBXLoader } from './threeAddons/loaders/FBXLoader';
import { MTLLoader } from './threeAddons/loaders/MTLLoader';
import { GLTFLoader } from './threeAddons/loaders/GLTFLoader';
import { Html3D } from './Html3D';
import { im_setPosition, modulo, rgb2hex } from './utils';

const logo_fem = require("../assets/logo-fem.svg");
const logo_onera = require("../assets/logo-onera.svg");
const logo_smart = require("../assets/logo-smart.svg");

const PAGES_POS = [
    0, 500, 1000, 1500, 2000, 2500
]
const HTML_PAGES = [
    `
        <h1> Projet DAPIA </h1>
        <h2> Détection d'attaques par injection de fausses données  </h2>
        <h2> dans la surveillance du trafic aérien civil et militaire </h2>
    `,
    `
        <h1> Simulation des attaques </h1>
        <p>
            Grâce à un langage dédié, le composant DApIA altération permet de simuler des attaques afin d'entraîner ou de valider les modèles de détections.
            L'illustration montre une attaque de type ghost aircraft flooding simulée avec le composant d'altération.
        </p>
    `,
    `
        <h1> Détection des attaques </h1>
        <p>
            À l'heure actuelle, la bibliothèque de modèles DApIA permet de détecter certains types d'attaques telles que les spoofing, ghost aircraft flooding, replay attack ou la modification de trajectoire.
            Par exemple ici un drone essaie de se faire passer pour un helicoptère de secours.
        </p>
    `,
    `
        <h1> Trafic basse altitude </h1>
        <p>
            Les modèles de détection sont spécifiquement entraînés pour le contexte du trafic à basse altitude : hélicoptères du SAMU, drones, eVTOL, etc.
            L'illustration montre les départs des taxis aériens de Monaco vers Nice représentatifs d'un futur trafic dense et cadencé à basse altitude (UAM).
        </p>
    `,
    `
        <h1> Déploiement simplifié </h1>
        <p>
            Livrés sous forme d'applications et d'API web conteneurisées, les composants DApIA sont facilement déployables on-premise. Les composants sont disponibles sur Docker Hub.
        </p>
    `,
    `
        <h1> Notre équipe </h1>
        <div class="flex-container">
            <img src="${logo_fem}" class="logo" alt="Femto-ST" />
            <img src="${logo_onera}" class="logo" alt="ONERA" />
            <img src="${logo_smart}" class="logo" alt="Smartesting" />
        </div>
        <div class="flex-container">
            <a href="mailto:aymeric.cretin@smartesting.com">
                Nous contacter
            </a>
            <a href="https://github.com/DApIA-Project" target="_blank">
                GitHub
            </a>
        </div>
    `,
]



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

const plane = require("../assets/plane.gltf");
const helco = require("../assets/helico.gltf");
const drone = require("../assets/drone.gltf");
const plane2 = require("../assets/plane2.gltf");

const helico_traj = [
    {x:400, y:4, z:1000, when:1000},
    {x:15, y:4, z:1505, when:1480}
]

const drone_traj = [
    {x:-200, y:10, z:500, when:500},
    {x:10, y:10, z:1000, when:1000}
]

const plane2_traj = [
    {x:200, y:3, z:300, when:0},
    {x:40, y:3, z:470, when:390}
]




const textures =  {
    "/textures/plane_paint_3.png": require("../assets/textures/plane_paint_3.png"),
    "/textures/plane_paint_5.png": require("../assets/textures/plane_paint_5.png"),
    "/textures/plane_paint_2.png": require("../assets/textures/plane_paint_2.png"),

    "/textures/interior2.png": require("../assets/textures/interior2.png"),
    "/textures/texture.png": require("../assets/textures/texture.png"),
    "/textures/mainrotor.png": require("../assets/textures/mainrotor.png"),
    "/textures/tailrotor.png": require("../assets/textures/tailrotor.png"),

    "/textures/interior.png": require("../assets/textures/interior.png"),
    "/textures/texture_2.png": require("../assets/textures/texture_2.png"),

    "/plane.bin":  require("../assets/plane.bin"),
    "/helico.bin": require("../assets/helico.bin"),
    "/drone.bin": require("../assets/drone.bin"),
    "/plane2.bin": require("../assets/plane2.bin"),
}



function setLinearFilter(object){
    object.castShadow = true;
    object.traverse((child) => {
        if (child instanceof THREE.Mesh){
            child.castShadow = true;
            child.receiveShadow = false;
            if (child.material.map){
                child.material.map.minFilter = THREE.LinearFilter;
            }
        }
    });
    return object;
}




const MAX_SPEED  = 170.0/10.0;
const ACCERATION =  20.0/10.0;

const ANIME_MENU_SCROLL = 250;
const TEXTS_HEIGHT = 20;
const TEXTS_TARGET_HEIGHT = 30;

class app{

    scene:THREE.Scene;
    renderer:THREE.WebGLRenderer;
    view:THREE.PerspectiveCamera;
    floor:THREE.Mesh;

    rotate = false;
    mouse = {x:0, y:0};

    mountain:Mountain;
    plane:THREE.Object3D;
    PLANE_SHIFT = 20;
    actual_plane_shift = 20;
    helico:THREE.Object3D;
    helico_a = Math.PI/2;
    drone:THREE.Object3D;
    drone_a = 0;
    show_spoofing = false;
    plane2:THREE.Object3D;
    plane2_a =  Math.PI/2;


    texts:Html3D[] = [];

    scoll_offset = 0;
    scroll_momentum = 0;
    move_forward = 1;
    last_stop = 0;
    skipping = false;
    stop_skipping = false;

    main_title = true;

    step = 0;



    init() {

        this.scene = new THREE.Scene();
        // this.scene.background = new THREE.Color(rgb2hex(169, 199, 201));

        this.view = new THREE.PerspectiveCamera(VIEW.fov, window.innerWidth / window.innerHeight, VIEW.near, VIEW.far);
        this.view.position.z = -45;
        this.view.position.y = 25;
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

        const loadingManager = new THREE.LoadingManager();
        loadingManager.setURLModifier( function( url ) {
            if (url.startsWith(".")) url = url.substring(1);

            var res = textures[url];
            if (res) return res;

            return url;
        } );
        const gltfLoader = new GLTFLoader(loadingManager);

        gltfLoader.load(plane,  (object) => {
            this.plane  = object.scene;

            this.plane.scale.set(1.2, 1.2, 1.2);
            this.plane.position.z = -20 + this.actual_plane_shift;
            this.plane.position.y = 5.8;
            this.plane.rotation.y = Math.PI/2;

            this.plane.children[7].children[4].material.color = new THREE.Color(rgb2hex(184, 229, 255));
            this.plane.children[3].material.color = new THREE.Color(rgb2hex(184, 229, 255));

            setLinearFilter(this.plane);
            this.scene.add(this.plane);
        });


        gltfLoader.load(helco,  (object) => {
            this.helico  = object.scene;

            this.helico.scale.set(2, 2, 2);
            this.helico.rotation.y = this.helico_a;

            setLinearFilter(this.helico);
            this.scene.add(this.helico);
        });


        gltfLoader.load(drone,  (object) => {
            this.drone  = object.scene;

            this.drone.scale.set(0.8, 0.8, 0.8);

            setLinearFilter(this.drone);
            this.scene.add(this.drone);
        });

        gltfLoader.load(plane2,  (object) => {
            this.plane2  = new THREE.Object3D();

            object.scene.traverse((child) => {
                if (child instanceof THREE.Mesh){
                    var geometry = child.geometry;
                    var material = child.material;
                    var mesh = new THREE.InstancedMesh(geometry, material, 5);
                    mesh.count = 1;
                    for (let i = 0; i < 5; i++) {
                        mesh.setMatrixAt(i, new THREE.Matrix4().setPosition(new THREE.Vector3(0, 0, 0)));
                    }
                    this.plane2.add(mesh);
                }

            });

            this.plane2.scale.set(0, 0, 0);


            setLinearFilter(this.plane2);
            this.scene.add(this.plane2);

        });


        for (let i = 0; i < HTML_PAGES.length; i++) {
            var text = new Html3D(HTML_PAGES[i]);
            this.texts.push(text);
        }



        this.forward(0);

        // view init !
        setTimeout(() => {
            this.resize(null);
        }, 500);


        setInterval(()=>{
            this.frame()
            for (let i = 0; i < this.texts.length; i++) {
                this.texts[i].render(this.view);
            }
            this.render()
        }, 1000.0/FRAME_RATE);


        // setInterval(() => {
        //     this.auto_run()
        // }, 10000);
    }

    auto_run(){
        if(this.step <= 5){
            this.zoom(150)
        }
        else{
            this.zoom(-150)
        }

        this.step ++;
        if (this.step > 10){
            this.step = 0;
        }
    }

    lerp_traj(param){

        // helico target pos
        var start_pos = new THREE.Vector3(param[0].x, param[0].y, param[0].z);
        var start_when = param[0].when;
        var target_pos = new THREE.Vector3(param[1].x, param[1].y, param[1].z);
        var target_when = param[1].when;
        var teta =  Math.atan2(target_pos.x - start_pos.x, target_pos.z - start_pos.z, );

        var pos = new THREE.Vector3();
        var t = (this.scoll_offset - start_when) / (target_when - start_when);
        pos.x = start_pos.x + (target_pos.x - start_pos.x) * t;
        pos.y = start_pos.y + (target_pos.y - start_pos.y) * t;
        pos.z = start_pos.z + (target_pos.z - start_pos.z) * t - this.scoll_offset;

        return [pos, teta, t];
    }

    frame(){
        var t = new Date().getTime() / 1000.0;
        if (this.scoll_offset > 80){
            this.plane.position.y = Math.cos(t*1.5) * 0.25 + 5.8;
            this.plane.children[1].rotation.x += 0.2;

            this.plane.position.z = -20 + this.actual_plane_shift;


            this.helico.children[6].rotation.z += 0.15;
            this.helico.children[23].rotation.y += 0.25;

            this.drone.children[5].rotation.y += 0.5;
            this.drone.children[4].rotation.y -= 0.5;
            this.drone.children[3].rotation.y -= 0.5;
            this.drone.children[2].rotation.y += 0.5;
        }

        var lerp = undefined;
        if (this.helico){
            lerp = this.lerp_traj(helico_traj);
            this.helico.position.copy(lerp[0]);
            this.helico.rotation.y = lerp[1] + this.helico_a;




            lerp = this.lerp_traj(drone_traj);
            if (lerp[2] > 0.8 && lerp[2] < 1.1){
                if (Math.random() > 0.9){
                    this.show_spoofing = !this.show_spoofing;
                }
            }
            else this.show_spoofing = false;

            if (this.show_spoofing){
                this.helico.position.copy(lerp[0]);
                this.helico.rotation.y = lerp[1] + this.helico_a;
                this.drone.position.z = -1000;
            }
            else{
                this.drone.position.copy(lerp[0]);
                this.drone.rotation.y = lerp[1] + this.drone_a;
            }

            lerp = this.lerp_traj(plane2_traj);
            var t_inter = lerp[2];
            if (t_inter > 0){
                if (this.plane2.scale.x < 1) this.plane2.scale.set(3, 3, 3);
                this.plane2.position.copy(new THREE.Vector3(0, 0, 0));
                this.plane2.rotation.y = 0;

                for (let ch = 0; ch < this.plane2.children.length; ch++) {
                    var child:THREE.InstancedMesh = this.plane2.children[ch] as THREE.InstancedMesh;
                    child.count = 5;


                    var pos = new THREE.Vector3().copy(lerp[0]);
                    var origin = plane2_traj[1];
                    var t_o = new THREE.Vector3(plane2_traj[0].x, plane2_traj[0].y, plane2_traj[0].z);
                    var t_d = new THREE.Vector3().copy(origin);

                    for (let i = 0; i < child.count; i++) {
                        var d= i/4;
                        var r = 0;
                        if (t_inter > 1){
                            r = d * Math.PI / 2.0 - Math.PI/4.0;
                        }

                        var pos = new THREE.Vector3(
                            lerp[0].x,
                            lerp[0].y,
                            lerp[0].z + this.scoll_offset,
                        );

                        pos.sub(t_d);
                        pos.applyAxisAngle(new THREE.Vector3(0, 1, 0), r);
                        pos.add(t_d);
                        pos.z -= this.scoll_offset;
                        pos.multiplyScalar(1/3.0)


                        var mat = new THREE.Matrix4().makeRotationY(this.plane2_a + lerp[1] + r);
                        mat.setPosition(pos);

                        if (this.scoll_offset > 80 && ch == 5){
                            mat.setPosition(pos.x+Math.sin(r+ lerp[1]) * 3.1, pos.y+0.2, pos.z + Math.cos(r+ lerp[1]) * 3.1);
                            mat.multiply(new THREE.Matrix4().makeRotationX(t*6));
                        }
                        child.setMatrixAt(i, mat);

                    }
                    child.instanceMatrix.needsUpdate = true;
                }
            }
        }



        var scoll_interval = modulo(this.scoll_offset, 500);
        var scoll_region = Math.floor((this.scoll_offset+200) / 500) * 500;

        // this.scroll_momentum = 1

        // if we are in the middle of two pages : fast scroll
        if ((scoll_interval > 150 && scoll_interval < 300))
        {
            this.skipping = true;
            // this.scroll_momentum += this.move_forward * ACCERATION;
            // if (Math.abs(this.scroll_momentum) > MAX_SPEED){
            //     this.scroll_momentum = MAX_SPEED * this.move_forward;
            // }
        }

        // if we get out of a skip zone, we must slow down !
        else if (this.skipping){
            this.stop_skipping = true;

            if (this.scroll_momentum > 3){
                this.scroll_momentum *= 0.8;
            }


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

        // limit scroll the page counts
        if (this.scoll_offset + scoll < 0){
            scoll = 0-this.scoll_offset;
        }
        else if (this.scoll_offset + scoll > 500*(HTML_PAGES.length-1)){
            scoll = 500*(HTML_PAGES.length-1) - this.scoll_offset;
        }

        this.scoll_offset += scoll;




        this.anime_menu();
        this.anime_texts();
        if (speed != 0){
            this.mountain.shift_noise(scoll);
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

    zoom(deltaY){
        this.scroll_momentum = deltaY / 5.0;
    }


    anime_texts(){
        for (let i = 0; i < this.texts.length; i++) {
            var target = TEXTS_TARGET_HEIGHT;
            if (i == 0) target = TEXTS_HEIGHT;

            let z = PAGES_POS[i] - this.scoll_offset;
            if (z > 10){
                var y = TEXTS_HEIGHT * (z/500) + target * (1 - z/500);

                this.texts[i].setPosition(0, y, z);
            }
            else{
                this.texts[i].setPosition(0, target - z * 0.07, 10);
            }
        }
    }

    anime_menu(){
        var header = document.getElementById('header');
        var content = document.getElementById('content');
        var canvas = document.getElementById('threejs');

        var header_target = -header.offsetHeight;
        var content_target = content.offsetHeight;
        var canvas_target = 0; //vw

        var header_origin = 0;
        var content_origin = 0;
        var canvas_origin = -10;

        var r = this.scoll_offset / ANIME_MENU_SCROLL;

        if (r >= 1){
            // header.style.display = 'none';
            // content.style.display = 'none';
            header.style.top = `${header_target}px`;
            content.style.top = `${content_target}px`;
            canvas.style.top = `max(${canvas_target}vw, ${canvas_target*10.1052631579}px)`;

            return;
        }

        // lerp
        var header_pos =  header_origin + (header_target - header_origin) * r;
        var content_pos = content_origin + (content_target - content_origin) * r;
        var canvas_pos = canvas_origin + (canvas_target - canvas_origin) * r;

        this.actual_plane_shift = this.PLANE_SHIFT * (1.0 - r);

        header.style.top = header_pos + "px";
        content.style.top = content_pos + "px";
        canvas.style.top = `max(${canvas_pos}vw, ${canvas_pos*10.1052631579}px)`;

        if (r < 1){
            // header.style.display = 'flex';
            // content.style.display = 'flex';
        }
    }



    resize(event){
        for (let i = 0; i < this.texts.length; i++) {
            this.texts[i].update();
        }
        this.view.aspect = window.innerWidth / window.innerHeight;
        if (window.innerWidth < 450){
            this.view.fov = 90;
        } else {
            this.view.fov = VIEW.fov;
        }
        this.view.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.frame();
    }
}


const a = new app();
document.addEventListener('DOMContentLoaded', () => {
    a.init();
});

// right mouse button
document.addEventListener('contextmenu', (event) => {
    event.preventDefault();
});
document.addEventListener('mousedown', (event) => {
    // if(event.button == 2){
    //     a.right_pressed(event);
    // }
});
document.addEventListener('mouseup', (event) => {
    // if(event.button == 2){
    //     a.right_released();
    // }
});
document.addEventListener('mousemove', (event) => {
    a.mouse_move(event);
});
document.addEventListener('wheel', (event) => {
    a.zoom(event.deltaY);
});

var last_position_y = -1;
document.addEventListener("touchmove", (event)=>{
    if (last_position_y == -1){
        last_position_y = event.touches[0].clientY;
    }
    a.zoom(-(event.touches[0].clientY - last_position_y) * 4);
    last_position_y = event.touches[0].clientY;

});
document.addEventListener("touchend", (event)=>{
    last_position_y = -1;

});


window.addEventListener("resize", (event)=>{
    a.resize(event);
});

