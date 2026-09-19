/* =========================================================
   MONARCHAUREX — REQUEST PAGE SCRIPT
   Handles:
   - Request ID generation
   - Package pricing
   - Payment calculations
   - Profile photo preview
   - Cloudinary upload
   - Form validation
   - Formspree submission
   - Request data storage for payment page
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    /* =========================================================
       CONFIGURATION
       ========================================================= */

    const CLOUDINARY_CLOUD_NAME = "ebfxr5ms";
    const CLOUDINARY_UPLOAD_PRESET = "monarch_profile_photos";

    const CLOUDINARY_UPLOAD_URL =
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

    const packagePrices = {
        Graduate: 1199,
        Professional: 2999,
        Executive: 3999
    };

    const MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5MB

    const allowedPhotoTypes = [
        "image/jpeg",
        "image/png",
        "image/webp"
    ];


    /* =========================================================
       ELEMENTS
       ========================================================= */

    const form = document.getElementById("portfolio-request-form");

    const requestIdInput = document.getElementById("request-id");

    const packageSelect = document.getElementById("package");

    const packageTotalInput = document.getElementById("package-total");

    const paymentOption = document.getElementById("payment-option");

    const amountDueInput = document.getElementById("amount-due");

    const remainingBalanceInput =
        document.getElementById("remaining-balance");

    const profilePhotoInput =
        document.getElementById("profile-photo");

    const profilePhotoUrlInput =
        document.getElementById("profile-photo-url");

    const photoPreview =
        document.getElementById("photo-preview");

    const photoPreviewImage =
        document.getElementById("photo-preview-image");

    const photoStatus =
        document.getElementById("photo-status");

    const submitButton =
        form?.querySelector(".request-submit");

    const feedback =
        document.getElementById("form-feedback");

    const summaryPackage =
        document.getElementById("summary-package");

    const summaryPrice =
        document.getElementById("summary-price");

    const summaryAmountDue =
        document.getElementById("summary-amount-due");

    const summaryRemaining =
        document.getElementById("summary-remaining");


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
       HELPER — CURRENCY
       ========================================================= */

    function formatCurrency(amount) {
        if (amount === null || amount === undefined || amount === "") {
            return "—";
        }

        const number = Number(amount);

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
       
       Example:
       MAX-2026-483921

       IMPORTANT:
       This creates a unique client-side ID.

       True sequential IDs such as:
       MAX-2026-00001
       MAX-2026-00002

       require a backend/database.
       ========================================================= */

    function generateRequestId() {
        const year = new Date().getFullYear();

        const timestampPart =
            String(Date.now()).slice(-6);

        const randomPart =
            Math.floor(100 + Math.random() * 900);

        return `MAX-${year}-${timestampPart}${randomPart}`;
    }


    /* =========================================================
       CREATE REQUEST ID
       ========================================================= */

    if (requestIdInput && !requestIdInput.value) {
        requestIdInput.value = generateRequestId();
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

        return packagePrices[selectedPackage] ?? null;
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

            return;
        }


        /* -----------------------------------------
           Private Offer
           ----------------------------------------- */

        if (selectedPackage === "Private Offer") {

            if (packageTotalInput) {
                packageTotalInput.value = "Custom Quote";
            }

            if (amountDueInput) {
                amountDueInput.value = "Custom Quote";
            }

            if (remainingBalanceInput) {
                remainingBalanceInput.value = "Custom Quote";
            }

            if (summaryPackage) {
                summaryPackage.textContent = "Private Offer";
            }

            if (summaryPrice) {
                summaryPrice.textContent = "Custom Quote";
            }

            if (summaryAmountDue) {
                summaryAmountDue.textContent = "Custom Quote";
            }

            if (summaryRemaining) {
                summaryRemaining.textContent = "To be confirmed";
            }

            if (paymentOption) {
                paymentOption.value = "";

                paymentOption.disabled = true;
                paymentOption.required = false;
            }

            return;
        }


        /* -----------------------------------------
           Standard Packages
           ----------------------------------------- */

        if (paymentOption) {
            paymentOption.disabled = false;
            paymentOption.required = true;
        }


        if (price === null) {
            return;
        }


        let amountDue = price;
        let remainingBalance = 0;


        /* -----------------------------------------
           Payment option
           ----------------------------------------- */

        if (
            paymentOption &&
            paymentOption.value === "25% Initial Payment"
        ) {

            amountDue =
                Math.round(
                    price * 0.25 * 100
                ) / 100;

            remainingBalance =
                Math.round(
                    (price - amountDue) * 100
                ) / 100;
        }


        if (
            paymentOption &&
            paymentOption.value === "Full Payment"
        ) {

            amountDue = price;
            remainingBalance = 0;
        }


        /* -----------------------------------------
           Hidden Formspree values
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
                formatCurrency(remainingBalance);
        }


        /* -----------------------------------------
           Visible summary
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
                formatCurrency(remainingBalance);
        }
    }


    /* =========================================================
       PACKAGE CHANGE
       ========================================================= */

    if (packageSelect) {
        packageSelect.addEventListener(
            "change",
            () => {

                updatePaymentSummary();

                /*
                 * If Private Offer is selected,
                 * payment selection is not required.
                 */
                if (
                    packageSelect.value ===
                    "Private Offer"
                ) {

                    if (paymentOption) {
                        paymentOption.value = "";
                    }

                }
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

    if (profilePhotoInput) {

        profilePhotoInput.addEventListener(
            "change",
            () => {

                const file =
                    profilePhotoInput.files?.[0];

                if (!file) {

                    if (photoPreview) {
                        photoPreview.hidden = true;
                    }

                    if (photoPreviewImage) {
                        photoPreviewImage.src = "";
                    }

                    if (photoStatus) {
                        photoStatus.textContent = "";
                    }

                    if (profilePhotoUrlInput) {
                        profilePhotoUrlInput.value = "";
                    }

                    return;
                }


                /* -----------------------------------------
                   File type validation
                   ----------------------------------------- */

                if (
                    !allowedPhotoTypes.includes(
                        file.type
                    )
                ) {

                    profilePhotoInput.value = "";

                    if (photoPreview) {
                        photoPreview.hidden = true;
                    }

                    if (photoStatus) {
                        photoStatus.textContent =
                            "Please upload a JPG, PNG or WebP image.";

                        photoStatus.className =
                            "photo-status error";
                    }

                    return;
                }


                /* -----------------------------------------
                   File size validation
                   ----------------------------------------- */

                if (file.size > MAX_PHOTO_SIZE) {

                    profilePhotoInput.value = "";

                    if (photoPreview) {
                        photoPreview.hidden = true;
                    }

                    if (photoStatus) {
                        photoStatus.textContent =
                            "Your profile photo must be 5MB or smaller.";

                        photoStatus.className =
                            "photo-status error";
                    }

                    return;
                }


                /* -----------------------------------------
                   Preview
                   ----------------------------------------- */

                const reader =
                    new FileReader();

                reader.onload = function (event) {

                    if (photoPreviewImage) {
                        photoPreviewImage.src =
                            event.target.result;
                    }

                    if (photoPreview) {
                        photoPreview.hidden = false;
                    }
                };

                reader.readAsDataURL(file);


                if (photoStatus) {

                    photoStatus.textContent =
                        "Photo selected. It will be uploaded securely when you submit your request.";

                    photoStatus.className =
                        "photo-status";
                }


                /*
                 * Clear previous Cloudinary URL
                 * because a new image was selected.
                 */

                if (profilePhotoUrlInput) {
                    profilePhotoUrlInput.value = "";
                }
            }
        );
    }


    /* =========================================================
       CLOUDINARY UPLOAD
       ========================================================= */

    async function uploadProfilePhoto(file) {

        if (!file) {
            throw new Error(
                "Please select a profile photo."
            );
        }


        /* -----------------------------------------
           Validate file type
           ----------------------------------------- */

        if (
            !allowedPhotoTypes.includes(
                file.type
            )
        ) {

            throw new Error(
                "Profile photo must be JPG, PNG or WebP."
            );
        }


        /* -----------------------------------------
           Validate file size
           ----------------------------------------- */

        if (file.size > MAX_PHOTO_SIZE) {

            throw new Error(
                "Profile photo must be 5MB or smaller."
            );
        }


        if (photoStatus) {

            photoStatus.textContent =
                "Uploading profile photo...";

            photoStatus.className =
                "photo-status uploading";
        }


        const cloudinaryData =
            new FormData();

        cloudinaryData.append(
            "file",
            file
        );

        cloudinaryData.append(
            "upload_preset",
            CLOUDINARY_UPLOAD_PRESET
        );


        try {

            const response =
                await fetch(
                    CLOUDINARY_UPLOAD_URL,
                    {
                        method: "POST",
                        body: cloudinaryData
                    }
                );


            let data = {};

            try {
                data = await response.json();
            } catch (jsonError) {
                data = {};
            }


            if (
                !response.ok ||
                !data.secure_url
            ) {

                console.error(
                    "Cloudinary response:",
                    data
                );

                throw new Error(
                    data?.error?.message ||
                    "Profile photo upload failed."
                );
            }


            /* -----------------------------------------
               Save secure Cloudinary URL
               ----------------------------------------- */

            if (profilePhotoUrlInput) {

                profilePhotoUrlInput.value =
                    data.secure_url;
            }


            if (photoStatus) {

                photoStatus.textContent =
                    "Profile photo uploaded successfully.";

                photoStatus.className =
                    "photo-status success";
            }


            return data.secure_url;

        } catch (error) {

            console.error(
                "Cloudinary upload error:",
                error
            );


            if (photoStatus) {

                photoStatus.textContent =
                    error.message ||
                    "Unable to upload profile photo.";

                photoStatus.className =
                    "photo-status error";
            }

            throw error;
        }
    }


    /* =========================================================
       FEEDBACK MESSAGE
       ========================================================= */

    function showFeedback(
        message,
        type = "success"
    ) {

        if (!feedback) {
            return;
        }

        feedback.textContent = message;

        feedback.className =
            `form-feedback ${type}`;

        feedback.hidden = false;
    }


    /* =========================================================
       CLEAR FEEDBACK
       ========================================================= */

    function clearFeedback() {

        if (!feedback) {
            return;
        }

        feedback.textContent = "";

        feedback.className =
            "form-feedback";

        feedback.hidden = true;
    }


    /* =========================================================
       STORE REQUEST DATA
       
       This allows the future payment page to read
       the request information.

       The payment backend must NOT trust these values
       as authoritative. Peach payment amounts must
       eventually be verified server-side.
       ========================================================= */

    function storeRequestData() {

        const selectedPackage =
            packageSelect?.value || "";

        const price =
            getPackagePrice();

        const storedData = {

            requestId:
                requestIdInput?.value || "",

            name:
                document.getElementById("name")?.value || "",

            email:
                document.getElementById("email")?.value || "",

            package:
                selectedPackage,

            packageTotal:
                packageTotalInput?.value || "",

            paymentOption:
                paymentOption?.value || "",

            amountDue:
                amountDueInput?.value || "",

            remainingBalance:
                remainingBalanceInput?.value || "",

            profilePhotoUrl:
                profilePhotoUrlInput?.value || "",

            packagePrice:
                price,

            createdAt:
                new Date().toISOString()
        };


        sessionStorage.setItem(
            "monarchaurex_request",
            JSON.stringify(storedData)
        );
    }


    /* =========================================================
       FORM SUBMISSION
       ========================================================= */

    form.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();

            clearFeedback();


            /* -----------------------------------------
               Native browser validation
               ----------------------------------------- */

            if (!form.checkValidity()) {

                form.reportValidity();

                return;
            }


            /* -----------------------------------------
               Prevent duplicate submissions
               ----------------------------------------- */

            if (submitButton) {

                submitButton.disabled = true;

                submitButton.dataset.originalText =
                    submitButton.textContent;

                submitButton.textContent =
                    "Preparing Your Request...";
            }


            try {

                /* -----------------------------------------
                   Check package
                   ----------------------------------------- */

                const selectedPackage =
                    packageSelect?.value || "";

                if (!selectedPackage) {

                    throw new Error(
                        "Please select a package."
                    );
                }


                /* -----------------------------------------
                   Check payment option
                   ----------------------------------------- */

                if (
                    selectedPackage !==
                    "Private Offer"
                ) {

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
                   Check profile photo
                   ----------------------------------------- */

                const photoFile =
                    profilePhotoInput?.files?.[0];


                if (!photoFile) {

                    throw new Error(
                        "Please upload your profile photo."
                    );
                }


                /* -----------------------------------------
                   Upload photo
                   ----------------------------------------- */

                if (submitButton) {

                    submitButton.textContent =
                        "Uploading Profile Photo...";
                }


                await uploadProfilePhoto(
                    photoFile
                );


                /* -----------------------------------------
                   Recalculate payment
                   ----------------------------------------- */

                updatePaymentSummary();


                /* -----------------------------------------
                   Make sure request ID exists
                   ----------------------------------------- */

                if (
                    requestIdInput &&
                    !requestIdInput.value
                ) {

                    requestIdInput.value =
                        generateRequestId();
                }


                /* -----------------------------------------
                   Store request data
                   ----------------------------------------- */

                storeRequestData();


                /* -----------------------------------------
                   Submit to Formspree
                   ----------------------------------------- */

                if (submitButton) {

                    submitButton.textContent =
                        "Submitting Request...";
                }


                const formData =
                    new FormData(form);


                const formAction =
                    form.getAttribute("action");


                if (!formAction) {

                    throw new Error(
                        "Form submission address is missing."
                    );
                }


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
                    result = await response.json();
                } catch (jsonError) {
                    result = {};
                }


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


                /* -----------------------------------------
                   Successful submission
                   ----------------------------------------- */

                if (submitButton) {

                    submitButton.textContent =
                        "Request Received";
                }


                showFeedback(
                    `Your request has been received successfully. Request ID: ${requestIdInput.value}`,
                    "success"
                );


                /*
                 * IMPORTANT:
                 *
                 * We are NOT redirecting to the payment
                 * page yet because Peach Payments has not
                 * been connected.
                 *
                 * Once the payment page/backend is ready,
                 * this is where the redirect will happen.
                 */


                /*
                 * Keep the form data in sessionStorage
                 * for the next step.
                 */

                storeRequestData();


            } catch (error) {

                console.error(
                    "MonarchAurex request error:",
                    error
                );


                showFeedback(
                    error.message ||
                    "Something went wrong. Please try again.",
                    "error"
                );


                if (submitButton) {

                    submitButton.disabled = false;

                    submitButton.textContent =
                        submitButton.dataset.originalText ||
                        "Continue to Payment";
                }
            }
        }
    );


    /* =========================================================
       INITIALISE
       ========================================================= */

    updatePaymentSummary();

});
