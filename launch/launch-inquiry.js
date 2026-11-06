"use strict";

const launchCommentsForm = document.getElementById("launch-comments-form");
const launchCommentStatus = document.getElementById("launch-comment-status");
const launchCommentSubmit = launchCommentsForm?.querySelector(
    'button[type="submit"]'
);
const approvedComments = document.getElementById("approved-comments");
const approvedCommentsStatus = document.getElementById(
    "approved-comments-status"
);
const approvedCommentsList = document.getElementById(
    "approved-comments-list"
);

if (
    !launchCommentsForm ||
    !launchCommentStatus ||
    !launchCommentSubmit ||
    !approvedComments ||
    !approvedCommentsStatus ||
    !approvedCommentsList
) {
    throw new Error("The launch comments interface is incomplete.");
}

const projectUrl = "https://vvobkcikfueenyzgjghk.supabase.co";
const publishableKey = "sb_publishable_DIOMqnJVpHDotsi9HWIDnQ_tMpBuRQG";
const backendReady = launchCommentsForm.dataset.backendReady === "true";
const startedAtInput = document.getElementById("launch-comment-started-at");

const markLaunchFormStart = () => {
    if (startedAtInput && !startedAtInput.value) {
        startedAtInput.value = String(Date.now());
    }
};

launchCommentsForm.addEventListener("focusin", markLaunchFormStart);
launchCommentsForm.addEventListener("input", markLaunchFormStart);

if (backendReady) {
    launchCommentSubmit.disabled = false;
    launchCommentSubmit.textContent = "Submit for review";
    launchCommentStatus.textContent =
        "Your comment will be checked by the MonarchAurex team before it can appear publicly.";
}

launchCommentsForm.addEventListener("submit", async event => {
    event.preventDefault();

    if (!backendReady) {
        launchCommentStatus.textContent =
            "The secure submission service is not deployed. Nothing was sent.";
        return;
    }

    if (!launchCommentsForm.reportValidity()) {
        return;
    }

    launchCommentSubmit.disabled = true;
    launchCommentSubmit.textContent = "Submitting...";
    launchCommentStatus.textContent = "Submitting your comment securely...";

    const formData = new FormData(launchCommentsForm);
    const payload = {
        kind: "launch_comment",
        name: String(formData.get("name") ?? "").trim(),
        message: String(formData.get("message") ?? "").trim(),
        termsAgreed: formData.get("termsAgreed") === "on",
        website: String(formData.get("website") ?? ""),
        startedAt: Number(formData.get("startedAt"))
    };

    try {
        const response = await fetch(
            `${projectUrl}/functions/v1/launch-comment`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    apikey: publishableKey
                },
                body: JSON.stringify(payload)
            }
        );
        const result = await response.json().catch(() => ({}));

        if (!response.ok || result.ok !== true) {
            throw new Error(
                result.error || "Your comment could not be submitted. Please try again."
            );
        }

        launchCommentsForm.reset();
        if (startedAtInput) {
            startedAtInput.value = "";
        }
        launchCommentStatus.textContent =
            "Thank you. Your comment was received and is awaiting moderation.";
    } catch (error) {
        launchCommentStatus.textContent =
            error instanceof Error
                ? error.message
                : "Your comment could not be submitted. Please try again.";
    } finally {
        launchCommentSubmit.disabled = false;
        launchCommentSubmit.textContent = "Submit for review";
    }
});

const loadApprovedComments = async () => {
    if (approvedComments.dataset.backendReady !== "true") {
        return;
    }

    try {
        const query = new URLSearchParams({
            select: "display_name,comment,created_at",
            order: "created_at.desc",
            limit: "20"
        });
        const response = await fetch(
            `${projectUrl}/rest/v1/approved_launch_comments?${query}`,
            {
                headers: {
                    apikey: publishableKey,
                    Accept: "application/json"
                }
            }
        );

        if (!response.ok) {
            throw new Error("Approved comments could not be loaded.");
        }

        const comments = await response.json();
        if (!Array.isArray(comments)) {
            throw new Error("The comments service returned an invalid response.");
        }

        approvedCommentsList.replaceChildren();

        for (const comment of comments) {
            if (
                typeof comment.display_name !== "string" ||
                typeof comment.comment !== "string"
            ) {
                continue;
            }

            const item = document.createElement("li");
            const name = document.createElement("strong");
            const text = document.createElement("p");
            name.textContent = comment.display_name;
            text.textContent = comment.comment;
            item.append(name, text);
            approvedCommentsList.append(item);
        }

        approvedCommentsStatus.textContent = comments.length
            ? ""
            : "No comments have been approved yet.";
    } catch {
        approvedCommentsStatus.textContent =
            "Approved comments are temporarily unavailable.";
    }
};

loadApprovedComments();
