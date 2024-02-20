import * as THREE from 'three';

function htmlFromString(html: string): HTMLElement {
    let div = document.createElement('div');
    div.innerHTML = html;
    div.classList.add('html3d');
    return div;
}

const frustum = new THREE.Frustum();
function isInCamera(view: THREE.Camera, position: THREE.Vector3) {
    frustum.setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(view.projectionMatrix, view.matrixWorldInverse));
    return frustum.containsPoint(position);
}


export class Html3D {
    private element: HTMLElement;
    private position: THREE.Vector3;
    private width: number;
    private height: number;
    private dom: HTMLElement;

    constructor(html: string) {
        this.dom = document.getElementById("html3d-container")
        this.element = htmlFromString(html);
        document.body.appendChild(this.element);

        this.width = this.element.offsetWidth;
        this.height = this.element.offsetHeight;
        this.position = new THREE.Vector3(0, 0, 0);
    }

    public update() {
        this.element.style.display = "block";
        this.width = this.element.offsetWidth;
        this.height = this.element.offsetHeight;
        console.log(this.width, this.height);
        
    }

    public setPosition(x: number, y: number, z: number) {
        this.position = new THREE.Vector3(x, y, z);
    }
    public getPosition() {
        return this.position;
    }
    public move(x: number, y: number, z: number) {
        this.position.add(new THREE.Vector3(x, y, z));
    }

    public alpha(alpha: number) {
        this.element.style.backgroundColor = `rgba(64, 64, 64, ${alpha})`;
    }

    private computePositionInWorldSpace(camera: THREE.Camera) {
        let cam_pos = camera.position.clone();
        let position = this.position.clone();

        let distance = cam_pos.distanceTo(this.position);

        if (distance > 500) {
            return { position, scale: 0 };
        }
        let alpha = 1.0;
        if (distance > 400) {
            alpha = 1 - (distance - 400) / 100;
        }


        // check if the object is in camera view
        if (!isInCamera(camera, position)){
            return { position, scale: 0 };
        }
        position.project(camera);



        position.x = (position.x + 1) / 2 * window.innerWidth - this.width / 2;
        position.y = (-position.y + 1) / 2 * window.innerHeight - this.height / 2;

        var scale = 70.0 / distance



        return { position, scale, alpha };
    }


    public render(camera: THREE.Camera) {
        let { position, scale, alpha } = this.computePositionInWorldSpace(camera);
        if (scale == 0) {
            this.element.style.display = 'none';
            return;
        }
        else {
            this.element.style.display = 'block';
        }

        var canvas = document.getElementById("threejs")
        var top = canvas.style.top
        

        var a = (this.position.z - 150) / (10 - 150) * (0.8 - 0) + 0;    
        console.log(this.position.z, a);
            
        this.alpha(a);
        

        this.element.style.left = position.x + 'px';
        if (top != "")
            this.element.style.top = "calc("+position.y + 'px + '+top+")";
        else
            this.element.style.top = position.y + 'px';
        this.element.style.transform = 'scale(' + scale + ')';
        this.element.style.opacity = alpha.toString();

    }
}