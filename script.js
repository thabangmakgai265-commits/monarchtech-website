/* =========================================================
   MONARCHAUREX — GLOBAL SITE SCRIPT
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    /* =====================================================
       SUPABASE
       ===================================================== */

    const SUPABASE_URL =
        "https://vvobkcikfueenyzgjghk.supabase.co";

    const SUPABASE_KEY =
        "sb_publishable_DIOMqnJVpHDotsi9HWIDnQ_tMpBuRQG";

    let supabaseClient = null;

    if (
        window.supabase &&
        typeof window.supabase.createClient === "function"
    ) {
        supabaseClient = window.supabase.createClient(
            SUPABASE_URL,
            SUPABASE_KEY
        );
    }


    /* =====================================================
       HELPERS
       ===================================================== */

    const $ = (selector, parent = document) =>
        parent.querySelector(selector);

    const $$ = (selector, parent = document) =>
        [...parent.querySelectorAll(selector)];


    /* =====================================================
       MOBILE NAVIGATION
       ===================================================== */

    const menuToggle =
        $(".menu-toggle") ||
        $(".mobile-menu-toggle") ||
        $("[aria-label='Toggle navigation']");

    const navigation =
        $("nav ul") ||
        $(".nav-links") ||
        $(".navigation-links");

    if (menuToggle && navigation) {

        menuToggle.addEventListener("click", () => {

            const isOpen =
                navigation.classList.toggle("active");

            menuToggle.setAttribute(
                "aria-expanded",
                String(isOpen)
            );

        });


        $$(".nav-links a, nav ul a").forEach(link => {

            link.addEventListener("click", () => {

                navigation.classList.remove("active");

                menuToggle.setAttribute(
                    "aria-expanded",
                    "false"
                );

            });

        });

    }


    /* =====================================================
       SMOOTH INTERNAL NAVIGATION
       ===================================================== */

    $$("a[href^='#']").forEach(link => {

        link.addEventListener("click", event => {

            const targetId =
                link.getAttribute("href");

            if (
                !targetId ||
                targetId === "#" ||
                targetId.length < 2
            ) {
                return;
            }

            const target =
                document.querySelector(targetId);

            if (!target) {
                return;
            }

            event.preventDefault();

            target.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });

        });

    });


    /* =====================================================
       SCROLL INTERACTIONS
       ===================================================== */

    let lastScrollPosition = window.scrollY;

    const navbar =
        $("header") ||
        $(".navbar") ||
        $("nav");

    window.addEventListener(
        "scroll",
        () => {

            const currentScroll =
                window.scrollY;

            if (navbar) {

                if (currentScroll > 40) {
                    navbar.classList.add("scrolled");
                } else {
                    navbar.classList.remove("scrolled");
                }

            }

            lastScrollPosition = currentScroll;

        },
        { passive: true }
    );


    /* =====================================================
       REVEAL ON SCROLL
       ===================================================== */

    const revealElements = $$(
        ".reveal, .fade-up, .section-heading, .collection-card, .process-item, .pricing-card, .experience-card"
    );

    if (
        revealElements.length &&
        "IntersectionObserver" in window
    ) {

        const revealObserver =
            new IntersectionObserver(
                entries => {

                    entries.forEach(entry => {

                        if (entry.isIntersecting) {

                            entry.target.classList.add(
                                "visible"
                            );

                            revealObserver.unobserve(
                                entry.target
                            );

                        }

                    });

                },
                {
                    threshold: 0.12
                }
            );

        revealElements.forEach(element => {

            revealObserver.observe(element);

        });

    }


    /* =====================================================
       CLIENT EXPERIENCE — ELEMENTS
       ===================================================== */

    const openReviewForm =
        $("#open-review-form");

    const closeReviewForm =
        $("#close-review-form");

    const reviewFormWrapper =
        $("#review-form-wrapper");

    const clientReviewForm =
        $("#client-review-form");

    const reviewStatus =
        $("#review-form-status");

    const reviewList =
        $("#review-list");

    const overallRating =
        $("#overall-rating");

    const reviewCount =
        $("#review-count");

    const reviewRatingInput =
        $("#review-rating");

    const selectedRating =
        $("#selected-rating");

    const ratingStars =
        $$(".rating-star");


    /* =====================================================
       OPEN REVIEW FORM
       ===================================================== */

    if (
        openReviewForm &&
        reviewFormWrapper
    ) {

        openReviewForm.addEventListener(
            "click",
            () => {

                reviewFormWrapper.hidden = false;

                reviewFormWrapper.scrollIntoView({
                    behavior: "smooth",
                    block: "center"
                });

                const nameInput =
                    $("#review-name");

                if (nameInput) {

                    setTimeout(() => {
                        nameInput.focus();
                    }, 500);

                }

            }
        );

    }


    /* =====================================================
       CLOSE REVIEW FORM
       ===================================================== */

    if (
        closeReviewForm &&
        reviewFormWrapper
    ) {

        closeReviewForm.addEventListener(
            "click",
            () => {

                reviewFormWrapper.hidden = true;

                if (reviewStatus) {
                    reviewStatus.textContent = "";
                }

            }
        );

    }


    /* =====================================================
       RATING SELECTOR
       ===================================================== */

    let selectedRatingValue = 0;


    const updateRatingDisplay = rating => {

        selectedRatingValue =
            Number(rating) || 0;

        if (reviewRatingInput) {

            reviewRatingInput.value =
                selectedRatingValue
                    ? String(selectedRatingValue)
                    : "";

        }

        ratingStars.forEach(star => {

            const starRating =
                Number(
                    star.dataset.rating
                );

            star.classList.toggle(
                "selected",
                starRating <= selectedRatingValue
            );

            star.setAttribute(
                "aria-checked",
                String(
                    starRating ===
                    selectedRatingValue
                )
            );

        });


        if (selectedRating) {

            selectedRating.textContent =
                selectedRatingValue
                    ? `${selectedRatingValue} out of 6`
                    : "Select a rating";

        }

    };


    ratingStars.forEach(star => {

        star.addEventListener(
            "click",
            () => {

                updateRatingDisplay(
                    star.dataset.rating
                );

            }
        );


        star.addEventListener(
            "keydown",
            event => {

                if (
                    event.key === "Enter" ||
                    event.key === " "
                ) {

                    event.preventDefault();

                    updateRatingDisplay(
                        star.dataset.rating
                    );

                }

            }
        );

    });


    /* =====================================================
       REVIEW STATUS
       ===================================================== */

    const setReviewStatus = (
        message,
        type = ""
    ) => {

        if (!reviewStatus) {
            return;
        }

        reviewStatus.textContent =
            message;

        reviewStatus.className =
            "review-form-status";

        if (type) {
            reviewStatus.classList.add(type);
        }

    };


    /* =====================================================
       FORM VALIDATION
       ===================================================== */

    const validateReviewForm = () => {

        if (!clientReviewForm) {
            return false;
        }


        const nameInput =
            $("#review-name");

        const emailInput =
            $("#review-email");

        const commentInput =
            $("#review-comment");

        const consentInput =
            $('input[name="consent"]',
                clientReviewForm);


        const name =
            nameInput?.value.trim() || "";

        const email =
            emailInput?.value.trim() || "";

        const comment =
            commentInput?.value.trim() || "";


        if (!selectedRatingValue) {

            setReviewStatus(
                "Please select a rating from 1 to 6.",
                "error"
            );

            return false;

        }


        if (!name) {

            setReviewStatus(
                "Please enter your name.",
                "error"
            );

            nameInput?.focus();

            return false;

        }


        if (!email) {

            setReviewStatus(
                "Please enter your email address.",
                "error"
            );

            emailInput?.focus();

            return false;

        }


        const emailPattern =
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailPattern.test(email)) {

            setReviewStatus(
                "Please enter a valid email address.",
                "error"
            );

            emailInput?.focus();

            return false;

        }


        if (
            comment.length < 20
        ) {

            setReviewStatus(
                "Your experience must contain at least 20 characters.",
                "error"
            );

            commentInput?.focus();

            return false;

        }


        if (
            comment.length > 1000
        ) {

            setReviewStatus(
                "Your experience cannot exceed 1000 characters.",
                "error"
            );

            commentInput?.focus();

            return false;

        }


        if (
            !consentInput ||
            !consentInput.checked
        ) {

            setReviewStatus(
                "Please confirm that this is your genuine experience.",
                "error"
            );

            return false;

        }


        return true;

    };


    /* =====================================================
       REVIEW SUBMISSION → SUPABASE
       ===================================================== */

    if (clientReviewForm) {

        clientReviewForm.addEventListener(
            "submit",
            async event => {

                event.preventDefault();


                if (!supabaseClient) {

                    setReviewStatus(
                        "The review service is currently unavailable. Please try again later.",
                        "error"
                    );

                    return;

                }


                if (!validateReviewForm()) {
                    return;
                }


                const submitButton =
                    $(".review-submit",
                        clientReviewForm);


                if (submitButton) {

                    submitButton.disabled =
                        true;

                    submitButton.dataset.originalText =
                        submitButton.innerHTML;

                    submitButton.innerHTML =
                        "Submitting Experience...";

                }


                setReviewStatus(
                    "Submitting your experience...",
                    "loading"
                );


                const name =
                    $("#review-name")
                        ?.value
                        .trim();

                const email =
                    $("#review-email")
                        ?.value
                        .trim();

                const comment =
                    $("#review-comment")
                        ?.value
                        .trim();


                try {

                    const {
                        error
                    } = await supabaseClient
                        .from("client_reviews")
                        .insert([
                            {
                                client_name:
                                    name,

                                client_email:
                                    email,

                                rating:
                                    selectedRatingValue,

                                review:
                                    comment,

                                verified:
                                    false,

                                approved:
                                    false
                            }
                        ]);


                    if (error) {

                        console.error(
                            "Supabase review submission error:",
                            error
                        );

                        throw error;

                    }


                    /* -------------------------------------
                       SUCCESS
                       ------------------------------------- */

                    setReviewStatus(
                        "Thank you. Your experience has been submitted for verification and review.",
                        "success"
                    );


                    clientReviewForm.reset();

                    updateRatingDisplay(0);


                    /*
                       We deliberately do NOT add the review
                       to the public page here.

                       New reviews are:
                       verified = false
                       approved = false

                       Therefore they remain private until
                       they pass the verification/moderation
                       process.
                    */


                    setTimeout(() => {

                        if (reviewFormWrapper) {

                            reviewFormWrapper.hidden =
                                true;

                        }

                        setReviewStatus("");

                    }, 3500);


                } catch (error) {

                    console.error(
                        error
                    );

                    setReviewStatus(
                        "We couldn't submit your experience right now. Please try again.",
                        "error"
                    );

                } finally {

                    if (submitButton) {

                        submitButton.disabled =
                            false;

                        submitButton.innerHTML =
                            submitButton.dataset
                                .originalText ||
                            "Submit Experience";

                    }

                }

            }
        );

    }


    /* =====================================================
       PUBLIC VERIFIED REVIEWS
       ===================================================== */

    const loadApprovedReviews =
        async () => {

            if (!supabaseClient) {

                console.error(
                    "Supabase client unavailable."
                );

                return;

            }


            if (!reviewList) {
                return;
            }


            try {

                const {
                    data,
                    error
                } = await supabaseClient
                    .from("client_reviews")
                    .select(
                        "id, client_name, rating, review, created_at"
                    )
                    .eq(
                        "verified",
                        true
                    )
                    .eq(
                        "approved",
                        true
                    )
                    .order(
                        "created_at",
                        {
                            ascending: false
                        }
                    );


                if (error) {

                    console.error(
                        "Could not load reviews:",
                        error
                    );

                    renderEmptyReviews();

                    return;

                }


                const reviews =
                    Array.isArray(data)
                        ? data
                        : [];


                updateOverallRating(
                    reviews
                );

                renderReviews(
                    reviews
                );


            } catch (error) {

                console.error(
                    "Review loading error:",
                    error
                );

                renderEmptyReviews();

            }

        };


    /* =====================================================
       EMPTY REVIEW STATE
       ===================================================== */

    const renderEmptyReviews =
        () => {

            if (!reviewList) {
                return;
            }


            reviewList.innerHTML = `
                <div class="review-empty-state">
                    <span>CLIENT EXPERIENCES</span>
                    <p>
                        Experiences will appear here as
                        verified client reviews become available.
                    </p>
                </div>
            `;


            if (overallRating) {
                overallRating.textContent = "—";
            }


            if (reviewCount) {

                reviewCount.textContent =
                    "Experiences will appear here as verified client reviews become available.";

            }

        };


    /* =====================================================
       DYNAMIC RATING
       ===================================================== */

    const updateOverallRating =
        reviews => {

            if (!reviews.length) {

                if (overallRating) {
                    overallRating.textContent = "—";
                }

                if (reviewCount) {

                    reviewCount.textContent =
                        "Experiences will appear here as verified client reviews become available.";

                }

                return;

            }


            const total =
                reviews.reduce(
                    (sum, review) =>
                        sum +
                        Number(review.rating || 0),
                    0
                );


            const average =
                total / reviews.length;


            if (overallRating) {

                overallRating.textContent =
                    average.toFixed(1);

            }


            if (reviewCount) {

                reviewCount.textContent =
                    reviews.length === 1
                        ? "1 verified client experience."
                        : `${reviews.length} verified client experiences.`;

            }

        };


    /* =====================================================
       REVIEW DISPLAY
       ===================================================== */

    const renderReviews =
        reviews => {

            if (!reviewList) {
                return;
            }


            if (!reviews.length) {

                renderEmptyReviews();

                return;

            }


            reviewList.innerHTML = "";


            reviews.forEach(review => {

                const article =
                    document.createElement(
                        "article"
                    );

                article.className =
                    "client-review";


                /* -----------------------------------------
                   HEADER
                   ----------------------------------------- */

                const header =
                    document.createElement(
                        "div"
                    );

                header.className =
                    "client-review-header";


                const identity =
                    document.createElement(
                        "div"
                    );

                identity.className =
                    "client-review-identity";


                const name =
                    document.createElement(
                        "h4"
                    );

                name.textContent =
                    review.client_name ||
                    "MONARCHAUREX Client";


                const verified =
                    document.createElement(
                        "span"
                    );

                verified.className =
                    "verified-review";

                verified.textContent =
                    "Verified Experience";


                identity.appendChild(name);
                identity.appendChild(verified);


                const rating =
                    document.createElement(
                        "div"
                    );

                rating.className =
                    "client-review-rating";

                rating.setAttribute(
                    "aria-label",
                    `${review.rating} out of 6`
                );


                const ratingValue =
                    Number(review.rating) || 0;


                rating.textContent =
                    "★".repeat(ratingValue) +
                    "☆".repeat(
                        Math.max(
                            0,
                            6 - ratingValue
                        )
                    );


                header.appendChild(identity);
                header.appendChild(rating);


                /* -----------------------------------------
                   REVIEW BODY
                   ----------------------------------------- */

                const body =
                    document.createElement(
                        "p"
                    );

                body.className =
                    "client-review-text";

                body.textContent =
                    review.review || "";


                /* -----------------------------------------
                   DATE
                   ----------------------------------------- */

                const footer =
                    document.createElement(
                        "div"
                    );

                footer.className =
                    "client-review-footer";


                const date =
                    document.createElement(
                        "span"
                    );


                if (review.created_at) {

                    const reviewDate =
                        new Date(
                            review.created_at
                        );


                    if (
                        !Number.isNaN(
                            reviewDate.getTime()
                        )
                    ) {

                        date.textContent =
                            reviewDate.toLocaleDateString(
                                undefined,
                                {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric"
                                }
                            );

                    }

                }


                footer.appendChild(date);


                article.appendChild(header);
                article.appendChild(body);
                article.appendChild(footer);


                reviewList.appendChild(article);

            });

        };


    /* =====================================================
       LOAD REVIEWS
       ===================================================== */

    loadApprovedReviews();


    /* =====================================================
       REDUCED MOTION
       ===================================================== */

    const reducedMotion =
        window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        );


    const handleReducedMotion =
        event => {

            document.documentElement.classList.toggle(
                "reduced-motion",
                event.matches
            );

        };


    handleReducedMotion(
        reducedMotion
    );


    if (
        typeof reducedMotion.addEventListener ===
        "function"
    ) {

        reducedMotion.addEventListener(
            "change",
            handleReducedMotion
        );

    }


    /* =====================================================
       EXPERIENCE CARD INTERACTIONS
       ===================================================== */

    $$(".experience-card, .collection-card").forEach(
        card => {

            card.addEventListener(
                "mouseenter",
                () => {

                    card.classList.add(
                        "is-hovered"
                    );

                }
            );


            card.addEventListener(
                "mouseleave",
                () => {

                    card.classList.remove(
                        "is-hovered"
                    );

                }
            );

        }
    );


    /* =====================================================
       REQUEST PORTFOLIO — FORMSPREE
       ===================================================== */

    const requestForm =
        $("#portfolio-request-form");

    if (requestForm) {

        const requestSubmit =
            $("#request-submit");

        const submitText =
            $(".submit-text",
                requestSubmit || requestForm);

        const submitLoading =
            $(".submit-loading",
                requestSubmit || requestForm);

        const formFeedback =
            $("#form-feedback");


        const setRequestFeedback =
            (message, type = "") => {

                if (!formFeedback) {
                    return;
                }

                formFeedback.textContent =
                    message;

                formFeedback.className =
                    "form-feedback";

                if (type) {
                    formFeedback.classList.add(
                        type
                    );
                }

            };


        requestForm.addEventListener(
            "submit",
            event => {

                const name =
                    requestForm
                        .querySelector(
                            '[name="name"]'
                        )
                        ?.value
                        .trim();

                const email =
                    requestForm
                        .querySelector(
                            '[name="email"]'
                        )
                        ?.value
                        .trim();

                const field =
                    requestForm
                        .querySelector(
                            '[name="field"]'
                        )
                        ?.value
                        .trim();

                const packageChoice =
                    requestForm
                        .querySelector(
                            '[name="package"]'
                        )
                        ?.value;

                const message =
                    requestForm
                        .querySelector(
                            '[name="message"]'
                        )
                        ?.value
                        .trim();


                if (!name) {

                    event.preventDefault();

                    setRequestFeedback(
                        "Please enter your name.",
                        "error"
                    );

                    return;

                }


                if (!email) {

                    event.preventDefault();

                    setRequestFeedback(
                        "Please enter your email address.",
                        "error"
                    );

                    return;

                }


                const emailPattern =
                    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


                if (
                    !emailPattern.test(email)
                ) {

                    event.preventDefault();

                    setRequestFeedback(
                        "Please enter a valid email address.",
                        "error"
                    );

                    return;

                }


                if (!field) {

                    event.preventDefault();

                    setRequestFeedback(
                        "Please enter your professional field.",
                        "error"
                    );

                    return;

                }


                if (!packageChoice) {

                    event.preventDefault();

                    setRequestFeedback(
                        "Please select a portfolio package.",
                        "error"
                    );

                    return;

                }


                if (!message) {

                    event.preventDefault();

                    setRequestFeedback(
                        "Please tell us about your portfolio requirements.",
                        "error"
                    );

                    return;

                }


                /*
                   Let Formspree handle the actual submission.
                   We only enhance the UI before the request leaves
                   the browser.
                */

                if (requestSubmit) {

                    requestSubmit.disabled =
                        true;

                }


                if (submitText) {

                    submitText.hidden =
                        true;

                }


                if (submitLoading) {

                    submitLoading.hidden =
                        false;

                    submitLoading.setAttribute(
                        "aria-hidden",
                        "false"
                    );

                }


                setRequestFeedback(
                    "Sending your portfolio request...",
                    "loading"
                );

            }
        );

    }


    /* =====================================================
       GLOBAL ACCESSIBILITY
       ===================================================== */

    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Escape"
            ) {

                if (
                    reviewFormWrapper &&
                    !reviewFormWrapper.hidden
                ) {

                    reviewFormWrapper.hidden =
                        true;

                }


                if (
                    navigation &&
                    navigation.classList.contains(
                        "active"
                    )
                ) {

                    navigation.classList.remove(
                        "active"
                    );

                    menuToggle?.setAttribute(
                        "aria-expanded",
                        "false"
                    );

                }

            }

        }
    );


    /* =====================================================
       INITIAL STATE
       ===================================================== */

    if (reviewFormWrapper) {
        reviewFormWrapper.hidden = true;
    }


    if (submitLoading) {
        submitLoading.hidden = true;
    }


    if (reviewStatus) {
        reviewStatus.textContent = "";
    }


    console.log(
        "MONARCHAUREX — site functionality initialized."
    );

});
