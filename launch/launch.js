"use strict";

const countdown = document.getElementById("countdown");
const launchMessage = document.getElementById("launch-message");
const units = {
    days: document.getElementById("days"),
    hours: document.getElementById("hours"),
    minutes: document.getElementById("minutes"),
    seconds: document.getElementById("seconds")
};

if (!countdown || !launchMessage || Object.values(units).some(unit => !unit)) {
    throw new Error("The launch countdown page is missing required elements.");
}

// Johannesburg is UTC+02:00 on the launch date.
const launchTime = new Date("2027-01-01T00:00:00+02:00").getTime();
let intervalId;

const showLaunchMessage = () => {
    window.clearInterval(intervalId);
    countdown.hidden = true;
    launchMessage.hidden = false;
};

const updateCountdown = () => {
    const remaining = launchTime - Date.now();

    if (remaining <= 0) {
        showLaunchMessage();
        return;
    }

    const totalSeconds = Math.floor(remaining / 1000);
    const values = {
        days: Math.floor(totalSeconds / 86400),
        hours: Math.floor((totalSeconds % 86400) / 3600),
        minutes: Math.floor((totalSeconds % 3600) / 60),
        seconds: totalSeconds % 60
    };

    units.days.textContent = String(values.days).padStart(3, "0");
    units.hours.textContent = String(values.hours).padStart(2, "0");
    units.minutes.textContent = String(values.minutes).padStart(2, "0");
    units.seconds.textContent = String(values.seconds).padStart(2, "0");
};

updateCountdown();

if (!countdown.hidden) {
    intervalId = window.setInterval(updateCountdown, 1000);
}

const launchCommentsForm = document.getElementById("launch-comments-form");
const launchCommentName = document.getElementById("launch-comment-name");
const launchCommentMessage = document.getElementById(
    "launch-comment-message"
);
const launchCommentStatus = document.getElementById("launch-comment-status");

if (
    launchCommentsForm &&
    launchCommentName &&
    launchCommentMessage &&
    launchCommentStatus
) {
    launchCommentsForm.addEventListener("submit", event => {
        event.preventDefault();

        const displayName = launchCommentName.value.trim();
        const comment = launchCommentMessage.value.trim();

        if (displayName.length < 2 || displayName.length > 60) {
            launchCommentStatus.textContent =
                "Enter a display name between 2 and 60 characters.";
            launchCommentName.focus();
            return;
        }

        if (!comment || comment.length > 500) {
            launchCommentStatus.textContent =
                "Enter a comment of up to 500 characters.";
            launchCommentMessage.focus();
            return;
        }

        launchCommentStatus.textContent =
            "Comments cannot be submitted at this time.";
    });
}
