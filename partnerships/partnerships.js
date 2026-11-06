"use strict";

const partnershipForm = document.getElementById(
    "partnership-application-form"
);
const partnershipStatus = document.getElementById(
    "partnership-form-status"
);
const partnershipSubmit = partnershipForm?.querySelector(
    'button[type="submit"]'
);

if (!partnershipForm || !partnershipStatus || !partnershipSubmit) {
    throw new Error("The partnership application interface is incomplete.");
}

const endpoint = partnershipForm.dataset.formspreeEndpoint?.trim() || "";
const validEndpoint = /^https:\/\/formspree\.io\/f\/[A-Za-z0-9]+$/.test(endpoint);

if (validEndpoint) {
    partnershipForm.action = endpoint;
    partnershipForm.method = "POST";
    partnershipSubmit.disabled = false;
    partnershipSubmit.textContent = "Submit application";
    partnershipStatus.textContent =
        "Your application will be sent securely through Formspree.";
}

partnershipForm.addEventListener("submit", async event => {
    event.preventDefault();

    if (!validEndpoint) {
        partnershipStatus.textContent =
            "The Partnerships Formspree endpoint is not configured. Nothing was sent.";
        return;
    }

    if (!partnershipForm.reportValidity()) {
        return;
    }

    const phone = partnershipForm.elements.namedItem("contact_number");
    if (!(phone instanceof HTMLInputElement)) {
        throw new Error("The partnership contact number field is missing.");
    }

    if (!/^[+0-9() -]{7,24}$/.test(phone.value.trim())) {
        phone.setCustomValidity(
            "Enter a phone number using digits and standard phone symbols."
        );
        phone.reportValidity();
        return;
    }
    phone.setCustomValidity("");

    partnershipSubmit.disabled = true;
    partnershipSubmit.textContent = "Submitting...";
    partnershipStatus.textContent =
        "Submitting your application securely...";

    try {
        const response = await fetch(endpoint, {
            method: "POST",
            headers: { Accept: "application/json" },
            body: new FormData(partnershipForm)
        });
        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
            const details = Array.isArray(result.errors)
                ? result.errors
                    .map(error => error?.message)
                    .filter(message => typeof message === "string")
                    .join(" ")
                : "";
            throw new Error(
                details ||
                    "Formspree could not receive your application. Please try again."
            );
        }

        partnershipForm.reset();
        partnershipStatus.textContent =
            "Thank you. Your application was sent successfully.";
    } catch (error) {
        partnershipStatus.textContent =
            error instanceof Error
                ? error.message
                : "Your application could not be sent. Please try again.";
    } finally {
        partnershipSubmit.disabled = false;
        partnershipSubmit.textContent = "Submit application";
    }
});
