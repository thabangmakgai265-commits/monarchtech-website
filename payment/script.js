/* =========================================================
   MONARCHAUREX PAYMENT PAGE
========================================================= */

"use strict";


/* =========================================================
   SECURE PAYFAST BACKEND
========================================================= */

const PAYFAST_BACKEND_URL =
    "https://monarchaurex-payfast-backend.monarchaurexpayfast.workers.dev";


/* =========================================================
   PACKAGE PRICES
========================================================= */

const packagePrices = {

    Graduate: 899,

    Professional: 1999,

    Executive: 2599

};


/* =========================================================
   DOM
========================================================= */

const elements = {

    requestId:
        document.getElementById("request-id"),

    customerName:
        document.getElementById("customer-name"),

    customerEmail:
        document.getElementById("customer-email"),

    packageName:
        document.getElementById("package-name"),

    packagePrice:
        document.getElementById("package-price"),

    paymentDescription:
        document.getElementById("payment-description"),

    summaryTotal:
        document.getElementById("summary-total"),

    summaryPaymentOption:
        document.getElementById("summary-payment-option"),

    summaryAmountDue:
        document.getElementById("summary-amount-due"),

    summaryRemaining:
        document.getElementById("summary-remaining"),

    remainingRow:
        document.getElementById("remaining-row"),

    paymentTotal:
        document.getElementById("payment-total"),

    paymentMessage:
        document.getElementById("payment-message"),

    payButton:
        document.getElementById("pay-button"),

    payfastForm:
        document.getElementById("payfast-form"),

    currentYear:
        document.getElementById("current-year")

};


/* =========================================================
   PAYFAST FORM ELEMENTS
========================================================= */

const payfastFields = {

    merchantId:
        document.getElementById("pf-merchant-id"),

    merchantKey:
        document.getElementById("pf-merchant-key"),

    returnUrl:
        document.getElementById("pf-return-url"),

    cancelUrl:
        document.getElementById("pf-cancel-url"),

    notifyUrl:
        document.getElementById("pf-notify-url"),

    nameFirst:
        document.getElementById("pf-name-first"),

    nameLast:
        document.getElementById("pf-name-last"),

    email:
        document.getElementById("pf-email"),

    paymentId:
        document.getElementById("pf-payment-id"),

    amount:
        document.getElementById("pf-amount"),

    itemName:
        document.getElementById("pf-item-name"),

    itemDescription:
        document.getElementById("pf-item-description"),

    customStr1:
        document.getElementById("pf-custom-str1"),

    customStr2:
        document.getElementById("pf-custom-str2"),

    signature:
        document.getElementById("pf-signature")

};


/* =========================================================
   HELPERS
========================================================= */

function formatCurrency(amount) {

    const number = Number(amount) || 0;

    return new Intl.NumberFormat("en-ZA", {
        style: "currency",
        currency: "ZAR",
        minimumFractionDigits: 2
    }).format(number);
}


function escapeDisplay(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(value).trim();
}


function getFirstName(fullName) {

    const cleanName =
        escapeDisplay(fullName);

    if (!cleanName) {
        return "";
    }

    return cleanName.split(/\s+/)[0];
}


function getLastName(fullName) {

    const cleanName =
        escapeDisplay(fullName);

    if (!cleanName) {
        return "";
    }

    const parts =
        cleanName.split(/\s+/);

    if (parts.length <= 1) {
        return "";
    }

    return parts.slice(1).join(" ");
}


function showMessage(message, type = "") {

    if (!elements.paymentMessage) {
        return;
    }

    elements.paymentMessage.textContent =
        message;

    elements.paymentMessage.className =
        "payment-message";

    if (type) {

        elements.paymentMessage.classList.add(
            type
        );
    }
}


/* =========================================================
   LOAD REQUEST
========================================================= */

function loadRequest() {

    const savedRequest =
        sessionStorage.getItem(
            "monarchaurex_request"
        );


    if (!savedRequest) {

        showMessage(
            "No active request was found. Please return to the request page.",
            "error"
        );

        if (elements.payButton) {

            elements.payButton.disabled =
                true;
        }

        return null;
    }


    let request;


    try {

        request =
            JSON.parse(savedRequest);

    } catch (error) {

        console.error(
            "Unable to read MonarchAurex request:",
            error
        );

        showMessage(
            "We could not read your request details. Please return to the request page.",
            "error"
        );

        if (elements.payButton) {

            elements.payButton.disabled =
                true;
        }

        return null;
    }


    return request;
}


/* =========================================================
   PREPARE PAYMENT DATA
========================================================= */

function preparePaymentData(request) {

    const packageName =
        escapeDisplay(request.package);


    const packagePrice =
        Number(
            request.packagePrice ??
            packagePrices[packageName] ??
            0
        );


    let amountDue =
        Number(request.amountDue);


    /*
        Request page stores remainingBalance.

        Older versions used "remaining", so both are supported.
    */

    let remaining =
        Number(
            request.remainingBalance ??
            request.remaining
        );


    /*
        Calculate amount if it was not saved correctly.
    */

    if (
        !Number.isFinite(amountDue) ||
        amountDue <= 0
    ) {

        if (
            request.paymentOption ===
                "35% Initial Payment" ||

            request.paymentOption ===
                "Initial Payment"
        ) {

            amountDue =
                packagePrice * 0.35;

        } else {

            amountDue =
                packagePrice;
        }
    }


    /*
        Calculate remaining balance if necessary.
    */

    if (
        !Number.isFinite(remaining) ||
        remaining < 0
    ) {

        remaining =
            Math.max(
                packagePrice - amountDue,
                0
            );
    }


    return {

        requestId:
            escapeDisplay(
                request.requestId
            ),

        name:
            escapeDisplay(
                request.name
            ),

        email:
            escapeDisplay(
                request.email
            ),

        package:
            packageName,

        packagePrice:
            Number(
                packagePrice.toFixed(2)
            ),

        paymentOption:
            escapeDisplay(
                request.paymentOption
            ),

        amountDue:
            Number(
                amountDue.toFixed(2)
            ),

        remaining:
            Number(
                remaining.toFixed(2)
            ),

        profilePhotoUrl:
            escapeDisplay(
                request.profilePhotoUrl
            )

    };
}


/* =========================================================
   DISPLAY REQUEST
========================================================= */

function displayRequest(data) {

    if (elements.requestId) {

        elements.requestId.textContent =
            data.requestId || "Pending";
    }


    if (elements.customerName) {

        elements.customerName.textContent =
            data.name || "Customer";
    }


    if (elements.customerEmail) {

        elements.customerEmail.textContent =
            data.email || "Not provided";
    }


    if (elements.packageName) {

        elements.packageName.textContent =
            data.package || "Selected Package";
    }


    if (elements.packagePrice) {

        elements.packagePrice.textContent =
            formatCurrency(
                data.packagePrice
            );
    }


    if (elements.summaryTotal) {

        elements.summaryTotal.textContent =
            formatCurrency(
                data.packagePrice
            );
    }


    if (elements.summaryPaymentOption) {

        elements.summaryPaymentOption.textContent =
            data.paymentOption ||
            "Full Payment";
    }


    if (elements.summaryAmountDue) {

        elements.summaryAmountDue.textContent =
            formatCurrency(
                data.amountDue
            );
    }


    if (elements.summaryRemaining) {

        elements.summaryRemaining.textContent =
            formatCurrency(
                data.remaining
            );
    }


    if (elements.paymentTotal) {

        elements.paymentTotal.textContent =
            formatCurrency(
                data.amountDue
            );
    }


    if (elements.remainingRow) {

        if (data.remaining <= 0) {

            elements.remainingRow.style.display =
                "none";

        } else {

            elements.remainingRow.style.display =
                "flex";
        }
    }


    const descriptions = {

        Graduate:
            "Professional digital identity website for graduates.",

        Professional:
            "Enhanced professional identity website with expanded presentation.",

        Executive:
            "Premium professional identity experience with executive-level presentation.",

        "Private Offer":
            "Custom MonarchAurex professional identity package."

    };


    if (elements.paymentDescription) {

        elements.paymentDescription.textContent =
            descriptions[data.package] ||
            "Professional digital identity website.";
    }
}


/* =========================================================
   PREPARE BASIC PAYFAST FORM DATA
========================================================= */

function prepareBasicFormData(data) {

    if (payfastFields.nameFirst) {

        payfastFields.nameFirst.value =
            getFirstName(data.name);
    }


    if (payfastFields.nameLast) {

        payfastFields.nameLast.value =
            getLastName(data.name);
    }


    if (payfastFields.email) {

        payfastFields.email.value =
            data.email;
    }


    if (payfastFields.paymentId) {

        payfastFields.paymentId.value =
            data.requestId;
    }


    if (payfastFields.amount) {

        payfastFields.amount.value =
            data.amountDue.toFixed(2);
    }


    if (payfastFields.itemName) {

        payfastFields.itemName.value =
            `MonarchAurex ${data.package} Package`;
    }


    if (payfastFields.itemDescription) {

        payfastFields.itemDescription.value =
            `${data.paymentOption} - ${data.package} package`;
    }


    if (payfastFields.customStr1) {

        payfastFields.customStr1.value =
            data.requestId;
    }


    if (payfastFields.customStr2) {

        payfastFields.customStr2.value =
            data.paymentOption;
    }
}


/* =========================================================
   CREATE PAYMENT THROUGH CLOUDFLARE WORKER
========================================================= */

async function createPayFastPayment(data) {

    const response =
        await fetch(
            `${PAYFAST_BACKEND_URL}/create-payment`,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({

                    requestId:
                        data.requestId,

                    name:
                        data.name,

                    email:
                        data.email,

                    packageName:
                        data.package,

                    packagePrice:
                        data.packagePrice,

                    paymentOption:
                        data.paymentOption

                })
            }
        );


    let result;


    try {

        result =
            await response.json();

    } catch (error) {

        throw new Error(
            "The payment server returned an invalid response."
        );
    }


    if (
        !response.ok ||
        !result.success
    ) {

        throw new Error(
            result.error ||
            "Unable to create the PayFast payment."
        );
    }


    if (
        !result.checkoutUrl ||
        !result.paymentData
    ) {

        throw new Error(
            "The payment server did not return complete PayFast checkout details."
        );
    }


    return result;
}


/* =========================================================
   POPULATE SECURE PAYFAST FORM
========================================================= */

function populatePayFastForm(paymentData) {

    /*
        The Worker creates the complete signed paymentData.

        We simply copy those values into the existing form.

        The passphrase is NEVER sent to this page.
    */

    Object.keys(paymentData).forEach(
        (key) => {

            let field =
                elements.payfastForm.querySelector(
                    `[name="${key}"]`
                );


            if (!field) {

                field =
                    document.createElement(
                        "input"
                    );

                field.type =
                    "hidden";

                field.name =
                    key;

                elements.payfastForm.appendChild(
                    field
                );
            }


            field.value =
                paymentData[key] ?? "";
        }
    );
}


/* =========================================================
   HANDLE PAYMENT SUBMISSION
========================================================= */

async function handlePaymentSubmit(event) {

    event.preventDefault();


    if (
        !elements.payButton ||
        !elements.payfastForm
    ) {

        return;
    }


    const request =
        loadRequest();


    if (!request) {

        return;
    }


    const data =
        preparePaymentData(request);


    /*
        Prevent accidental private-offer payments.
    */

    if (
        data.package ===
        "Private Offer"
    ) {

        showMessage(
            "Private Offers do not use this payment page. Your offer must be approved first.",
            "error"
        );

        return;
    }


    /*
        Disable the button while the Worker creates
        the secure PayFast checkout.
    */

    elements.payButton.disabled =
        true;


    const buttonText =
        elements.payButton.querySelector(
            "span:first-child"
        );


    if (buttonText) {

        buttonText.textContent =
            "Connecting...";
    }


    showMessage(
        "Connecting securely to PayFast..."
    );


    try {

        /*
            Ask the Cloudflare Worker to create
            the signed PayFast payment.
        */

        const result =
            await createPayFastPayment(
                data
            );


        /*
            Populate the existing PayFast form
            using the server-generated payment data.
        */

        populatePayFastForm(
            result.paymentData
        );


        /*
            The Worker decides whether this is
            sandbox or live PayFast.
        */

        elements.payfastForm.action =
            result.checkoutUrl;


        if (buttonText) {

            buttonText.textContent =
                "Redirecting...";
        }


        showMessage(
            "Redirecting you to PayFast..."
        );


        /*
            Give the browser a moment to update
            the button/message before submission.
        */

        setTimeout(
            () => {

                elements.payfastForm.submit();

            },
            150
        );

    } catch (error) {

        console.error(
            "PayFast checkout error:",
            error
        );


        showMessage(
            error.message ||
            "We could not connect to PayFast. Please try again.",
            "error"
        );


        elements.payButton.disabled =
            false;


        if (buttonText) {

            buttonText.textContent =
                "Continue to PayFast";
        }
    }
}


/* =========================================================
   INITIALISE
========================================================= */

function initialisePaymentPage() {

    document.body.classList.add(
        "loading"
    );


    if (elements.currentYear) {

        elements.currentYear.textContent =
            new Date().getFullYear();
    }


    const request =
        loadRequest();


    if (!request) {

        document.body.classList.remove(
            "loading"
        );

        return;
    }


    const data =
        preparePaymentData(
            request
        );


    displayRequest(data);


    prepareBasicFormData(
        data
    );


    /*
        The form is NOT pointed directly at PayFast yet.

        The submit handler first contacts the secure
        Cloudflare Worker, receives the signed payment
        data, then submits the form to PayFast.
    */

    if (elements.payfastForm) {

        elements.payfastForm.addEventListener(
            "submit",
            handlePaymentSubmit
        );
    }


    document.body.classList.remove(
        "loading"
    );
}


/* =========================================================
   START
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    initialisePaymentPage
);
