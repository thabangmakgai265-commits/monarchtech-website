
"use strict";

/* =========================================================
   MONARCHAUREX LUCKY DRAW
   Registration + secure server-controlled prize allocation
   ========================================================= */

const registrationForm = document.getElementById("registration-form");
const registrationStatus = document.getElementById("registration-status");
const marketingConsentInput = document.getElementById("marketing-consent");
const marketingStatus = document.getElementById("marketing-status");
const marketingPreferenceStatus = document.getElementById(
    "marketing-preference-status"
);

const registrationSubmitButton =
    registrationForm?.querySelector('button[type="submit"]');

const phoneInput = document.getElementById("phone");

const requiredTextFields = [
    ["first-name", "Enter your first name."],
    ["last-name", "Enter your last name."],
    ["country", "Enter your country or region."]
].map(([id, message]) => {
    const input = document.getElementById(id);
    return input ? { input, message } : null;
});

const entryConfirmation = document.getElementById("entry-confirmation");
const entryIdDisplay = document.getElementById("entry-id");

const spinButton = document.getElementById("spin-button");
const wheelStatus = document.getElementById("wheel-status");
const wheel = document.getElementById("prize-wheel");
const resultPlaceholder = document.getElementById("result-placeholder");
const prizeResult = document.getElementById("prize-result");
const resultName = document.getElementById("result-prize-name");
const claimInstructions = document.getElementById("claim-instructions");

const wheelSpinDuration = 5200;

const projectUrl = "https://vvobkcikfueenyzgjghk.supabase.co";

const supabasePublishableKey =
    "sb_publishable_DIOMqnJVpHDotsi9HWIDnQ_tMpBuRQG";

const availablePrizes = new Set([
    "100% OFF — THE GOLDEN PRIVILEGE",
    "75% OFF",
    "50% OFF",
    "35% OFF",
    "10% OFF",
    "R35 OFF",
    "Web Care"
]);

/* =========================================================
   CHECK REQUIRED HTML ELEMENTS
   ========================================================= */

if (
    !registrationForm ||
    !registrationStatus ||
    !marketingConsentInput ||
    !marketingStatus ||
    !marketingPreferenceStatus ||
    !registrationSubmitButton ||
    !phoneInput ||
    requiredTextFields.some(field => !field) ||
    !entryConfirmation ||
    !entryIdDisplay ||
    !spinButton ||
    !wheelStatus ||
    !wheel ||
    !resultPlaceholder ||
    !prizeResult ||
    !resultName ||
    !claimInstructions
) {
    throw new Error(
        "The Lucky Draw page is missing required interface elements. Check index.html."
    );
}

/* =========================================================
   COMPETITION STATE
   ========================================================= */

const competitionState = {
    entryId: null,
    spinToken: null,
    spinUsed: false,
    spinInProgress: false,
    result: null,
    rotation: Number.parseFloat(wheel.dataset.rotation || "0") || 0
};

/* =========================================================
   STATUS HELPER
   ========================================================= */

const setStatus = (element, message, status = "pending") => {
    if (!element) return;

    element.textContent = message;
    element.dataset.status = status;
};

/* =========================================================
   SAFE RESPONSE READER
   ========================================================= */

const readJsonResponse = async response => {
    const responseText = await response.text();

    let result;

    try {
        result = responseText ? JSON.parse(responseText) : {};
    } catch {
        throw new Error(
            "The competition service returned an unreadable response."
        );
    }

    if (!response.ok) {
        throw new Error(
            result.error ||
            result.message ||
            `The competition service returned error ${response.status}.`
        );
    }

    return result;
};

/* =========================================================
   REGISTER ENTRY WITH SUPABASE
   ========================================================= */

const saveEntryWithSupabase = async formData => {
    const payload = formData instanceof FormData
        ? Object.fromEntries(formData.entries())
        : { ...formData };

    payload.marketingConsent = marketingConsentInput.checked;

    const response = await fetch(
        `${projectUrl}/functions/v1/lucky-draw-register`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "apikey": supabasePublishableKey,
                "Authorization": `Bearer ${supabasePublishableKey}`
            },
            body: JSON.stringify(payload)
        }
    );

    return readJsonResponse(response);
};

const registerEntry = async formData => {
    const wantsMarketing = marketingConsentInput.checked;

    const savedEntry = await saveEntryWithSupabase(formData);

    if (
        savedEntry.available !== true ||
        savedEntry.recorded !== true ||
        typeof savedEntry.entryId !== "string" ||
        !savedEntry.entryId ||
        typeof savedEntry.spinToken !== "string" ||
        !savedEntry.spinToken
    ) {
        throw new Error(
            "Registration did not return a valid entry and secure spin token."
        );
    }

    return {
        entryId: savedEntry.entryId,
        spinToken: savedEntry.spinToken,
        wantsMarketing
    };
};

/* =========================================================
   REQUEST PRIZE FROM THE SERVER

   The browser never chooses the prize.
   The server is responsible for allocating and recording it.
   ========================================================= */

const allocatePrizeWithSupabase = async (entryId, spinToken) => {
    if (!entryId || !spinToken) {
        throw new Error("A valid entry and spin token are required.");
    }

    const response = await fetch(
        `${projectUrl}/functions/v1/lucky-draw-spin`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "apikey": supabasePublishableKey,
                "Authorization": `Bearer ${supabasePublishableKey}`
            },
            body: JSON.stringify({
                entryId,
                spinToken
            })
        }
    );

    const result = await readJsonResponse(response);

    if (
        result.available !== true ||
        result.spinUsed !== true ||
        !availablePrizes.has(result.prize) ||
        typeof result.claimInstructions !== "string"
    ) {
        throw new Error(
            "The server did not return a valid confirmed prize."
        );
    }

    return result;
};

/* =========================================================
   INPUT VALIDATION
   ========================================================= */

const validatePhoneNumber = () => {
    const value = phoneInput.value.trim();
    const isValid = /^[+0-9() -]{7,24}$/.test(value);

    phoneInput.setCustomValidity(
        isValid
            ? ""
            : "Enter a phone number using digits and standard phone symbols."
    );

    return isValid;
};

const validateRequiredTextFields = () => {
    requiredTextFields.forEach(field => {
        field.input.setCustomValidity(
            field.input.value.trim() ? "" : field.message
        );
    });
};

phoneInput.addEventListener("input", validatePhoneNumber);

requiredTextFields.forEach(field => {
    field.input.addEventListener("input", validateRequiredTextFields);
});

/* =========================================================
   INITIAL PAGE STATE
   ========================================================= */

spinButton.disabled = true;
spinButton.textContent = "Register to unlock your spin";

entryConfirmation.hidden = true;
prizeResult.hidden = true;
resultPlaceholder.hidden = false;

/* =========================================================
   REGISTRATION SUBMISSION
   ========================================================= */

registrationForm.addEventListener("submit", async event => {
    event.preventDefault();

    if (registrationSubmitButton.disabled) return;

    validateRequiredTextFields();
    validatePhoneNumber();

    if (!registrationForm.reportValidity()) return;

    registrationSubmitButton.disabled = true;

    setStatus(
        registrationStatus,
        "Submitting your entry securely..."
    );

    try {
        const formData = new FormData(registrationForm);

        [
            "firstName",
            "lastName",
            "email",
            "phone",
            "country"
        ].forEach(name => {
            const value = formData.get(name);

            if (typeof value === "string") {
                formData.set(name, value.trim());
            }
        });

        const result = await registerEntry(formData);

        competitionState.entryId = result.entryId;
        competitionState.spinToken = result.spinToken;
        competitionState.spinUsed = false;
        competitionState.spinInProgress = false;
        competitionState.result = null;

        entryIdDisplay.textContent = result.entryId;
        entryConfirmation.hidden = false;

        registrationSubmitButton.textContent = "Entry received";

        /*
         * Marketing consent is optional.
         * Recording a preference does not mean an email subscription
         * has been activated by an email provider.
         */
        if (result.wantsMarketing) {
            setStatus(
                marketingStatus,
                "Your marketing preference was recorded with your entry. An active email subscription requires a connected email service."
            );
        } else {
            setStatus(
                marketingStatus,
                "You have not opted in to marketing updates."
            );
        }

        setStatus(
            registrationStatus,
            "Your entry has been recorded successfully.",
            "success"
        );

        /*
         * Unlock the one-time spin only after the server returns
         * both the saved entry ID and the secure spin token.
         */
        spinButton.disabled = false;
        spinButton.textContent = "Spin the prize wheel";

        setStatus(
            wheelStatus,
            "Your entry is recorded. You can now use your one-time spin.",
            "success"
        );

        /*
         * Bring the entry confirmation into view without forcing
         * the user to search for the confirmation message.
         */
        entryConfirmation.scrollIntoView({
            behavior: "smooth",
            block: "nearest"
        });

    } catch (error) {
        console.error("Lucky Draw registration error:", error);

        registrationSubmitButton.disabled = false;

        setStatus(
            registrationStatus,
            error.message ||
                "We could not confirm your entry. Please try again.",
            "error"
        );
    }
});

/* =========================================================
   WHEEL ANIMATION
   ========================================================= */

const animatePrizeWheel = () => {
    return new Promise(resolve => {
        let finished = false;
        let spinTimeout;

        const finishAnimation = () => {
            if (finished) return;

            finished = true;

            window.clearTimeout(spinTimeout);
            wheel.removeEventListener("transitionend", handleTransitionEnd);

            resolve();
        };

        const handleTransitionEnd = event => {
            if (
                event.target === wheel &&
                event.propertyName === "transform"
            ) {
                finishAnimation();
            }
        };

        /*
         * Reset the transition so each animation starts from the
         * wheel's actual current position.
         */
        wheel.style.transition = "none";

        const currentRotation =
            Number.parseFloat(wheel.dataset.rotation || "0") || 0;

        wheel.style.transform = `rotate(${currentRotation}deg)`;

        /*
         * Force the browser to apply the reset before animating.
         */
        void wheel.offsetWidth;

        wheel.style.transition =
            `transform ${wheelSpinDuration}ms cubic-bezier(.08, .72, .08, 1)`;

        wheel.addEventListener("transitionend", handleTransitionEnd);

        /*
         * Multiple full rotations ensure the wheel visibly spins.
         * The prize shown afterwards is always the server-confirmed prize.
         */
        const nextRotation = currentRotation + 1800 + 360;

        competitionState.rotation = nextRotation;
        wheel.dataset.rotation = String(nextRotation);

        /*
         * Start the animation on the next animation frame.
         * This is deliberately not skipped for reduced-motion settings,
         * so the requested wheel animation still runs.
         */
        window.requestAnimationFrame(() => {
            wheel.style.transform = `rotate(${nextRotation}deg)`;
        });

        /*
         * Fallback in case the browser does not fire transitionend.
         */
        spinTimeout = window.setTimeout(
            finishAnimation,
            wheelSpinDuration + 500
        );
    });
};

/* =========================================================
   SPIN BUTTON
   ========================================================= */

spinButton.addEventListener("click", async () => {
    if (
        !competitionState.entryId ||
        !competitionState.spinToken ||
        competitionState.spinUsed ||
        competitionState.spinInProgress
    ) {
        return;
    }

    competitionState.spinInProgress = true;
    spinButton.disabled = true;
    spinButton.textContent = "Your wheel is spinning...";

    const wheelPanel = wheel.closest(".wheel-panel");

    if (wheelPanel) {
        wheelPanel.classList.remove("has-result");
        wheelPanel.classList.add("is-spinning");
    }

    setStatus(
        wheelStatus,
        "Requesting your prize from the secure competition service..."
    );

    let result;

    try {
        /*
         * Get the official result before starting the animation.
         * No prize is generated or selected in the browser.
         */
        result = await allocatePrizeWithSupabase(
            competitionState.entryId,
            competitionState.spinToken
        );

    } catch (error) {
        console.error("Lucky Draw spin error:", error);

        competitionState.spinInProgress = false;

        if (wheelPanel) {
            wheelPanel.classList.remove("is-spinning");
        }

        /*
         * Keep the button disabled after an ambiguous failure.
         * The server may have already recorded the one-time spin.
         * Retrying without checking the saved result could cause confusion.
         */
        spinButton.disabled = true;
        spinButton.textContent = "Result confirmation needed";

        setStatus(
            wheelStatus,
            "We could not confirm your result. Your spin may have been recorded. Please contact MonarchAurex before trying again.",
            "error"
        );

        return;
    }

    /*
     * The server has confirmed and recorded the prize.
     * Save the confirmed result in the current page state.
     */
    competitionState.spinUsed = true;
    competitionState.result = result;

    /*
     * Display the server-confirmed prize and instructions.
     * The wheel animation is visual only.
     */
    resultName.textContent = result.prize;
    claimInstructions.textContent = result.claimInstructions;

    if (result.prize === "100% OFF — THE GOLDEN PRIVILEGE") {
        prizeResult.classList.add("is-grand-prize");
    } else {
        prizeResult.classList.remove("is-grand-prize");
    }

    setStatus(
        wheelStatus,
        "Your prize has been confirmed. The wheel is spinning...",
        "pending"
    );

    try {
        await animatePrizeWheel();
    } catch (error) {
        /*
         * A display-animation issue must not undo the server's result.
         */
        console.error("Lucky Draw animation error:", error);
    }

    if (wheelPanel) {
        wheelPanel.classList.remove("is-spinning");
        wheelPanel.classList.add("has-result");
    }

    resultPlaceholder.hidden = true;
    prizeResult.hidden = false;

    setStatus(
        wheelStatus,
        "Your confirmed prize is displayed below. MonarchAurex will review your eligibility before the prize is fulfilled.",
        "success"
    );

    spinButton.textContent = "Spin already used";
    spinButton.disabled = true;

    competitionState.spinInProgress = false;

    /*
     * Move the confirmed result into view once the wheel has finished.
     */
    prizeResult.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });
});

/* =========================================================
   MARKETING UNSUBSCRIBE NOTICE
   ========================================================= */

const unsubscribeToken = new URLSearchParams(
    window.location.search
).get("unsubscribe_token");

if (unsubscribeToken) {
    const cleanUrl = new URL(window.location.href);

    cleanUrl.searchParams.delete("unsubscribe_token");

    window.history.replaceState(null, "", cleanUrl);

    marketingPreferenceStatus.hidden = false;

    setStatus(
        marketingPreferenceStatus,
        "Self-service unsubscribe is not available yet. Please contact MonarchAurex to change your marketing preferences.",
        "pending"
    );
}
