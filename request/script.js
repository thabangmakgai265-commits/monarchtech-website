/* =========================================================
   MONARCHAUREX — REQUEST PAGE SCRIPT

   Handles:
   - Request ID generation
   - Package pricing
   - Payment calculations
   - Private Offer selection
   - Referral customer codes
   - Profile photo preview
   - Cloudinary upload
   - Form validation
   - Formspree submission
   - Request data storage
   - Normal package → Payment page
   - Private Offer → Pending Review
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    "use strict";


    /* =========================================================
       CONFIGURATION
    ========================================================= */

const CLOUDINARY_CLOUD_NAME =
    "ebfxr5ms";

const CLOUDINARY_UPLOAD_PRESET =
    "monarch_profile_photos";

    const CLOUDINARY_UPLOAD_URL =
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

    const PAYMENT_PAGE_URL =
        "../payment/";

    const packagePrices = {

        Graduate: 899,

        Professional: 1999,

        Executive: 2599

    };

    const MAX_PHOTO_SIZE =
        5 * 1024 * 1024;

    const allowedPhotoTypes = new Set([
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
        "image/heic",
        "image/heif",
        "image/heic-sequence",
        "image/heif-sequence"
    ]);

    const allowedPhotoExtensions = new Set([
        "jpg",
        "jpeg",
        "png",
        "webp",
        "heic",
        "heif"
    ]);

    const PHOTO_UPLOAD_TIMEOUT_MS = 120000;


    /* =========================================================
       ELEMENTS
    ========================================================= */

    const form =
        document.getElementById(
            "portfolio-request-form"
        );


    const requestIdInput =
        document.getElementById(
            "request-id"
        );


    const requestStatusInput =
        document.getElementById(
            "request-status"
        );


    const packageSelect =
        document.getElementById(
            "package"
        );


    const packageTotalInput =
        document.getElementById(
            "package-total"
        );


    const privateOfferSection =
        document.getElementById(
            "private-offer-section"
        );


    const privateOfferSelect =
        document.getElementById(
            "private-offer"
        );


    const privateOfferStatus =
        document.getElementById(
            "private-offer-status"
        );


    const referralSection =
        document.getElementById(
            "referral-section"
        );


    const referralCode1 =
        document.getElementById(
            "referral-code-1"
        );


    const referralCode2 =
        document.getElementById(
            "referral-code-2"
        );


    const paymentOptionSection =
        document.getElementById(
            "payment-option-section"
        );


    const paymentSectionDivider =
        document.getElementById(
            "payment-section-divider"
        );


    const paymentOption =
        document.getElementById(
            "payment-option"
        );


    const amountDueInput =
        document.getElementById(
            "amount-due"
        );


    const remainingBalanceInput =
        document.getElementById(
            "remaining-balance"
        );


    const profilePhotoInput =
        document.getElementById(
            "profile-photo"
        );


    const profilePhotoUrlInput =
        document.getElementById(
            "profile-photo-url"
        );


    const photoPreview =
        document.getElementById(
            "photo-preview"
        );


    const photoPreviewImage =
        document.getElementById(
            "photo-preview-image"
        );


    const photoStatus =
        document.getElementById(
            "photo-status"
        );

    const photoUploadProgress =
        document.getElementById(
            "photo-upload-progress"
        );


    const submitButton =
        document.getElementById(
            "request-submit"
        );


    const submitText =
        submitButton?.querySelector(
            ".submit-text"
        );


    const feedback =
        document.getElementById(
            "form-feedback"
        );


    const summaryPackage =
        document.getElementById(
            "summary-package"
        );


    const summaryPrice =
        document.getElementById(
            "summary-total"
        );


    const summaryAmountDue =
        document.getElementById(
            "summary-due"
        );


    const summaryRemaining =
        document.getElementById(
            "summary-balance"
        );


    const paymentSummary =
        document.getElementById(
            "payment-summary"
        );


    const remainingSummaryRow =
        document.getElementById(
            "remaining-summary-row"
        );

    let previewObjectUrl = "";
    let uploadedPhotoFile = null;
    let uploadedPhotoUrl = "";
    let isSubmitting = false;


    /* =========================================================
       SAFETY CHECK
    ========================================================= */

    if (!form) {

        console.warn(
            "MonarchAurex Request Script: Request form not found."
        );

        return;
    }


    /* =========================================================
       CURRENCY
    ========================================================= */

    function formatCurrency(amount) {

        if (
            amount === null ||
            amount === undefined ||
            amount === ""
        ) {

            return "—";
        }


        const number =
            Number(amount);


        if (Number.isNaN(number)) {

            return "—";
        }


        return `R${number.toLocaleString("en-ZA", {

            minimumFractionDigits: 2,

            maximumFractionDigits: 2

        })}`;
    }


    /* =========================================================
       REQUEST ID
    ========================================================= */

    function generateRequestId() {

        const year =
            new Date().getFullYear();


        const timestampPart =
            String(Date.now()).slice(-6);


        const randomPart =
            Math.floor(
                100 +
                Math.random() * 900
            );


        return `MAX-${year}-${timestampPart}${randomPart}`;
    }


    /* =========================================================
       CREATE REQUEST ID
    ========================================================= */

    if (
        requestIdInput &&
        !requestIdInput.value
    ) {

        requestIdInput.value =
            generateRequestId();
    }


    /* =========================================================
       PACKAGE PRICE
    ========================================================= */

    function getPackagePrice() {

        if (!packageSelect) {

            return null;
        }


        const selectedPackage =
            packageSelect.value;


        if (!selectedPackage) {

            return null;
        }


        return (
            packagePrices[selectedPackage] ??
            null
        );
    }


    /* =========================================================
       PRIVATE OFFER UI
    ========================================================= */

    function resetPrivateOfferFields() {

        if (privateOfferSelect) {

            privateOfferSelect.value = "";
        }


        if (privateOfferStatus) {

            privateOfferStatus.value = "";
        }


        if (referralCode1) {

            referralCode1.value = "";

            referralCode1.required = false;
        }


        if (referralCode2) {

            referralCode2.value = "";

            referralCode2.required = false;
        }


        if (privateOfferSection) {

            privateOfferSection.hidden = true;
        }


        if (referralSection) {

            referralSection.hidden = true;
        }
    }


    function showPrivateOfferSection() {

        if (privateOfferSection) {

            privateOfferSection.hidden = false;
        }
    }


    function showReferralSection() {

        if (referralSection) {

            referralSection.hidden = false;
        }


        if (referralCode1) {

            referralCode1.required = true;
        }


        if (referralCode2) {

            referralCode2.required = true;
        }
    }


    function hideReferralSection() {

        if (referralSection) {

            referralSection.hidden = true;
        }


        if (referralCode1) {

            referralCode1.required = false;

            referralCode1.value = "";
        }


        if (referralCode2) {

            referralCode2.required = false;

            referralCode2.value = "";
        }
    }


    /* =========================================================
       PAYMENT UI
    ========================================================= */

    function showNormalPaymentOptions() {

        if (paymentSectionDivider) {

            paymentSectionDivider.hidden = false;
        }


        if (paymentOptionSection) {

            paymentOptionSection.hidden = false;
        }


        if (paymentOption) {

            paymentOption.disabled = false;

            paymentOption.required = true;
        }
    }


    function hideNormalPaymentOptions() {

        if (paymentSectionDivider) {

            paymentSectionDivider.hidden = true;
        }


        if (paymentOptionSection) {

            paymentOptionSection.hidden = true;
        }


        if (paymentOption) {

            paymentOption.value = "";

            paymentOption.disabled = true;

            paymentOption.required = false;
        }
    }


    /* =========================================================
       SUBMIT BUTTON
    ========================================================= */

    function setSubmitButtonForNormalPackage() {

        if (submitText) {

            submitText.textContent =
                "Continue to Payment";
        }

        else if (submitButton) {

            submitButton.textContent =
                "Continue to Payment";
        }
    }


    function setSubmitButtonForPrivateOffer() {

        if (submitText) {

            submitText.textContent =
                "Request Private Offer";
        }

        else if (submitButton) {

            submitButton.textContent =
                "Request Private Offer";
        }
    }


    /* =========================================================
       PAYMENT CALCULATION
    ========================================================= */

    function updatePaymentSummary() {

        const selectedPackage =
            packageSelect?.value || "";


        const price =
            getPackagePrice();


        /* -----------------------------------------
           No package selected
        ----------------------------------------- */

        if (!selectedPackage) {

            if (packageTotalInput) {

                packageTotalInput.value = "";
            }


            if (amountDueInput) {

                amountDueInput.value = "";
            }


            if (remainingBalanceInput) {

                remainingBalanceInput.value = "";
            }


            if (summaryPackage) {

                summaryPackage.textContent = "—";
            }


            if (summaryPrice) {

                summaryPrice.textContent = "—";
            }


            if (summaryAmountDue) {

                summaryAmountDue.textContent = "—";
            }


            if (summaryRemaining) {

                summaryRemaining.textContent = "—";
            }


            if (paymentSummary) {

                paymentSummary.hidden = true;
            }


            showNormalPaymentOptions();

            resetPrivateOfferFields();

            setSubmitButtonForNormalPackage();

            return;
        }


        /* =================================================
           PRIVATE OFFER
        ================================================= */

        if (
            selectedPackage ===
            "Private Offer"
        ) {

            showPrivateOfferSection();

            hideNormalPaymentOptions();

            setSubmitButtonForPrivateOffer();


            if (packageTotalInput) {

                packageTotalInput.value =
                    "Private Offer";
            }


            if (amountDueInput) {

                amountDueInput.value = "";
            }


            if (remainingBalanceInput) {

                remainingBalanceInput.value = "";
            }


            if (summaryPackage) {

                summaryPackage.textContent =
                    privateOfferSelect?.value ||
                    "Private Offer";
            }


            if (summaryPrice) {

                summaryPrice.textContent =
                    "To be confirmed";
            }


            if (summaryAmountDue) {

                summaryAmountDue.textContent =
                    "To be confirmed";
            }


            if (summaryRemaining) {

                summaryRemaining.textContent =
                    "To be confirmed";
            }


            if (paymentSummary) {

                paymentSummary.hidden = false;
            }


            if (remainingSummaryRow) {

                remainingSummaryRow.hidden = false;
            }


            if (privateOfferStatus) {

                privateOfferStatus.value =
                    "Pending Review";
            }


            return;
        }


        /* =================================================
           STANDARD PACKAGE
        ================================================= */

        showNormalPaymentOptions();

        setSubmitButtonForNormalPackage();


        if (privateOfferSection) {

            privateOfferSection.hidden = true;
        }


        hideReferralSection();


        if (privateOfferSelect) {

            privateOfferSelect.value = "";
        }


        if (privateOfferStatus) {

            privateOfferStatus.value = "";
        }


        if (price === null) {

            return;
        }


        let amountDue =
            price;


        let remainingBalance =
            0;


        /* -----------------------------------------
           35% Initial Payment
        ----------------------------------------- */

        if (
            paymentOption &&
            paymentOption.value ===
                "35% Initial Payment"
        ) {

            amountDue =
                Math.round(
                    price *
                    0.35 *
                    100
                ) / 100;


            remainingBalance =
                Math.round(
                    (
                        price -
                        amountDue
                    ) *
                    100
                ) / 100;
        }


        /* -----------------------------------------
           Full Payment
        ----------------------------------------- */

        if (
            paymentOption &&
            paymentOption.value ===
                "Full Payment"
        ) {

            amountDue =
                price;


            remainingBalance =
                0;
        }


        /* -----------------------------------------
           Hidden Values
        ----------------------------------------- */

        if (packageTotalInput) {

            packageTotalInput.value =
                formatCurrency(price);
        }


        if (amountDueInput) {

            amountDueInput.value =
                formatCurrency(amountDue);
        }


        if (remainingBalanceInput) {

            remainingBalanceInput.value =
                formatCurrency(
                    remainingBalance
                );
        }


        /* -----------------------------------------
           Visible Summary
        ----------------------------------------- */

        if (summaryPackage) {

            summaryPackage.textContent =
                selectedPackage;
        }


        if (summaryPrice) {

            summaryPrice.textContent =
                formatCurrency(price);
        }


        if (summaryAmountDue) {

            summaryAmountDue.textContent =
                formatCurrency(amountDue);
        }


        if (summaryRemaining) {

            summaryRemaining.textContent =
                formatCurrency(
                    remainingBalance
                );
        }


        if (paymentSummary) {

            paymentSummary.hidden = false;
        }


        if (remainingSummaryRow) {

            remainingSummaryRow.hidden =
                remainingBalance <= 0;
        }
    }


    /* =========================================================
       PRIVATE OFFER CHANGE
    ========================================================= */

    if (privateOfferSelect) {

        privateOfferSelect.addEventListener(
            "change",
            () => {

                const selectedOffer =
                    privateOfferSelect.value;


                if (privateOfferStatus) {

                    privateOfferStatus.value =
                        "Pending Review";
                }


                /* -----------------------------------------
                   Referral Privilege
                ----------------------------------------- */

                if (
                    selectedOffer ===
                    "Referral Privilege"
                ) {

                    showReferralSection();
                }


                /* -----------------------------------------
                   Other Private Offers
                ----------------------------------------- */

                else {

                    hideReferralSection();
                }


                updatePaymentSummary();
            }
        );
    }


    /* =========================================================
       PACKAGE CHANGE
    ========================================================= */

    if (packageSelect) {

        packageSelect.addEventListener(
            "change",
            () => {

                const selectedPackage =
                    packageSelect.value;


                /* -----------------------------------------
                   Private Offer
                ----------------------------------------- */

                if (
                    selectedPackage ===
                    "Private Offer"
                ) {

                    showPrivateOfferSection();

                    hideNormalPaymentOptions();

                    setSubmitButtonForPrivateOffer();

                    updatePaymentSummary();

                    return;
                }


                /* -----------------------------------------
                   Normal Package
                ----------------------------------------- */

                resetPrivateOfferFields();

                showNormalPaymentOptions();

                setSubmitButtonForNormalPackage();

                updatePaymentSummary();
            }
        );
    }


    /* =========================================================
       PAYMENT OPTION CHANGE
    ========================================================= */

    if (paymentOption) {

        paymentOption.addEventListener(
            "change",
            updatePaymentSummary
        );
    }


    /* =========================================================
       PHOTO PREVIEW
    ========================================================= */

    function validateProfilePhoto(file) {
        if (!file) {
            throw new Error("Please upload your profile photo.");
        }

        const fileType = (file.type || "").toLowerCase();
        const fileExtension =
            file.name.split(".").pop()?.toLowerCase() || "";
        const hasSupportedType =
            allowedPhotoTypes.has(fileType);
        const hasSupportedExtension =
            allowedPhotoExtensions.has(fileExtension);
        const hasGenericType =
            !fileType || fileType === "application/octet-stream";

        if (
            !hasSupportedType &&
            !(hasGenericType && hasSupportedExtension)
        ) {
            throw new Error(
                "Choose a JPG, PNG, WebP, HEIC or HEIF profile photo."
            );
        }

        if (file.size > MAX_PHOTO_SIZE) {
            throw new Error(
                "Your profile photo must be 5MB or smaller. Please choose a smaller image."
            );
        }
    }

    function clearPhotoPreview() {
        if (previewObjectUrl) {
            URL.revokeObjectURL(previewObjectUrl);
            previewObjectUrl = "";
        }

        if (photoPreviewImage) {
            photoPreviewImage.removeAttribute("src");
        }

        if (photoPreview) {
            photoPreview.hidden = true;
        }
    }

    if (profilePhotoInput) {
        profilePhotoInput.addEventListener(
            "change",
            () => {
                const file =
                    profilePhotoInput.files?.[0];

                clearPhotoPreview();
                uploadedPhotoFile = null;
                uploadedPhotoUrl = "";

                if (!file) {
                    if (photoStatus) {
                        photoStatus.textContent = "";
                        photoStatus.className = "photo-status";
                    }

                    if (profilePhotoUrlInput) {
                        profilePhotoUrlInput.value = "";
                    }

                    if (photoUploadProgress) {
                        photoUploadProgress.hidden = true;
                        photoUploadProgress.value = 0;
                    }

                    return;
                }

                try {
                    validateProfilePhoto(file);
                } catch (error) {
                    profilePhotoInput.value = "";

                    if (photoStatus) {
                        photoStatus.textContent = error.message;
                        photoStatus.className = "photo-status error";
                    }

                    if (profilePhotoUrlInput) {
                        profilePhotoUrlInput.value = "";
                    }

                    return;
                }

                const fileExtension =
                    file.name.split(".").pop()?.toLowerCase() || "";
                const isHeif =
                    file.type === "image/heic" ||
                    file.type === "image/heif" ||
                    fileExtension === "heic" ||
                    fileExtension === "heif";

                if (!isHeif && photoPreviewImage && photoPreview) {
                    previewObjectUrl = URL.createObjectURL(file);
                    photoPreviewImage.src = previewObjectUrl;
                    photoPreview.hidden = false;
                }

                if (photoStatus) {
                    photoStatus.textContent = isHeif
                        ? "Photo selected. Preview is unavailable in this browser; the original photo will be uploaded."
                        : "Photo selected. It will be uploaded securely when you submit your request.";
                    photoStatus.className = "photo-status";
                }

                if (profilePhotoUrlInput) {
                    profilePhotoUrlInput.value = "";
                }

                if (photoUploadProgress) {
                    photoUploadProgress.hidden = true;
                    photoUploadProgress.value = 0;
                }
            }
        );
    }


    /* =========================================================
       CLOUDINARY UPLOAD
    ========================================================= */

    async function uploadProfilePhoto(file) {
        validateProfilePhoto(file);

        if (
            uploadedPhotoFile === file &&
            uploadedPhotoUrl
        ) {
            return uploadedPhotoUrl;
        }

        if (photoStatus) {
            photoStatus.textContent = "Uploading profile photo… 0%";
            photoStatus.className = "photo-status uploading";
        }

        if (photoUploadProgress) {
            photoUploadProgress.value = 0;
            photoUploadProgress.hidden = false;
        }

        const cloudinaryData = new FormData();
        cloudinaryData.append("file", file);
        cloudinaryData.append(
            "upload_preset",
            CLOUDINARY_UPLOAD_PRESET
        );

        const securePhotoUrl = await new Promise(
            (resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open("POST", CLOUDINARY_UPLOAD_URL);
                xhr.timeout = PHOTO_UPLOAD_TIMEOUT_MS;

                xhr.upload.addEventListener(
                    "progress",
                    event => {
                        if (!event.lengthComputable) {
                            if (photoStatus) {
                                photoStatus.textContent =
                                    "Uploading profile photo…";
                            }

                            return;
                        }

                        const percent = Math.min(
                            100,
                            Math.round(
                                (event.loaded / event.total) * 100
                            )
                        );

                        if (photoUploadProgress) {
                            photoUploadProgress.value = percent;
                        }

                        if (photoStatus) {
                            photoStatus.textContent =
                                percent < 100
                                    ? `Uploading profile photo… ${percent}%`
                                    : "Photo uploaded. Cloudinary is processing it…";
                        }
                    }
                );

                xhr.addEventListener("load", () => {
                    let data;

                    try {
                        data = JSON.parse(xhr.responseText || "{}");
                    } catch (error) {
                        reject(
                            new Error(
                                "Cloudinary returned an unreadable upload response."
                            )
                        );
                        return;
                    }

                    if (xhr.status < 200 || xhr.status >= 300) {
                        reject(
                            new Error(
                                data?.error?.message ||
                                `Cloudinary could not upload the photo (HTTP ${xhr.status}).`
                            )
                        );
                        return;
                    }

                    if (typeof data.secure_url !== "string") {
                        reject(
                            new Error(
                                "Cloudinary did not return a secure photo URL."
                            )
                        );
                        return;
                    }

                    let returnedUrl;

                    try {
                        returnedUrl = new URL(data.secure_url);
                    } catch (error) {
                        reject(
                            new Error(
                                "Cloudinary returned an invalid photo URL."
                            )
                        );
                        return;
                    }

                    if (
                        returnedUrl.protocol !== "https:" ||
                        !returnedUrl.hostname.endsWith(".cloudinary.com")
                    ) {
                        reject(
                            new Error(
                                "Cloudinary did not return a trusted HTTPS photo URL."
                            )
                        );
                        return;
                    }

                    resolve(returnedUrl.href);
                });

                xhr.addEventListener("error", () => {
                    reject(
                        new Error(
                            "Could not connect to Cloudinary. Check your connection and try uploading the photo again. Your request has not been submitted."
                        )
                    );
                });

                xhr.addEventListener("timeout", () => {
                    reject(
                        new Error(
                            "The photo upload timed out. Check your connection and retry; your request has not been submitted."
                        )
                    );
                });

                xhr.addEventListener("abort", () => {
                    reject(
                        new Error(
                            "The photo upload was cancelled. Your request has not been submitted."
                        )
                    );
                });

                xhr.send(cloudinaryData);
            }
        );

        uploadedPhotoFile = file;
        uploadedPhotoUrl = securePhotoUrl;

        if (profilePhotoUrlInput) {
            profilePhotoUrlInput.value = securePhotoUrl;
        }

        if (photoUploadProgress) {
            photoUploadProgress.value = 100;
            photoUploadProgress.hidden = false;
        }

        if (photoStatus) {
            photoStatus.textContent =
                "Profile photo uploaded successfully.";
            photoStatus.className = "photo-status success";
        }

        return securePhotoUrl;
    }


    /* =========================================================
       FEEDBACK
    ========================================================= */

    function showFeedback(
        message,
        type = "success"
    ) {

        if (!feedback) {

            return;
        }


        feedback.textContent =
            message;


        feedback.className =
            `form-feedback ${type}`;


        feedback.hidden =
            false;
    }


    /* =========================================================
       CLEAR FEEDBACK
    ========================================================= */

    function clearFeedback() {

        if (!feedback) {

            return;
        }


        feedback.textContent =
            "";


        feedback.className =
            "form-feedback";


        feedback.hidden =
            true;
    }


    /* =========================================================
       STORE REQUEST DATA
    ========================================================= */

    function storeRequestData() {

        const selectedPackage =
            packageSelect?.value || "";


        const selectedPrivateOffer =
            privateOfferSelect?.value || "";


        const price =
            getPackagePrice();


        const isPrivateOffer =
            selectedPackage ===
            "Private Offer";


        const storedData = {

            requestId:
                requestIdInput?.value || "",


            name:
                document.getElementById(
                    "name"
                )?.value.trim() || "",


            email:
                document.getElementById(
                    "email"
                )?.value.trim() || "",


            field:
                document.getElementById(
                    "field"
                )?.value.trim() || "",


            package:
                selectedPackage,


            packageTotal:
                packageTotalInput?.value || "",


            paymentOption:
                isPrivateOffer
                    ? ""
                    : (
                        paymentOption?.value ||
                        ""
                    ),


            amountDue:
                isPrivateOffer
                    ? ""
                    : (
                        amountDueInput?.value ||
                        ""
                    ),


            remainingBalance:
                isPrivateOffer
                    ? ""
                    : (
                        remainingBalanceInput?.value ||
                        ""
                    ),


            profilePhotoUrl:
                profilePhotoUrlInput?.value ||
                "",


            privateOffer:
                selectedPrivateOffer,


            referralCode1:
                referralCode1?.value.trim() ||
                "",


            referralCode2:
                referralCode2?.value.trim() ||
                "",


            privateOfferStatus:
                isPrivateOffer
                    ? "Pending Review"
                    : "",


            status:
                isPrivateOffer
                    ? "Pending Review"
                    : "Pending Payment",


            packagePrice:
                price,


            createdAt:
                new Date().toISOString()
        };


        if (!isPrivateOffer) {
            try {
                sessionStorage.setItem(
                    "monarchaurex_request",
                    JSON.stringify(storedData)
                );
            } catch (error) {
                console.error(
                    "Unable to save the payment handoff:",
                    error
                );

                throw new Error(
                    "Your request could not be prepared for payment because this browser blocked session storage. Enable browser storage and try again. Your request has not been submitted."
                );
            }
        }

        return storedData;
    }

    function verifyPaymentHandoffStorage() {
        const testKey = "monarchaurex_storage_check";

        try {
            sessionStorage.setItem(testKey, "available");
            sessionStorage.removeItem(testKey);
        } catch (error) {
            console.error(
                "Payment handoff storage is unavailable:",
                error
            );

            throw new Error(
                "This browser is blocking the temporary storage needed to continue to payment. Enable browser storage and try again. Your request has not been submitted."
            );
        }
    }


    /* =========================================================
       FORM SUBMISSION
    ========================================================= */

    form.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();

            if (isSubmitting || submitButton?.disabled) {
                return;
            }

            clearFeedback();


            /* -----------------------------------------
               Browser Validation
            ----------------------------------------- */

            if (
                !form.checkValidity()
            ) {

                form.reportValidity();

                return;
            }

            isSubmitting = true;

            /* -----------------------------------------
               Prevent Duplicate Submission
            ----------------------------------------- */

            if (submitButton) {

                submitButton.disabled =
                    true;

                submitButton.dataset.originalText =
                    submitText?.textContent ||
                    "Continue to Payment";

                if (submitText) {

                    submitText.textContent =
                        "Preparing Your Request...";
                }

                else {

                    submitButton.textContent =
                        "Preparing Your Request...";
                }
            }


            let submissionStage = "request";

            try {

                /* -----------------------------------------
                   Package
                ----------------------------------------- */

                const selectedPackage =
                    packageSelect?.value || "";


                if (!selectedPackage) {

                    throw new Error(
                        "Please select a package."
                    );
                }


                const isPrivateOffer =
                    selectedPackage ===
                    "Private Offer";


                /* -----------------------------------------
                   Private Offer Validation
                ----------------------------------------- */

                if (isPrivateOffer) {

                    const selectedOffer =
                        privateOfferSelect?.value ||
                        "";


                    if (!selectedOffer) {

                        throw new Error(
                            "Please select a Private Offer."
                        );
                    }


                    /* -----------------------------------------
                       Referral Privilege
                    ----------------------------------------- */

                    if (
                        selectedOffer ===
                        "Referral Privilege"
                    ) {

                        if (
                            !referralCode1?.value.trim() ||
                            !referralCode2?.value.trim()
                        ) {

                            throw new Error(
                                "Please enter both referral customer codes."
                            );
                        }
                    }
                }


                /* -----------------------------------------
                   Normal Package Payment Option
                ----------------------------------------- */

                if (!isPrivateOffer) {

                    if (
                        !paymentOption ||
                        !paymentOption.value
                    ) {

                        throw new Error(
                            "Please select a payment option."
                        );
                    }
                }


                /* -----------------------------------------
                   Profile Photo
                ----------------------------------------- */

                const photoFile =
                    profilePhotoInput
                        ?.files?.[0];


                if (!photoFile) {

                    throw new Error(
                        "Please upload your profile photo."
                    );
                }

                validateProfilePhoto(photoFile);

                if (!isPrivateOffer) {
                    verifyPaymentHandoffStorage();
                }


                /* -----------------------------------------
                   Upload to Cloudinary
                ----------------------------------------- */

                if (submitText) {

                    submitText.textContent =
                        "Uploading Profile Photo...";
                }


                submissionStage = "photo";
                const profilePhotoUrl =
                    await uploadProfilePhoto(photoFile);


                if (!profilePhotoUrl) {

                    throw new Error(
                        "Profile photo upload did not return a valid URL."
                    );
                }


                /* -----------------------------------------
                   Recalculate Payment
                ----------------------------------------- */

                updatePaymentSummary();


                /* -----------------------------------------
                   Request ID
                ----------------------------------------- */

                if (
                    requestIdInput &&
                    !requestIdInput.value
                ) {

                    requestIdInput.value =
                        generateRequestId();
                }


                /* -----------------------------------------
                   Set Request Status
                ----------------------------------------- */

                if (requestStatusInput) {

                    requestStatusInput.value =
                        isPrivateOffer
                            ? "Pending Review"
                            : "Pending Payment";
                }


                if (privateOfferStatus) {

                    privateOfferStatus.value =
                        isPrivateOffer
                            ? "Pending Review"
                            : "";
                }


                /* -----------------------------------------
                   Store Request
                ----------------------------------------- */

                const storedRequest =
                    storeRequestData();


                /* -----------------------------------------
                   Prepare Formspree Submission
                ----------------------------------------- */

                if (submitText) {

                    submitText.textContent =
                        "Submitting Request...";
                }


                /*
                 * IMPORTANT:
                 *
                 * Do NOT send the actual profile
                 * photo file to Formspree.
                 *
                 * Cloudinary already stores the image.
                 */

                const formData =
                    new FormData(form);


                formData.delete(
                    "profile_photo"
                );


                formData.set(
                    "profile_photo_url",
                    profilePhotoUrl
                );


                /* -----------------------------------------
                   Ensure Private Offer Data
                ----------------------------------------- */

                if (isPrivateOffer) {

                    formData.set(
                        "request_status",
                        "Pending Review"
                    );


                    formData.set(
                        "private_offer_status",
                        "Pending Review"
                    );


                    formData.set(
                        "payment_option",
                        "Not Applicable"
                    );


                    formData.set(
                        "amount_due",
                        "To be confirmed"
                    );


                    formData.set(
                        "remaining_balance",
                        "To be confirmed"
                    );
                }


                const formAction =
                    form.getAttribute(
                        "action"
                    );


                if (!formAction) {

                    throw new Error(
                        "Form submission address is missing."
                    );
                }

                submissionStage = "form";

                /* -----------------------------------------
                   Send to Formspree
                ----------------------------------------- */

                const response =
                    await fetch(
                        formAction,
                        {
                            method: "POST",

                            body: formData,

                            headers: {

                                Accept:
                                    "application/json"
                            }
                        }
                    );


                let result = {};


                try {

                    result =
                        await response.json();

                } catch (jsonError) {

                    result = {};
                }


                /* -----------------------------------------
                   Formspree Error
                ----------------------------------------- */

                if (!response.ok) {

                    console.error(
                        "Formspree response:",
                        result
                    );


                    throw new Error(
                        result?.errors?.[0]?.message ||
                        "Your request could not be submitted."
                    );
                }


                /* =================================================
                   PRIVATE OFFER SUCCESS
                ================================================= */

                if (isPrivateOffer) {

                    if (submitText) {

                        submitText.textContent =
                            "Private Offer Requested";
                    }


                    showFeedback(
                        `Your Private Offer request has been received. Request ID: ${storedRequest.requestId}. We will review your request and contact you with the next steps.`,
                        "success"
                    );

                    isSubmitting = false;

                    /*
                     * IMPORTANT:
                     *
                     * Private Offers DO NOT go to
                     * the normal payment page.
                     */

                    return;
                }


                /* =================================================
                   NORMAL PACKAGE SUCCESS
                ================================================= */

                if (submitText) {

                    submitText.textContent =
                        "Request Received";
                }


                showFeedback(
                    `Request received successfully. Request ID: ${requestIdInput.value}`,
                    "success"
                );

                isSubmitting = false;

                /* -----------------------------------------
                   Redirect to Payment
                ----------------------------------------- */

                if (submitText) {

                    submitText.textContent =
                        "Redirecting to Payment...";
                }


                setTimeout(
                    () => {

                        window.location.href =
                            PAYMENT_PAGE_URL;

                    },
                    700
                );


            } catch (error) {

                console.error(
                    "MonarchAurex request error:",
                    error
                );

                isSubmitting = false;

                const errorMessage =
                    error instanceof TypeError &&
                    submissionStage === "photo"
                        ? "Could not connect to Cloudinary. Check your connection and retry the photo upload. Your request has not been submitted."
                        : error instanceof TypeError &&
                          submissionStage === "form"
                            ? "We could not confirm whether Formspree received your request. Check your connection and contact MonarchAurex before retrying to avoid a duplicate submission."
                            : error.message ||
                              "Something went wrong. Please try again.";

                showFeedback(
                    errorMessage,
                    "error"
                );


                if (submitButton) {

                    submitButton.disabled =
                        false;


                    if (submitText) {

                        submitText.textContent =
                            submitButton.dataset.originalText ||
                            "Continue to Payment";
                    }

                    else {

                        submitButton.textContent =
                            submitButton.dataset.originalText ||
                            "Continue to Payment";
                    }
                }
            }

        }
    );


    /* =========================================================
       INITIALISE
    ========================================================= */

    const packageQueryValues = {
        graduate: "Graduate",
        professional: "Professional",
        executive: "Executive"
    };

    const requestedPackage =
        new URLSearchParams(window.location.search)
            .get("package")
            ?.trim()
            .toLowerCase();

    if (
        packageSelect &&
        requestedPackage &&
        packageQueryValues[requestedPackage]
    ) {
        packageSelect.value =
            packageQueryValues[requestedPackage];

        packageSelect.dispatchEvent(
            new Event("change", { bubbles: true })
        );
    } else {
        updatePaymentSummary();
    }

});
