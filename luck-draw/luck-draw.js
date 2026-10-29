
"use strict";

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
const verificationForm = document.getElementById("verification-form");
const verificationStatus = document.getElementById("verification-status");
const spinButton = document.getElementById("spin-button");
const wheelStatus = document.getElementById("wheel-status");
const resultPlaceholder = document.getElementById("result-placeholder");
const prizeResult = document.getElementById("prize-result");

const reducedMotionPreference = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
);

const wheelSpinDuration = 5200;
const projectUrl = "https://vvobkcikfueenyzgjghk.supabase.co";
const supabasePublishableKey =
    "sb_publishable_DIOMqnJVpHDotsi9HWIDnQ_tMpBuRQG";

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
    !resultPlaceholder ||
    !prizeResult
) {
    throw new Error("The Lucky Draw page is missing required interface elements.");
}

const competitionState = {
    entryId: null,
    spinToken: null,
    spinUsed: false,
    result: null
};

const availablePrizes = new Set([
    "100% OFF — THE GOLDEN PRIVILEGE",
    "75% OFF",
    "50% OFF",
    "35% OFF",
    "10% OFF",
    "R35 OFF",
    "Web Care"
]);

const setStatus = (element, message, status = "pending") => {
    if (!element) return;

    element.textContent = message;
    element.dataset.status = status;
};

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

    const result = await response.json();

    if (!response.ok) {
        throw new Error(result.error || "Registration failed.");
    }

    return result;
};

/*
 * The registration Edge Function must return:
 * {
 *   available: true,
 *   recorded: true,
 *   entryId: "...",
 *   spinToken: "..."
 * }
 *
 * The server must store only a hash of the spin token and validate it
 * in lucky-draw-spin. Do not enable real spins before that is implemented.
 */
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
            "The registration service did not return a valid entry and spin token."
        );
    }

    return {
        status: "registered",
        entryId: savedEntry.entryId,
        spinToken: savedEntry.spinToken,
        marketingSubscribed: false,
        wantsMarketing
    };
};

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
            body: JSON.stringify({ entryId, spinToken })
        }
    );

    const result = await response.json();

    if (!response.ok) {
        throw new Error(result.error || "The spin could not be completed.");
    }

    if (
        result.available !== true ||
        result.spinUsed !== true ||
        !availablePrizes.has(result.prize) ||
        typeof result.claimInstructions !== "string"
    ) {
        throw new Error("The server returned an invalid prize result.");
    }

    return result;
};

const validatePhoneNumber = () => {
    const isValid = /^[+0-9() -]{7,24}$/.test(phoneInput.value.trim());

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

/* Contact verification is no longer required before spinning. */
if (verificationForm) {
    verificationForm.hidden = true;
}

spinButton.disabled = true;
spinButton.textContent = "Register to unlock your spin";

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

        ["firstName", "lastName", "email", "phone", "country"].forEach(name => {
            const value = formData.get(name);

            if (typeof value === "string") {
                formData.set(name, value.trim());
            }
        });

        const result = await registerEntry(formData);

        competitionState.entryId = result.entryId;
        competitionState.spinToken = result.spinToken;
        competitionState.spinUsed = false;

        entryIdDisplay.textContent = result.entryId;
        entryConfirmation.hidden = false;

        registrationSubmitButton.textContent = "Entry received";

        if (result.wantsMarketing) {
            setStatus(
                marketingStatus,
                "Your marketing preference was recorded with your entry. Email subscription is not active until an email service is connected."
            );
        } else {
            setStatus(
                marketingStatus,
                "You have not opted in to marketing updates."
            );
        }

        setStatus(
            registrationStatus,
            "Your entry has been recorded.",
            "success"
        );

        /*
         * Registration alone must not unlock the spin until the backend
         * returns a secure token and the spin endpoint validates it.
         */
        spinButton.disabled = false;
        spinButton.textContent = "Spin the prize wheel";
        wheelStatus.textContent =
            "Your entry is recorded. You may use your one spin.";
    } catch (error) {
        console.error("Lucky Draw registration error:", error);

        registrationSubmitButton.disabled = false;

        setStatus(
            registrationStatus,
            error.message || "We could not confirm your entry. Please try again.",
            "error"
        );
    }
});

spinButton.addEventListener("click", async () => {
    if (
        !competitionState.entryId ||
        !competitionState.spinToken ||
        competitionState.spinUsed
    ) {
        return;
    }

    spinButton.disabled = true;

    setStatus(
        wheelStatus,
        "Requesting your prize from the secure competition service..."
    );

    let result;

    try {
        result = await allocatePrizeWithSupabase(
            competitionState.entryId,
            competitionState.spinToken
        );
    } catch (error) {
        console.error("Lucky Draw spin error:", error);

        /*
         * A failed network response can be ambiguous: the server may have
         * recorded the spin before the connection failed. Do not blindly
         * submit another spin. Check the saved result with the backend first.
         */
        setStatus(
            wheelStatus,
            "We could not confirm the result. Please contact MonarchAurex before retrying.",
            "error"
        );

        return;
    }

    competitionState.spinUsed = true;
    competitionState.result = result;

    const wheel = document.getElementById("prize-wheel");
    const wheelPanel = wheel?.closest(".wheel-panel");
    const resultName = document.getElementById("result-prize-name");
    const claimInstructions = document.getElementById("claim-instructions");

    if (!wheel || !wheelPanel || !resultName || !claimInstructions) {
        setStatus(
            wheelStatus,
            "Your result was saved, but the result display is incomplete.",
            "error"
        );
        return;
    }

    if (!reducedMotionPreference.matches) {
        wheelPanel.classList.add("is-spinning");

        await new Promise(resolve => {
            let spinTimeout;

            const finishSpin = () => {
                window.clearTimeout(spinTimeout);
                wheel.removeEventListener("transitionend", handleTransitionEnd);
                resolve();
            };

            const handleTransitionEnd = event => {
                if (
                    event.target === wheel &&
                    event.propertyName === "transform"
                ) {
                    finishSpin();
                }
            };

            wheel.addEventListener("transitionend", handleTransitionEnd);

            window.requestAnimationFrame(() => {
                const currentRotation =
                    Number.parseFloat(
                        wheel.dataset.rotation || "0"
                    ) || 0;

                const nextRotation = currentRotation + 1800;

                wheel.dataset.rotation = String(nextRotation);
                wheel.style.transform = `rotate(${nextRotation}deg)`;
            });

            spinTimeout = window.setTimeout(
                finishSpin,
                wheelSpinDuration + 400
            );
        });
    }

    wheelPanel.classList.remove("is-spinning");
    wheelPanel.classList.add("has-result");

    resultName.textContent = result.prize;
    claimInstructions.textContent = result.claimInstructions;

    if (result.prize === "100% OFF — THE GOLDEN PRIVILEGE") {
        prizeResult.classList.add("is-grand-prize");
    }

    resultPlaceholder.hidden = true;
    prizeResult.hidden = false;

    setStatus(
        wheelStatus,
        "Your prize result has been recorded. MonarchAurex will review your eligibility before confirming the prize.",
        "success"
    );

    spinButton.textContent = "Spin already used";
});

/* Marketing unsubscribe remains unavailable until its backend is implemented. */
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
