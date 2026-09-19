/* =========================================================
   MONARCHAUREX PAYMENT PAGE
========================================================= */

"use strict";


/* =========================================================
   PAYFAST CONFIGURATION
========================================================= */

/*
    IMPORTANT:

    Do NOT put your PayFast passphrase here.

    The passphrase/signature should eventually be handled
    by a secure backend/serverless function.

    Merchant ID and Merchant Key are left as placeholders
    until the final PayFast integration is connected.
*/

const PAYFAST_CONFIG = {

    // Change this to true when testing with PayFast Sandbox.
    sandbox: true,

    // Your PayFast Merchant ID will go here later.
    merchantId: "",

    // Your PayFast Merchant Key will go here later.
    merchantKey: "",

    /*
        These URLs will eventually point to the secure backend
        / payment confirmation system.
    */

    returnUrl:
        "https://thabangmakgai265-commits.github.io/monarchtech-website/confirmation/",

    cancelUrl:
        "https://thabangmakgai265-commits.github.io/monarchtech-website/request/",

    /*
        DO NOT use a GitHub Pages URL as the final ITN endpoint.

        PayFast must POST the payment notification to a backend
        endpoint that can validate the ITN.

        This is intentionally blank until we create that backend.
    */
    notifyUrl: ""
};


/* =========================================================
   PAYFAST ENDPOINT
========================================================= */

const PAYFAST_URL = PAYFAST_CONFIG.sandbox
    ? "https://sandbox.payfast.co.za/eng/process"
    : "https://www.payfast.co.za/eng/process";


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

    if (value === null || value === undefined) {
        return "";
    }

    return String(value).trim();
}


function getFirstName(fullName) {

    const cleanName = escapeDisplay(fullName);

    if (!cleanName) {
        return "";
    }

    return cleanName.split(/\s+/)[0];
}


function getLastName(fullName) {

    const cleanName = escapeDisplay(fullName);

    if (!cleanName) {
        return "";
    }

    const parts = cleanName.split(/\s+/);

    if (parts.length <= 1) {
        return "";
    }

    return parts.slice(1).join(" ");
}


function showMessage(message, type = "") {

    elements.paymentMessage.textContent = message;

    elements.paymentMessage.className =
        "payment-message";

    if (type) {
        elements.paymentMessage.classList.add(type);
    }
}


/* =========================================================
   LOAD REQUEST
========================================================= */

function loadRequest() {

    const savedRequest =
        sessionStorage.getItem("monarchaurex_request");

    if (!savedRequest) {

        showMessage(
            "No active request was found. Please return to the request page.",
            "error"
        );

        if (elements.payButton) {
            elements.payButton.disabled = true;
        }

        return null;
    }


    let request;

    try {

        request = JSON.parse(savedRequest);

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
            elements.payButton.disabled = true;
        }

        return null;
    }


    return request;
}


/* =========================================================
   NORMALISE PAYMENT DATA
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

    let remaining =
        Number(request.remaining);

    /*
        If amountDue wasn't saved correctly, calculate it from
        the selected payment option.

        Current request page:
        - Full Payment = 100%
        - Initial Payment = 35%
    */

    if (!Number.isFinite(amountDue) || amountDue <= 0) {

        if (
            request.paymentOption === "35% Initial Payment" ||
            request.paymentOption === "Initial Payment"
        ) {

            amountDue =
                packagePrice * 0.35;

        } else {

            amountDue =
                packagePrice;
        }
    }


    if (!Number.isFinite(remaining) || remaining < 0) {

        remaining =
            Math.max(
                packagePrice - amountDue,
                0
            );
    }


    return {

        requestId:
            escapeDisplay(request.requestId),

        name:
            escapeDisplay(request.name),

        email:
            escapeDisplay(request.email),

        package:
            packageName,

        packagePrice:
            packagePrice,

        paymentOption:
            escapeDisplay(request.paymentOption),

        amountDue:
            Number(amountDue.toFixed(2)),

        remaining:
            Number(remaining.toFixed(2)),

        profilePhotoUrl:
            escapeDisplay(request.profilePhotoUrl)

    };
}


/* =========================================================
   DISPLAY REQUEST
========================================================= */

function displayRequest(data) {

    elements.requestId.textContent =
        data.requestId || "Pending";

    elements.customerName.textContent =
        data.name || "Customer";

    elements.customerEmail.textContent =
        data.email || "Not provided";

    elements.packageName.textContent =
        data.package || "Selected Package";

    elements.packagePrice.textContent =
        formatCurrency(data.packagePrice);

    elements.summaryTotal.textContent =
        formatCurrency(data.packagePrice);

    elements.summaryPaymentOption.textContent =
        data.paymentOption || "Full Payment";

    elements.summaryAmountDue.textContent =
        formatCurrency(data.amountDue);

    elements.summaryRemaining.textContent =
        formatCurrency(data.remaining);

    elements.paymentTotal.textContent =
        formatCurrency(data.amountDue);


    if (data.remaining <= 0) {

        elements.remainingRow.style.display =
            "none";

    } else {

        elements.remainingRow.style.display =
            "flex";
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


    elements.paymentDescription.textContent =
        descriptions[data.package] ||
        "Professional digital identity website.";
}


/* =========================================================
   BUILD PAYMENT ID
========================================================= */

function createPaymentId(requestId) {

    const base =
        requestId ||
        `MAX-${Date.now()}`;

    return `${base}-PAY`;
}


/* =========================================================
   PREPARE PAYFAST FORM
========================================================= */

function preparePayFastForm(data) {

    /*
        These values are intentionally prepared here.

        The final secure implementation will generate the
        PayFast signature server-side.
    */

    payfastFields.merchantId.value =
        PAYFAST_CONFIG.merchantId;

    payfastFields.merchantKey.value =
        PAYFAST_CONFIG.merchantKey;

    payfastFields.returnUrl.value =
        PAYFAST_CONFIG.returnUrl;

    payfastFields.cancelUrl.value =
        PAYFAST_CONFIG.cancelUrl;

    payfastFields.notifyUrl.value =
        PAYFAST_CONFIG.notifyUrl;

    payfastFields.nameFirst.value =
        getFirstName(data.name);

    payfastFields.nameLast.value =
        getLastName(data.name);

    payfastFields.email.value =
        data.email;

    payfastFields.paymentId.value =
        createPaymentId(data.requestId);

    payfastFields.amount.value =
        data.amountDue.toFixed(2);

    payfastFields.itemName.value =
        `MonarchAurex ${data.package}`;

    payfastFields.itemDescription.value =
        `${data.package} professional identity website`;

    payfastFields.customStr1.value =
        data.requestId;

    payfastFields.customStr2.value =
        data.paymentOption;

    /*
        Signature intentionally remains blank.

        We will populate this through the secure backend
        once the backend is created.
    */

    payfastFields.signature.value =
        "";
}


/* =========================================================
   CHECK PAYMENT CONFIGURATION
========================================================= */

function isPaymentConfigured() {

    const merchantReady =
        Boolean(
            PAYFAST_CONFIG.merchantId &&
            PAYFAST_CONFIG.merchantKey
        );

    const notifyReady =
        Boolean(
            PAYFAST_CONFIG.notifyUrl
        );

    const signatureReady =
        Boolean(
            payfastFields.signature.value
        );


    return {

        merchantReady,

        notifyReady,

        signatureReady,

        ready:
            merchantReady &&
            notifyReady &&
            signatureReady

    };
}


/* =========================================================
   PREVENT LIVE SUBMISSION UNTIL BACKEND IS READY
========================================================= */

function handlePaymentSubmit(event) {

    const configuration =
        isPaymentConfigured();


    /*
        For now, prevent the browser from submitting a form
        that doesn't have the secure signature and ITN endpoint.
    */

    if (!configuration.ready) {

        event.preventDefault();

        showMessage(
            "PayFast checkout is being connected securely. The payment page is ready, but final payment verification still needs to be connected.",
            "error"
        );

        console.info(
            "PayFast configuration status:",
            configuration
        );

        return;
    }


    /*
        When the backend is ready, this form will submit
        directly to the PayFast hosted payment page.
    */

    elements.payButton.disabled = true;

    elements.payButton.querySelector("span:first-child")
        .textContent = "Redirecting...";
}


/* =========================================================
   INITIALISE
========================================================= */

function initialisePaymentPage() {

    document.body.classList.add("loading");


    if (elements.currentYear) {

        elements.currentYear.textContent =
            new Date().getFullYear();
    }


    const request =
        loadRequest();


    if (!request) {

        document.body.classList.remove("loading");

        return;
    }


    const data =
        preparePaymentData(request);


    displayRequest(data);

    preparePayFastForm(data);


    /*
        Keep the page ready for the eventual backend.

        We deliberately do not expose the passphrase or create
        a fake client-side signature.
    */

    elements.payfastForm.action =
        PAYFAST_URL;


    elements.payfastForm.addEventListener(
        "submit",
        handlePaymentSubmit
    );


    document.body.classList.remove("loading");
}


/* =========================================================
   START
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    initialisePaymentPage
);
