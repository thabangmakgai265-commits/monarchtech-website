import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";

const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
);

if ("WebGLRenderingContext" in window) {
    let renderer;

    try {
        renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: false,
            powerPreference: "low-power"
        });
    } catch (error) {
        console.warn("MonarchAurex 3D background unavailable:", error);
    }

    if (renderer) {
        const canvas = renderer.domElement;
        canvas.className = "monarch-bloom-canvas";
        canvas.setAttribute("aria-hidden", "true");
        canvas.setAttribute("role", "presentation");
        canvas.tabIndex = -1;
        document.body.insertBefore(canvas, document.body.firstChild);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
        camera.position.set(0, 0, 10.5);

        const environmentCanvas = document.createElement("canvas");
        environmentCanvas.width = 1024;
        environmentCanvas.height = 512;

        const environmentContext = environmentCanvas.getContext("2d");

        if (!environmentContext) {
            renderer.dispose();
            canvas.remove();
            throw new Error("Could not create the reflective studio environment.");
        }

        const environmentGradient = environmentContext.createLinearGradient(
            0,
            0,
            1024,
            0
        );
        environmentGradient.addColorStop(0, "#15191f");
        environmentGradient.addColorStop(0.18, "#b9c0c9");
        environmentGradient.addColorStop(0.28, "#30343b");
        environmentGradient.addColorStop(0.43, "#f0eee9");
        environmentGradient.addColorStop(0.53, "#565b63");
        environmentGradient.addColorStop(0.68, "#171a20");
        environmentGradient.addColorStop(0.82, "#d4d3cf");
        environmentGradient.addColorStop(1, "#15191f");
        environmentContext.fillStyle = environmentGradient;
        environmentContext.fillRect(0, 0, 1024, 512);

        const environmentGlow = environmentContext.createRadialGradient(
            512,
            260,
            20,
            512,
            260,
            350
        );
        environmentGlow.addColorStop(0, "rgba(245,239,224,.32)");
        environmentGlow.addColorStop(1, "rgba(8,10,14,.78)");
        environmentContext.fillStyle = environmentGlow;
        environmentContext.fillRect(0, 0, 1024, 512);

        for (const [x, width, color] of [
            [110, 48, "rgba(255,255,255,.82)"],
            [340, 94, "rgba(245,239,224,.72)"],
            [655, 58, "rgba(255,255,255,.9)"],
            [870, 105, "rgba(193,170,126,.48)"]
        ]) {
            const reflection = environmentContext.createLinearGradient(
                x - width,
                0,
                x + width,
                0
            );
            reflection.addColorStop(0, "rgba(255,255,255,0)");
            reflection.addColorStop(0.5, color);
            reflection.addColorStop(1, "rgba(255,255,255,0)");
            environmentContext.fillStyle = reflection;
            environmentContext.fillRect(x - width, 0, width * 2, 512);
        }

        const environment = new THREE.CanvasTexture(environmentCanvas);
        environment.mapping = THREE.EquirectangularReflectionMapping;
        environment.colorSpace = THREE.SRGBColorSpace;
        scene.environment = environment;

        scene.add(new THREE.HemisphereLight(0xcbd3df, 0x17130e, 1.1));

        const addLight = (color, intensity, position) => {
            const light = new THREE.DirectionalLight(color, intensity);
            light.position.set(...position);
            scene.add(light);
        };

        addLight(0xf5f3ee, 2.2, [-4, 6, 7]);
        addLight(0xd4deee, 1.7, [5, 1, 4]);
        addLight(0xc9aa77, 0.65, [-2, -4, -1]);

        const sculpture = new THREE.Group();
        scene.add(sculpture);

        const createRibbonGeometry = (viewWidth, viewHeight) => {
            const lengthSegments = 144;
            const widthSegments = 30;
            const columns = widthSegments + 1;
            const surfaceVertices = (lengthSegments + 1) * columns;
            const totalVertices = surfaceVertices * 2;
            const positions = new Float32Array(totalVertices * 3);
            const colors = new Float32Array(totalVertices * 3);
            const indices = [];
            const thickness = 0.07;
            const ribbonHalfWidth = viewHeight * 0.22;
            const curvePoints = [
                [-1.22, 0.24, -0.8],
                [-0.82, 0.48, -0.2],
                [-0.34, 0.34, 0.9],
                [0.2, -0.12, 0.25],
                [0.86, -0.3, -1.05],
                [0.74, 0.1, -0.2],
                [0.36, 0.48, 0.9],
                [-0.1, 0.28, 0.75],
                [-0.54, -0.28, -0.65],
                [-0.94, -0.46, -0.9],
                [-1.24, -0.18, -0.2]
            ].map(([x, y, z]) =>
                new THREE.Vector3(
                    x * viewWidth * 0.5,
                    y * viewHeight,
                    z
                )
            );
            const path = new THREE.CatmullRomCurve3(
                curvePoints,
                false,
                "centripetal"
            );
            const frames = path.computeFrenetFrames(lengthSegments, false);
            const darkChrome = new THREE.Color(0x171b21);
            const silver = new THREE.Color(0xd9dde1);
            const champagne = new THREE.Color(0x9a8563);
            const color = new THREE.Color();

            const vertexIndex = (surface, i, j) =>
                surface * surfaceVertices + i * columns + j;
            const writeVertex = (index, point, highlight, gold) => {
                const offset = index * 3;
                positions[offset] = point.x;
                positions[offset + 1] = point.y;
                positions[offset + 2] = point.z;

                color.copy(darkChrome).lerp(silver, highlight);
                color.lerp(champagne, gold);
                colors[offset] = color.r;
                colors[offset + 1] = color.g;
                colors[offset + 2] = color.b;
            };

            for (let i = 0; i <= lengthSegments; i += 1) {
                const t = i / lengthSegments;
                const center = path.getPointAt(t);
                const tangent = frames.tangents[i];
                const twist =
                    -0.45 +
                    1.15 * Math.sin(t * Math.PI * 2 - 0.65) +
                    0.32 * Math.sin(t * Math.PI * 4 + 0.4);
                const sideAxis = frames.normals[i]
                    .clone()
                    .multiplyScalar(Math.cos(twist))
                    .add(
                        frames.binormals[i]
                            .clone()
                            .multiplyScalar(Math.sin(twist))
                    )
                    .normalize();
                const surfaceNormal = tangent
                    .clone()
                    .cross(sideAxis)
                    .normalize();
                const widthTaper =
                    0.84 + 0.16 * Math.sin(Math.PI * t);
                const sweepHighlight =
                    0.1 + 0.08 * Math.sin(t * Math.PI * 3.2 + 0.5);

                for (let j = 0; j <= widthSegments; j += 1) {
                    const side = -1 + (2 * j) / widthSegments;
                    const arch =
                        0.3 * (1 - side * side) +
                        0.13 * Math.sin(t * Math.PI * 3.5 + side * 2.1) *
                            Math.abs(side);
                    const point = center
                        .clone()
                        .addScaledVector(
                            sideAxis,
                            side * ribbonHalfWidth * widthTaper
                        )
                        .addScaledVector(surfaceNormal, arch);
                    const reflectionPosition =
                        0.48 * Math.sin(t * Math.PI * 2.4 - 0.3);
                    const silverReflection =
                        0.76 *
                        Math.exp(
                            -Math.pow(
                                (side - reflectionPosition) / 0.14,
                                2
                            )
                        );
                    const secondaryReflection =
                        0.28 *
                        Math.exp(
                            -Math.pow(
                                (side + 0.68 + 0.1 * Math.sin(t * 8)) / 0.1,
                                2
                            )
                        );
                    const edgeHighlight =
                        0.14 *
                        Math.exp(
                            -Math.pow(
                                (Math.abs(side) - 0.88) / 0.1,
                                2
                            )
                        );
                    const highlight = Math.min(
                        0.96,
                        Math.max(
                            0.03,
                            sweepHighlight +
                                silverReflection +
                                secondaryReflection +
                                edgeHighlight
                        )
                    );
                    const gold =
                        0.035 *
                        Math.exp(-Math.pow((t - 0.72) / 0.13, 2)) *
                        Math.exp(-Math.pow((side + 0.46) / 0.2, 2));

                    writeVertex(
                        vertexIndex(0, i, j),
                        point,
                        highlight,
                        gold
                    );

                    const underside = point
                        .clone()
                        .addScaledVector(surfaceNormal, -thickness);
                    writeVertex(
                        vertexIndex(1, i, j),
                        underside,
                        highlight * 0.42,
                        gold * 0.35
                    );
                }
            }

            const addQuad = (a, b, c, d) => {
                indices.push(a, b, d, b, c, d);
            };

            for (let i = 0; i < lengthSegments; i += 1) {
                for (let j = 0; j < widthSegments; j += 1) {
                    const a = vertexIndex(0, i, j);
                    const b = vertexIndex(0, i + 1, j);
                    const c = vertexIndex(0, i + 1, j + 1);
                    const d = vertexIndex(0, i, j + 1);
                    const ba = vertexIndex(1, i, j);
                    const bb = vertexIndex(1, i + 1, j);
                    const bc = vertexIndex(1, i + 1, j + 1);
                    const bd = vertexIndex(1, i, j + 1);

                    addQuad(a, b, c, d);
                    addQuad(ba, bd, bc, bb);
                }
            }

            for (let i = 0; i < lengthSegments; i += 1) {
                addQuad(
                    vertexIndex(0, i, 0),
                    vertexIndex(1, i, 0),
                    vertexIndex(1, i + 1, 0),
                    vertexIndex(0, i + 1, 0)
                );
                addQuad(
                    vertexIndex(0, i, widthSegments),
                    vertexIndex(0, i + 1, widthSegments),
                    vertexIndex(1, i + 1, widthSegments),
                    vertexIndex(1, i, widthSegments)
                );
            }

            for (let j = 0; j < widthSegments; j += 1) {
                addQuad(
                    vertexIndex(0, 0, j),
                    vertexIndex(0, 0, j + 1),
                    vertexIndex(1, 0, j + 1),
                    vertexIndex(1, 0, j)
                );
                addQuad(
                    vertexIndex(0, lengthSegments, j),
                    vertexIndex(1, lengthSegments, j),
                    vertexIndex(1, lengthSegments, j + 1),
                    vertexIndex(0, lengthSegments, j + 1)
                );
            }

            const geometry = new THREE.BufferGeometry();
            geometry.setAttribute(
                "position",
                new THREE.BufferAttribute(positions, 3)
            );
            geometry.setAttribute(
                "color",
                new THREE.BufferAttribute(colors, 3)
            );
            geometry.setIndex(indices);
            geometry.computeVertexNormals();
            return geometry;
        };

        const ribbonMaterial = new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            vertexColors: true,
            metalness: 0.97,
            roughness: 0.17,
            clearcoat: 0.9,
            clearcoatRoughness: 0.12,
            side: THREE.DoubleSide
        });
        const ribbon = new THREE.Mesh(
            createRibbonGeometry(
                (2 * camera.position.z *
                    Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) *
                    camera.aspect,
                2 * camera.position.z *
                    Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
            ),
            ribbonMaterial
        );
        sculpture.add(ribbon);

        renderer.setPixelRatio(
            Math.min(
                window.devicePixelRatio || 1,
                window.innerWidth < 760 ? 0.85 : 1.15
            )
        );
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.05;

        const positionSculpture = () => {
            const width = window.innerWidth;
            const height = window.innerHeight;
            const aspect = width / Math.max(height, 1);
            camera.aspect = aspect;
            camera.updateProjectionMatrix();
            renderer.setSize(width, height);

            const viewHeight =
                2 *
                camera.position.z *
                Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
            ribbon.geometry.dispose();
            ribbon.geometry = createRibbonGeometry(
                viewHeight * aspect,
                viewHeight
            );
            sculpture.scale.setScalar(1);
            sculpture.position.set(
                0,
                0,
                0
            );
        };

        positionSculpture();
        window.addEventListener("resize", positionSculpture, {
            passive: true
        });

        let animationFrame = 0;
        let lastRenderTime = 0;
        const frameInterval = 1000 / 30;

        const renderFrame = (time) => {
            animationFrame = 0;

            if (reducedMotion.matches) {
                renderer.render(scene, camera);
                return;
            }

            if (time - lastRenderTime >= frameInterval) {
                lastRenderTime = time;
                const seconds = time * 0.001;
                sculpture.rotation.set(
                    -0.4 + Math.sin(seconds * 0.09) * 0.04,
                    Math.sin(seconds * 0.065) * 0.06,
                    seconds * 0.008
                );
                sculpture.position.y =
                    Math.sin(seconds * 0.11) * 0.055;
                renderer.render(scene, camera);
            }

            animationFrame = window.requestAnimationFrame(renderFrame);
        };

        const startRendering = () => {
            if (document.hidden || animationFrame) {
                return;
            }

            if (reducedMotion.matches) {
                sculpture.rotation.set(-0.4, 0, 0);
                sculpture.position.y = 0;
                renderer.render(scene, camera);
                return;
            }

            lastRenderTime = 0;
            animationFrame = window.requestAnimationFrame(renderFrame);
        };

        const stopRendering = () => {
            if (animationFrame) {
                window.cancelAnimationFrame(animationFrame);
                animationFrame = 0;
            }
        };

        document.addEventListener("visibilitychange", () => {
            if (document.hidden) {
                stopRendering();
            } else {
                startRendering();
            }
        });

        const handleMotionPreference = () => {
            stopRendering();
            startRendering();
        };

        if (typeof reducedMotion.addEventListener === "function") {
            reducedMotion.addEventListener("change", handleMotionPreference);
        } else {
            reducedMotion.addListener(handleMotionPreference);
        }

        startRendering();
    }
}
