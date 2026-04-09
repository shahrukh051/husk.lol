import * as THREE from 'three';

export function initThreeJS() {
    const container = document.getElementById('three-container');
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    // Create the "Jelly" object - an Icosahedron for an organic look
    const geometry = new THREE.IcosahedronGeometry(1.5, 4);
    
    // Custom Material for Glassmorphism/Tactile Ether look
    const material = new THREE.MeshPhysicalMaterial({
        color: 0xffd9df, // Light Blossom Pink
        metalness: 0.1,
        roughness: 0.2,
        transmission: 0.9, // glass-like
        thickness: 0.5,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1
    });

    const jellyMesh = new THREE.Mesh(geometry, material);
    scene.add(jellyMesh);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffb1c1, 5, 20);
    pointLight.position.set(2, 3, 4);
    scene.add(pointLight);

    const pointLight2 = new THREE.PointLight(0x894c5a, 3, 20); // inverse primary glow
    pointLight2.position.set(-2, -3, -4);
    scene.add(pointLight2);

    // Animation Loop
    let time = 0;
    function animate() {
        requestAnimationFrame(animate);
        time += 0.01;

        // Make the jelly "breathe" and float
        jellyMesh.rotation.x += 0.005;
        jellyMesh.rotation.y += 0.007;

        // Subtle vertex manipulation could be done here with shaders
        const scale = 1 + Math.sin(time) * 0.02;
        jellyMesh.scale.set(scale, scale, scale);

        renderer.render(scene, camera);
    }

    animate();

    // Handle Resize
    window.addEventListener('resize', () => {
        if (!container) return;
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    });
}

// Auto-init
document.addEventListener('DOMContentLoaded', initThreeJS);
