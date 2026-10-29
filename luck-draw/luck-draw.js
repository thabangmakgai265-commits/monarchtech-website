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

    if (!input) {
        return null;
    }

    return { input, message };
});
const entryConfirmation = document.getElementById("entry-confirmation");
const entryIdDisplay = document.getElementById("entry-id");
const verificationForm = document.getElementById("verification-form");
const verificationStatus = document.getElementById("verification-status");
const verificationSubmitButton =
    verificationForm?.querySelector('button[type="submit"]');
const spinButton = document.getElementById("spin-button");
const wheelStatus = document.getElementById("wheel-status");
const resultPlaceholder = document.getElementById("result-placeholder");
const prizeResult = document.getElementById("prize-result");
const reducedMotionPreference = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
);
const wheelSpinDuration = 5200;

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
    !verificationForm ||
    !verificationStatus ||
    !verificationSubmitButton ||
    !spinButton ||
    !wheelStatus ||
    !resultPlaceholder ||
    !prizeResult
) {
    throw new Error("The Luck Draw page is missing required interface elements.");
}

const competitionState = {
    entryId: null,
    contactVerified: false,
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

const serviceUnavailable = () => ({ available: false });


const saveEntryWithSupabase = async formData => {
   const projectUrl = "https://vvobkcikfueenyzgjghk.supabase.co";

    // Replace this with your existing Supabase publishable/anon key.
    // Use the same key already used by your website's Supabase client.
    const supabasePublishableKey = "sb_publishable_DIOMqnJVpHDotsi9HWIDnQ_tMpBuRQG";

    const payload = Object.fromEntries(formData.entries());

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

const requestVerificationWithSupabase = async () => serviceUnavailable();
const verifyContactWithSupabase = async () => serviceUnavailable();
const allocatePrizeWithSupabase = async () => serviceUnavailable();
const sendRegistrationWithFormspree = async () => serviceUnavailable();
const subscribeToMarketingWithFormspree = async () => serviceUnavailable();
const unsubscribeFromMarketingWithSupabase = async () => serviceUnavailable();

const registerEntry = async formData => {
    const registrationData = Object.fromEntries(formData.entries());
    const wantsMarketing = marketingConsentInput.checked;
    const submittedConsentAt = wantsMarketing ? new Date().toISOString() : null;
    const entryData = {
        ...registrationData,
        marketingConsent: wantsMarketing,
        marketingConsentAt: submittedConsentAt
    };
    const savedEntry = await saveEntryWithSupabase(entryData);

    if (
        !savedEntry.available ||
        savedEntry.recorded !== true ||
        typeof savedEntry.entryId !== "string" ||
        !savedEntry.entryId ||
        savedEntry.marketingConsent !== wantsMarketing ||
        savedEntry.marketingConsentAt !== submittedConsentAt
    ) {
        return { status: "unavailable" };
    }

    let notificationSent = false;

    try {
        const notification = await sendRegistrationWithFormspree({
            entryId: savedEntry.entryId,
            registrationData
        });
        notificationSent = notification.sent === true;
    } catch (error) {
        console.error("Luck Draw notification service error:", error);
    }

    let marketingSubscribed = false;

    if (wantsMarketing) {
        try {
            const subscription = await subscribeToMarketingWithFormspree({
                entryId: savedEntry.entryId,
                consentAt: savedEntry.marketingConsentAt
            });
            marketingSubscribed = subscription.subscribed === true;
        } catch (error) {
            console.error("Luck Draw marketing subscription error:", error);
        }
    }

    return {
        status: "registered",
        entryId: savedEntry.entryId,
        notificationSent,
        marketingSubscribed
    };
};

const unsubscribeFromMarketing = async unsubscribeToken => {
    if (typeof unsubscribeToken !== "string" || !unsubscribeToken) {
        return { status: "unavailable" };
    }

    const result = await unsubscribeFromMarketingWithSupabase(unsubscribeToken);
    return result.unsubscribed === true
        ? { status: "unsubscribed" }
        : { status: "unavailable" };
};

const unsubscribeToken = new URLSearchParams(window.location.search).get(
    "unsubscribe_token"
);

if (unsubscribeToken) {
    const cleanUrl = new URL(window.location.href);
    cleanUrl.searchParams.delete("unsubscribe_token");
    window.history.replaceState(null, "", cleanUrl);
    marketingPreferenceStatus.hidden = false;

    unsubscribeFromMarketing(unsubscribeToken)
        .then(result => {
            if (result.status === "unsubscribed") {
                setStatus(
                    marketingPreferenceStatus,
                    "Your marketing subscription has been cancelled.",
                    "success"
                );
                return;
            }

            setStatus(
                marketingPreferenceStatus,
                "We could not confirm your unsubscribe request, so your preferences have not been changed. Please contact MonarchAurex for help."
            );
        })
        .catch(error => {
            console.error("Luck Draw unsubscribe service error:", error);
            setStatus(
                marketingPreferenceStatus,
                "Your unsubscribe request could not be confirmed. No preference changes were made.",
                "error"
            );
        });
}

const requestContactVerification = async entryId =>
    requestVerificationWithSupabase(entryId);

const verifyEntryContact = async (entryId, code) =>
    verifyContactWithSupabase(entryId, code);

const requestEntryPrize = async entryId =>
    allocatePrizeWithSupabase(entryId);

const setStatus = (element, message, status = "pending") => {
    element.textContent = message;
    element.dataset.status = status;
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

registrationForm.addEventListener("submit", async event => {
    event.preventDefault();

    if (registrationSubmitButton.disabled) {
        return;
    }

    validateRequiredTextFields();
    validatePhoneNumber();

    if (!registrationForm.reportValidity()) {
        return;
    }

    registrationSubmitButton.disabled = true;
    setStatus(
        registrationStatus,
        "Registration is not open yet. Your information has not been sent."
    );

    let result;

    try {
        const formData = new FormData(registrationForm);

        ["firstName", "lastName", "email", "phone", "country"].forEach(name => {
            const value = formData.get(name);

            if (typeof value === "string") {
                formData.set(name, value.trim());
            }
        });

        result = await registerEntry(formData);
    } catch (error) {
        console.error("Luck Draw registration service error:", error);
        registrationSubmitButton.disabled = false;
        setStatus(
            registrationStatus,
            "The registration result could not be confirmed. No entry confirmation is displayed.",
            "error"
        );
        return;
    }

    if (result.status !== "registered") {
        registrationSubmitButton.disabled = false;
        setStatus(
            registrationStatus,
            "We could not confirm your entry. Nothing has been recorded.",
            "error"
        );
        return;
    }

    if (!marketingConsentInput.checked) {
        setStatus(
            marketingStatus,
            "No marketing updates were requested; you have not been subscribed."
        );
    } else if (result.marketingSubscribed) {
        setStatus(
            marketingStatus,
            "Your marketing subscription has been confirmed. You can unsubscribe from any marketing message.",
            "success"
        );
    } else {
        setStatus(
            marketingStatus,
            "Your optional marketing preference could not be confirmed. You have not been subscribed."
        );
    }

    registrationSubmitButton.textContent = "Entry received";
    competitionState.entryId = result.entryId;
    entryIdDisplay.textContent = result.entryId;
    entryConfirmation.hidden = false;
    setStatus(
        registrationStatus,
        "Your entry has been recorded. Follow the contact verification step to continue.",
        "success"
    );

    try {
        const verificationRequest =
            await requestContactVerification(competitionState.entryId);

        if (
            !verificationRequest.available ||
            verificationRequest.requested !== true
        ) {
            setStatus(
                verificationStatus,
                "Contact verification is not available yet. Your entry cannot spin."
            );
            return;
        }

        verificationSubmitButton.disabled = false;
        setStatus(
            verificationStatus,
            "A verification code has been requested for your registered contact.",
            "success"
        );
    } catch (error) {
        console.error("Luck Draw verification service error:", error);
        setStatus(
            verificationStatus,
            "Contact verification could not be requested. Your entry cannot spin yet.",
            "error"
        );
    }
});

verificationForm.addEventListener("submit", async event => {
    event.preventDefault();

    if (!verificationForm.reportValidity()) {
        return;
    }

    if (!competitionState.entryId) {
        setStatus(
            verificationStatus,
            "A recorded entry is required before contact verification."
        );
        return;
    }

    try {
        const code = new FormData(verificationForm).get("verificationCode");
        const result = await verifyEntryContact(competitionState.entryId, code);

        if (!result.available || result.verified !== true) {
            setStatus(
                verificationStatus,
                "Contact verification could not be completed. No verification has been recorded."
            );
            return;
        }

        competitionState.contactVerified = true;
        spinButton.disabled = false;
        spinButton.textContent = "Spin the prize wheel";
        setStatus(verificationStatus, "Contact details verified.", "success");
        wheelStatus.textContent = "Your verified entry is ready for its one authorized spin.";
    } catch (error) {
        console.error("Luck Draw verification service error:", error);
        setStatus(
            verificationStatus,
            "Contact verification could not be completed. No verification has been recorded.",
            "error"
        );
    }
});

spinButton.addEventListener("click", async () => {
    if (
        !competitionState.entryId ||
        !competitionState.contactVerified ||
        competitionState.spinUsed
    ) {
        return;
    }

    spinButton.disabled = true;
    wheelStatus.textContent = "Checking your entry with the secure competition service.";

    let result;

    try {
        result = await requestEntryPrize(competitionState.entryId);
    } catch (error) {
        console.error("Luck Draw prize service error:", error);
        spinButton.disabled = false;
        wheelStatus.textContent =
            "Prize allocation could not be completed. No spin or prize confirmation was received.";
        return;
    }

    if (
        !result ||
        !result.available ||
        !availablePrizes.has(result.prize) ||
        result.spinUsed !== true ||
        typeof result.claimInstructions !== "string" ||
        !result.claimInstructions ||
        !Number.isFinite(result.rotation)
    ) {
        spinButton.disabled = false;
        wheelStatus.textContent =
            "Secure prize allocation is not available yet. No spin or prize has been recorded.";
        return;
    }

    competitionState.spinUsed = true;
    competitionState.result = result;

    const wheel = document.getElementById("prize-wheel");
    const wheelPanel = wheel?.closest(".wheel-panel");
    const resultName = document.getElementById("result-prize-name");
    const claimInstructions = document.getElementById("claim-instructions");

    if (!wheel || !wheelPanel || !resultName || !claimInstructions) {
        throw new Error("The Luck Draw result interface is incomplete.");
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
                if (event.target === wheel && event.propertyName === "transform") {
                    finishSpin();
                }
            };

            wheel.addEventListener("transitionend", handleTransitionEnd);
            window.requestAnimationFrame(() => {
                wheel.style.transform = `rotate(${result.rotation}deg)`;
            });
            spinTimeout = window.setTimeout(finishSpin, wheelSpinDuration + 400);
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
    setStatus(wheelStatus, "Your prize result has been recorded.", "success");
});
