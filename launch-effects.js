"use strict";

const launchBrand = document.querySelector(".brand-launch-link");
const launchCelebration = document.getElementById("launch-celebration");
const launchFireworks = launchCelebration?.querySelector(".launch-fireworks");
const launchDeadline = Date.parse("2027-01-01T00:00:00+02:00");
const localHostname = window.location.hostname;
const isLocalHostname =
    localHostname === "localhost" ||
    localHostname === "127.0.0.1" ||
    localHostname === "::1" ||
    localHostname === "[::1]";
const localCelebrationTest =
    isLocalHostname &&
    new URLSearchParams(window.location.search).get("testLaunchCelebration") ===
        "1";
const reducedMotionPreference = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
);


if (launchBrand) {
    const brandHomeState = launchBrand.querySelector(".brand-home-state");
    const brandCountdownState = launchBrand.querySelector(".brand-countdown-state");

    if (brandHomeState && brandCountdownState) {
        let brandTimer = null;
        let brandTransitionTimer = null;
        let brandTransitioning = false;
        let countdownIsDestination = false;

        const setBrandDestination = (showCountdown, animate = true) => {
            window.clearTimeout(brandTransitionTimer);
            brandTransitioning = animate;
            countdownIsDestination = showCountdown;

            launchBrand.classList.toggle("is-countdown", showCountdown);
            launchBrand.href = showCountdown ? "launch/" : "#home";
            launchBrand.setAttribute(
                "aria-label",
                showCountdown
                    ? "Open the MonarchAurex launch countdown"
                    : "MonarchAurex home"
            );

            brandHomeState.setAttribute(
                "aria-hidden",
                String(showCountdown)
            );
            brandCountdownState.setAttribute(
                "aria-hidden",
                String(!showCountdown)
            );

            if (animate) {
                launchBrand.setAttribute("aria-disabled", "true");

                brandTransitionTimer = window.setTimeout(() => {
                    brandTransitioning = false;
                    launchBrand.removeAttribute("aria-disabled");
                }, 300);
            } else {
                launchBrand.removeAttribute("aria-disabled");
            }
        };

        const scheduleBrandTransition = showCountdown => {
            window.clearTimeout(brandTimer);

            brandTimer = window.setTimeout(() => {
                const nextState = !countdownIsDestination;
                setBrandDestination(nextState);
                scheduleBrandTransition(nextState);
            }, showCountdown ? 21000 : 2000);
        };

        const syncBrandMotion = () => {
            window.clearTimeout(brandTimer);
            window.clearTimeout(brandTransitionTimer);
            brandTransitioning = false;
            setBrandDestination(false, false);

            if (!reducedMotionPreference.matches) {
                scheduleBrandTransition(false);
            }
        };

        launchBrand.addEventListener("click", event => {
            if (brandTransitioning) {
                event.preventDefault();
                return;
            }

            const showCountdown =
                Number.parseFloat(
                    getComputedStyle(brandCountdownState).opacity
                ) >= 0.5;

            setBrandDestination(showCountdown, false);
        });

        syncBrandMotion();

        if (typeof reducedMotionPreference.addEventListener === "function") {
            reducedMotionPreference.addEventListener("change", syncBrandMotion);
        } else {
            reducedMotionPreference.addListener(syncBrandMotion);
        }
    }
}

if (!launchCelebration || !launchFireworks) {
    throw new Error("The homepage is missing its New Year celebration interface.");
}

const celebrationSkip = document.getElementById("launch-celebration-skip");
const replayButton = document.getElementById("launch-replay");
const fireworkStage = document.getElementById("launch-stage-fireworks");
const announcementStage = document.getElementById(
    "launch-stage-announcement"
);
const winnerStage = document.getElementById("launch-stage-winner");
const winnerPending = document.getElementById("launch-winner-pending");
const confirmedWinner = document.getElementById("launch-confirmed-winner");
const celebrationStages = [
    fireworkStage,
    announcementStage,
    winnerStage
];

if (
    !celebrationSkip ||
    !replayButton ||
    celebrationStages.some(stage => !stage) ||
    !winnerPending ||
    !confirmedWinner
) {
    throw new Error("The homepage celebration is missing required stage elements.");
}

const stageDurations = {
    fireworks: 15000,
    announcement: 3000,
    winner: 10000
};
const storageKey = "monarchaurex-new-year-celebration-2027";
const maximumTimeout = 2147483647;
const winnerEventName = "monarchaurex:confirmed-grand-prize-winner";
let seenInMemory = false;
let storageWarningShown = false;
let celebrationActive = false;
let activeStage = null;
let sequenceTimers = [];
let animationFrame = 0;
let entranceFrame = 0;
let canvasContext = launchFireworks.getContext("2d");
let canvasWidth = 0;
let canvasHeight = 0;
let pixelRatio = 1;
let shells = [];
let particles = [];
let lastShellTime = 0;
let fireworksStartedAt = 0;
let previousFrameTime = 0;
let reducedMotionHandler = null;
let previousFocus = null;

const warnStorageFailure = (operation, error) => {
    if (storageWarningShown) {
        return;
    }

    console.warn(
        `New Year celebration completion state could not be ${operation}:`,
        error
    );
    storageWarningShown = true;
};

const hasBeenSeen = () => {
    try {
        const savedState = window.localStorage.getItem(storageKey);
        return seenInMemory || savedState === "started" || savedState === "complete";
    } catch (error) {
        warnStorageFailure("read", error);
        return seenInMemory;
    }
};

const rememberAsSeen = () => {
    seenInMemory = true;

    try {
        window.localStorage.setItem(storageKey, "complete");
    } catch (error) {
        warnStorageFailure("saved", error);
    }
};

const rememberCelebrationStarted = () => {
    seenInMemory = true;

    try {
        window.localStorage.setItem(storageKey, "started");
    } catch (error) {
        warnStorageFailure("saved", error);
    }
};

const validateWinnerEvent = event => {
    if (localCelebrationTest) {
        return;
    }

    const detail = event.detail;

    if (
        !detail ||
        detail.resultRecorded !== true ||
        detail.winnerDisplayConsent !== true ||
        detail.prize !== "100% OFF — THE GOLDEN PRIVILEGE" ||
        typeof detail.winnerName !== "string"
    ) {
        return;
    }

    const winnerName = detail.winnerName.trim();

    if (!winnerName || winnerName.length > 100) {
        return;
    }

    confirmedWinner.textContent = `The Golden Privilege winner: ${winnerName}`;
    confirmedWinner.hidden = false;
    winnerPending.hidden = true;
};

window.addEventListener(winnerEventName, validateWinnerEvent);

const clearSequenceTimers = () => {
    sequenceTimers.forEach(timer => window.clearTimeout(timer));
    sequenceTimers = [];
};

const scheduleSequence = (callback, delay) => {
    const timer = window.setTimeout(callback, delay);
    sequenceTimers.push(timer);
};

const resizeFireworks = () => {
    if (!canvasContext) {
        return;
    }

    const bounds = launchFireworks.getBoundingClientRect();
    pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvasWidth = bounds.width;
    canvasHeight = bounds.height;
    launchFireworks.width = Math.round(canvasWidth * pixelRatio);
    launchFireworks.height = Math.round(canvasHeight * pixelRatio);
    canvasContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
};

const handleFireworksResize = () => {
    if (!celebrationActive || activeStage !== "fireworks") {
        return;
    }

    if (reducedMotionPreference.matches) {
        drawStaticFireworks();
    } else {
        resizeFireworks();
    }
};

const clearFireworks = () => {
    if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
        animationFrame = 0;
    }

    shells = [];
    particles = [];

    if (canvasContext) {
        canvasContext.clearRect(0, 0, canvasWidth, canvasHeight);
    }
};

const drawStaticFireworks = () => {
    if (!canvasContext) {
        return;
    }

    resizeFireworks();
    canvasContext.clearRect(0, 0, canvasWidth, canvasHeight);
    const shortSide = Math.min(canvasWidth, canvasHeight);
    const bursts = [
        [canvasWidth * 0.19, canvasHeight * 0.37, shortSide * 0.12, "#D8C18B"],
        [canvasWidth * 0.79, canvasHeight * 0.3, shortSide * 0.14, "#E4E8EC"],
        [canvasWidth * 0.52, canvasHeight * 0.18, shortSide * 0.16, "#F2D99B"]
    ];

    bursts.forEach(([x, y, radius, color]) => {
        canvasContext.save();
        const halo = canvasContext.createRadialGradient(x, y, 0, x, y, radius);
        halo.addColorStop(0, "rgba(255, 246, 220, .22)");
        halo.addColorStop(.28, `${color}66`);
        halo.addColorStop(1, `${color}00`);
        canvasContext.fillStyle = halo;
        canvasContext.beginPath();
        canvasContext.arc(x, y, radius, 0, Math.PI * 2);
        canvasContext.fill();

        for (let ray = 0; ray < 70; ray += 1) {
            const angle = (Math.PI * 2 * ray) / 70;
            const innerRadius = radius * .12;
            const outerRadius = radius * (.76 + (ray % 4) * .06);
            canvasContext.beginPath();
            canvasContext.moveTo(
                x + Math.cos(angle) * innerRadius,
                y + Math.sin(angle) * innerRadius
            );
            canvasContext.lineTo(
                x + Math.cos(angle) * outerRadius,
                y + Math.sin(angle) * outerRadius
            );
            canvasContext.strokeStyle = ray % 3 ? color : "#FFF8E8";
            canvasContext.globalAlpha = ray % 3 ? .78 : .98;
            canvasContext.lineWidth = ray % 5 === 0 ? 1.8 : 1;
            canvasContext.shadowColor = color;
            canvasContext.shadowBlur = 10;
            canvasContext.stroke();
        }

        canvasContext.restore();
    });
};

const launchShell = now => {
    const shortSide = Math.min(canvasWidth, canvasHeight);
    const targetY = canvasHeight * (.1 + Math.random() * .56);
    const duration = 950 + Math.random() * 580;
    const targetX = canvasWidth * (.12 + Math.random() * .76);
    const color = ["#F5D98E", "#E6EBF0", "#D2B46F", "#B6C2CC"][
        Math.floor(Math.random() * 4)
    ];

    shells.push({
        x: targetX,
        startX: targetX + (Math.random() - .5) * shortSide * .28,
        targetX,
        startY: canvasHeight + 8,
        targetY,
        y: canvasHeight + 8,
        startedAt: now,
        duration,
        curve: (Math.random() - .5) * shortSide * .13,
        color,
        trail: []
    });
};

const createBurst = (x, y, grandFinale = false) => {
    const palette = ["#F5D98E", "#E6EBF0", "#D2B46F", "#B6C2CC", "#FFF4D5"];
    const pattern = grandFinale ? "peony" : ["peony", "willow", "palm"][
        Math.floor(Math.random() * 3)
    ];
    const rayCount = grandFinale ? 190 : pattern === "palm" ? 42 : 116;
    const shortSide = Math.min(canvasWidth, canvasHeight);
    const baseSpeed = shortSide * (grandFinale ? .62 : .51);
    const primaryColor = grandFinale
        ? "#F5D98E"
        : palette[Math.floor(Math.random() * palette.length)];

    particles.push({
        type: "flash",
        x,
        y,
        age: 0,
        lifetime: 260,
        radius: shortSide * (grandFinale ? .25 : .16),
        color: primaryColor
    });

    const addSpark = (angle, speed, color, options = {}) => {
        particles.push({
            type: "spark",
            x,
            y,
            previousX: x,
            previousY: y,
            vx: Math.cos(angle) * speed * (options.horizontal || 1),
            vy: Math.sin(angle) * speed * (options.vertical || 1),
            age: 0,
            lifetime: options.lifetime || 1300 + Math.random() * 900,
            color,
            width: options.width || .8 + Math.random() * 1.3,
            twinkle: options.twinkle ?? Math.random() > .64,
            gravityScale: options.gravityScale || 1,
            trailLength: options.trailLength || 5,
            trail: []
        });
    };

    for (let index = 0; index < rayCount; index += 1) {
        const angle = (Math.PI * 2 * index) / rayCount +
            (Math.random() - .5) * .025;
        const speed = baseSpeed * (.56 + Math.random() * .44);
        const color = index % 5 === 0
            ? "#FFF4D5"
            : pattern === "peony"
                ? primaryColor
                : palette[Math.floor(Math.random() * palette.length)];
        const willow = pattern === "willow";
        const palm = pattern === "palm";
        addSpark(angle, speed, color, {
            horizontal: palm ? .42 : 1,
            vertical: willow ? 1.22 : palm ? 1.16 : 1,
            gravityScale: willow ? 1.35 : .82,
            trailLength: willow ? 11 : 6,
            lifetime: willow
                ? 2500 + Math.random() * 900
                : 1600 + Math.random() * 900,
            width: palm ? 1.35 + Math.random() * 1.4 : .85 + Math.random() * 1.3
        });
    }

    const innerCount = grandFinale ? 68 : 30;
    for (let index = 0; index < innerCount; index += 1) {
        addSpark(
            Math.random() * Math.PI * 2,
            baseSpeed * (.12 + Math.random() * .28),
            index % 2 ? "#FFF4D5" : "#E6EBF0",
            { lifetime: 650 + Math.random() * 650, trailLength: 3, width: 1.2 }
        );
    }

    for (let ring = 0; ring < (grandFinale ? 3 : 1); ring += 1) {
        particles.push({
            type: "ring",
            x,
            y,
            age: -ring * 95,
            lifetime: 660 + ring * 100,
            radius: baseSpeed * (.1 + ring * .09),
            color: ring % 2 ? "#E6EBF0" : primaryColor,
            width: ring === 0 ? 1.8 : 1.1
        });
    }

    for (let index = 0; index < (grandFinale ? 10 : 5); index += 1) {
        particles.push({
            type: "smoke",
            x: x + (Math.random() - 0.5) * 24,
            y: y + (Math.random() - 0.5) * 24,
            age: 0,
            lifetime: 1400 + Math.random() * 950,
            radius: 12 + Math.random() * (grandFinale ? 34 : 24),
            drift: (Math.random() - 0.5) * 35
        });
    }

    if (particles.length > 1800) {
        particles.splice(0, particles.length - 1800);
    }
};

const drawShell = (shell, now) => {
    const progress = Math.min((now - shell.startedAt) / shell.duration, 1);
    const easedProgress = 1 - (1 - progress) ** 1.2;
    shell.x =
        shell.startX +
        (shell.targetX - shell.startX) * easedProgress +
        Math.sin(progress * Math.PI) * shell.curve;
    shell.y =
        shell.startY - (shell.startY - shell.targetY) * easedProgress;
    shell.trail.push({ x: shell.x, y: shell.y });

    if (shell.trail.length > 23) {
        shell.trail.shift();
    }

    canvasContext.save();
    for (let index = 1; index < shell.trail.length; index += 1) {
        const previous = shell.trail[index - 1];
        const current = shell.trail[index];
        canvasContext.beginPath();
        canvasContext.moveTo(previous.x, previous.y);
        canvasContext.lineTo(current.x, current.y);
        canvasContext.strokeStyle = shell.color;
        canvasContext.globalAlpha = (index / shell.trail.length) * .8;
        canvasContext.lineWidth = 1.1 + (index / shell.trail.length) * 1.9;
        canvasContext.shadowColor = shell.color;
        canvasContext.shadowBlur = 11;
        canvasContext.stroke();
    }
    canvasContext.globalAlpha = .9;
    canvasContext.shadowColor = shell.color;
    canvasContext.shadowBlur = 20;
    canvasContext.beginPath();
    canvasContext.arc(shell.x, shell.y, 3.2, 0, Math.PI * 2);
    canvasContext.fillStyle = shell.color;
    canvasContext.fill();
    canvasContext.globalAlpha = .96;
    canvasContext.shadowColor = "#FFF8E8";
    canvasContext.shadowBlur = 10;
    canvasContext.beginPath();
    canvasContext.arc(shell.x, shell.y, 1.4, 0, Math.PI * 2);
    canvasContext.fillStyle = "#FFF8E8";
    canvasContext.fill();
    canvasContext.restore();

    if (progress >= 1) {
        createBurst(
            shell.x,
            shell.targetY,
            now - fireworksStartedAt >= 12500
        );
        return false;
    }

    return true;
};

const drawParticles = deltaSeconds => {
    const gravity = Math.min(canvasHeight * 0.78, 620);
    particles = particles.filter(particle => {
        if (particle.age < 0) {
            particle.age += deltaSeconds * 1000;
            return true;
        }

        particle.age += deltaSeconds * 1000;

        if (particle.age >= particle.lifetime) {
            return false;
        }

        const lifeRatio = particle.age / particle.lifetime;

        if (particle.type === "flash") {
            const gradient = canvasContext.createRadialGradient(
                particle.x,
                particle.y,
                0,
                particle.x,
                particle.y,
                particle.radius * (1 - lifeRatio * .55)
            );
            gradient.addColorStop(0, `rgba(255, 250, 232, ${(1 - lifeRatio) * .78})`);
            gradient.addColorStop(.12, `${particle.color}B8`);
            gradient.addColorStop(1, `${particle.color}00`);
            canvasContext.fillStyle = gradient;
            canvasContext.beginPath();
            canvasContext.arc(
                particle.x,
                particle.y,
                particle.radius * (1 - lifeRatio * .55),
                0,
                Math.PI * 2
            );
            canvasContext.fill();
            return true;
        }

        if (particle.type === "ring") {
            const expansion = 1 + lifeRatio * 1.2;
            canvasContext.beginPath();
            canvasContext.arc(
                particle.x,
                particle.y,
                particle.radius * expansion,
                0,
                Math.PI * 2
            );
            canvasContext.strokeStyle = particle.color;
            canvasContext.globalAlpha = (1 - lifeRatio) * .34;
            canvasContext.lineWidth = particle.width * (1 - lifeRatio * .5);
            canvasContext.shadowColor = particle.color;
            canvasContext.shadowBlur = 9;
            canvasContext.stroke();
            return true;
        }

        if (particle.type === "smoke") {
            const alpha = (1 - lifeRatio) * .055;
            const smokeX = particle.x + particle.drift * lifeRatio;
            const smokeY = particle.y - particle.age * 0.008;
            const gradient = canvasContext.createRadialGradient(
                smokeX,
                smokeY,
                1,
                smokeX,
                smokeY,
                particle.radius * (0.6 + lifeRatio)
            );
            gradient.addColorStop(0, `rgba(150, 151, 153, ${alpha})`);
            gradient.addColorStop(1, "rgba(90, 94, 100, 0)");
            canvasContext.fillStyle = gradient;
            canvasContext.beginPath();
            canvasContext.arc(
                smokeX,
                smokeY,
                particle.radius * (0.6 + lifeRatio),
                0,
                Math.PI * 2
            );
            canvasContext.fill();
            return true;
        }

        const drag = Math.max(0, 1 - deltaSeconds * (particle.gravityScale > 1 ? .5 : .32));
        particle.vx *= drag;
        particle.vy =
            particle.vy * drag +
            gravity * deltaSeconds * .52 * (particle.gravityScale || 1);
        particle.previousX = particle.x;
        particle.previousY = particle.y;
        particle.x += particle.vx * deltaSeconds;
        particle.y += particle.vy * deltaSeconds;
        if (particle.trail.length > particle.trailLength) {
            particle.trail.shift();
        }
        particle.trail.push({ x: particle.x, y: particle.y });
        const flicker =
            particle.twinkle && Math.sin(particle.age * .035) < -.55 ? .22 : 1;

        if (particle.trail.length > 1) {
            canvasContext.beginPath();
            canvasContext.moveTo(particle.trail[0].x, particle.trail[0].y);
            for (let index = 1; index < particle.trail.length; index += 1) {
                canvasContext.lineTo(
                    particle.trail[index].x,
                    particle.trail[index].y
                );
            }
            canvasContext.strokeStyle = particle.color;
            canvasContext.globalAlpha = (1 - lifeRatio) * .9 * flicker;
            canvasContext.lineWidth = particle.width;
            canvasContext.shadowColor = particle.color;
            canvasContext.shadowBlur = particle.width > 1.6 ? 7 : 3;
            canvasContext.stroke();
        }
        return true;
    });
    canvasContext.globalAlpha = 1;
    canvasContext.shadowBlur = 0;
};

const drawFireworks = now => {
    animationFrame = 0;

    if (!celebrationActive || activeStage !== "fireworks" || !canvasContext) {
        return;
    }

    const deltaSeconds = Math.min((now - previousFrameTime) / 1000, 0.04);
    previousFrameTime = now;
    const elapsed = now - fireworksStartedAt;
    const finale = elapsed >= 12500;
    const shellInterval = finale ? 210 : 390;

    if (now - lastShellTime >= shellInterval) {
        launchShell(now);
        if (finale || Math.random() > .58) {
            launchShell(now);
        }
        if (finale && Math.random() > .5) {
            launchShell(now);
        }
        lastShellTime = now;
    }

    canvasContext.clearRect(0, 0, canvasWidth, canvasHeight);
    shells = shells.filter(shell => drawShell(shell, now));
    drawParticles(deltaSeconds);
    animationFrame = window.requestAnimationFrame(drawFireworks);
};

const startFireworks = () => {
    clearFireworks();

    if (!canvasContext) {
        console.error("Could not initialize the New Year fireworks canvas.");
        return;
    }

    resizeFireworks();

    if (reducedMotionPreference.matches) {
        drawStaticFireworks();
        return;
    }

    fireworksStartedAt = performance.now();
    previousFrameTime = fireworksStartedAt;
    lastShellTime = 0;
    animationFrame = window.requestAnimationFrame(drawFireworks);
};

const showStage = (stageName, stageElement, focusHeading = true) => {
    activeStage = stageName;
    celebrationStages.forEach(stage => {
        stage.hidden = stage !== stageElement;
    });
    const heading = stageElement.querySelector("h2");
    launchCelebration.setAttribute("aria-labelledby", heading.id);

    if (focusHeading) {
        heading.focus({ preventScroll: true });
    }
};

const removeActiveListeners = () => {
    window.removeEventListener("resize", handleFireworksResize);
    launchCelebration.removeEventListener("keydown", handleCelebrationKeydown);

    if (reducedMotionHandler) {
        if (typeof reducedMotionPreference.removeEventListener === "function") {
            reducedMotionPreference.removeEventListener(
                "change",
                reducedMotionHandler
            );
        } else {
            reducedMotionPreference.removeListener(reducedMotionHandler);
        }
        reducedMotionHandler = null;
    }
};

const restoreHomepage = (completed, wasEligible) => {
    if (completed && wasEligible && !localCelebrationTest) {
        rememberAsSeen();
    }

    if (entranceFrame) {
        window.cancelAnimationFrame(entranceFrame);
        entranceFrame = 0;
    }

    clearSequenceTimers();
    clearFireworks();
    removeActiveListeners();
    launchCelebration.classList.remove("is-visible");
    launchCelebration.classList.add("is-exiting");

    window.setTimeout(() => {
        launchCelebration.hidden = true;
        launchCelebration.setAttribute("aria-hidden", "true");
        launchCelebration.classList.remove("is-exiting");
        document.documentElement.classList.remove(
            "launch-celebration-active"
        );
        document.body.classList.remove("launch-celebration-active");
        celebrationActive = false;
        activeStage = null;

        if (wasEligible || localCelebrationTest) {
            replayButton.hidden = false;
        }

        if (
            previousFocus instanceof HTMLElement &&
            !launchCelebration.contains(previousFocus)
        ) {
            previousFocus.focus({ preventScroll: true });
        }
    }, 450);
};

const finishCelebration = () => {
    if (!celebrationActive) {
        return;
    }

    const wasEligible = Date.now() >= launchDeadline;
    celebrationActive = false;
    restoreHomepage(true, wasEligible);
};

function handleCelebrationKeydown(event) {
    if (event.key === "Escape") {
        event.preventDefault();
        finishCelebration();
        return;
    }

    if (event.key === "Tab") {
        event.preventDefault();
        celebrationSkip.focus();
    }
}

const showCelebration = ({ replay = false } = {}) => {
    if (celebrationActive) {
        return;
    }

    const wasEligible = Date.now() >= launchDeadline;

    if (!localCelebrationTest && !replay && (!wasEligible || hasBeenSeen())) {
        return;
    }

    if (wasEligible && !localCelebrationTest && !replay) {
        rememberCelebrationStarted();
    }

    clearSequenceTimers();
    celebrationActive = true;
    previousFocus = document.activeElement;
    launchCelebration.hidden = false;
    launchCelebration.setAttribute("aria-hidden", "false");
    launchCelebration.classList.remove("is-exiting");
    document.documentElement.classList.add("launch-celebration-active");
    document.body.classList.add("launch-celebration-active");
    showStage("fireworks", fireworkStage, false);
    celebrationSkip.focus({ preventScroll: true });

    entranceFrame = window.requestAnimationFrame(() => {
        entranceFrame = 0;
        launchCelebration.classList.add("is-visible");
    });

    window.addEventListener("resize", handleFireworksResize, { passive: true });
    launchCelebration.addEventListener("keydown", handleCelebrationKeydown);
    reducedMotionHandler = () => {
        if (!celebrationActive || activeStage !== "fireworks") {
            return;
        }

        startFireworks();
    };

    if (typeof reducedMotionPreference.addEventListener === "function") {
        reducedMotionPreference.addEventListener(
            "change",
            reducedMotionHandler
        );
    } else {
        reducedMotionPreference.addListener(reducedMotionHandler);
    }

    startFireworks();

    scheduleSequence(() => {
        clearFireworks();
        showStage("announcement", announcementStage);
    }, stageDurations.fireworks);

    scheduleSequence(() => {
        showStage("winner", winnerStage);
    }, stageDurations.fireworks + stageDurations.announcement);

    scheduleSequence(
        finishCelebration,
        stageDurations.fireworks +
            stageDurations.announcement +
            stageDurations.winner
    );
};

celebrationSkip.addEventListener("click", finishCelebration);
replayButton.addEventListener("click", () => {
    if (localCelebrationTest || Date.now() >= launchDeadline) {
        showCelebration({ replay: true });
    }
});

const checkLaunchDeadline = () => {
    const remaining = launchDeadline - Date.now();

    if (remaining > 0) {
        window.setTimeout(
            checkLaunchDeadline,
            Math.min(remaining, maximumTimeout)
        );
        return;
    }

    if (hasBeenSeen()) {
        replayButton.hidden = false;
        return;
    }

    showCelebration();
};

if (localCelebrationTest) {
    confirmedWinner.hidden = true;
    winnerPending.hidden = false;
    replayButton.hidden = true;
    showCelebration();
} else if (Date.now() >= launchDeadline) {
    checkLaunchDeadline();
} else {
    window.setTimeout(
        checkLaunchDeadline,
        Math.min(launchDeadline - Date.now(), maximumTimeout)
    );
}
