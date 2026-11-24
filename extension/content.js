/*
 * Gmail Phishing Detector
 * content.js
 *
 * This script runs inside Gmail.
 * It only extracts the currently opened email when
 * popup.js explicitly asks for it.
 */

console.log("Gmail Phishing Detector content script loaded.");


/*
 * Listen for messages from popup.js
 */
chrome.runtime.onMessage.addListener(
    (message, sender, sendResponse) => {

        console.log(
            "Message received:",
            message
        );


        /*
         * Simple connection test.
         *
         * popup.js can send:
         *
         * { action: "PING" }
         *
         * and we respond:
         *
         * { success: true }
         */

        if (message.action === "PING") {

            sendResponse({
                success: true,
                message: "Content script is running."
            });

            return true;
        }


        /*
         * Extract the currently opened email.
         */

        if (message.action === "GET_EMAIL") {

            try {

                const email =
                    extractCurrentEmail();


                if (!email.subject &&
                    !email.body &&
                    !email.sender) {

                    sendResponse({
                        success: false,
                        error:
                            "No email appears to be open. Please open an email in Gmail first."
                    });

                    return true;
                }


                console.log(
                    "Extracted email:",
                    email
                );


                sendResponse({
                    success: true,
                    email: email
                });

            } catch (error) {

                console.error(
                    "Email extraction error:",
                    error
                );


                sendResponse({
                    success: false,
                    error:
                        "Could not extract the email: " +
                        error.message
                });
            }


            return true;
        }


        /*
         * Unknown message
         */

        sendResponse({
            success: false,
            error: "Unknown action."
        });


        return true;
    }
);


/*
 * Extract the currently visible Gmail email.
 */
function extractCurrentEmail() {

    /*
     * SUBJECT
     *
     * Gmail commonly uses:
     * h2.hP
     *
     * We also provide fallbacks because Gmail's UI
     * can change.
     */

    const subjectElement =
        document.querySelector(
            "h2.hP"
        ) ||
        document.querySelector(
            "h2[data-thread-perm-id]"
        ) ||
        document.querySelector(
            "[role='main'] h2"
        );


    const subject =
        cleanText(
            subjectElement?.innerText || ""
        );


    /*
     * SENDER
     *
     * Gmail commonly exposes the email address
     * through the "email" attribute.
     */

    let sender = "";


    const senderElement =
        document.querySelector(
            ".gD[email]"
        ) ||
        document.querySelector(
            "[email]"
        );


    if (senderElement) {

        sender =
            senderElement.getAttribute(
                "email"
            ) ||
            senderElement.innerText ||
            "";
    }


    /*
     * If we didn't get the sender from the email
     * attribute, try Gmail's visible sender element.
     */

    if (!sender) {

        const visibleSender =
            document.querySelector(
                ".gD"
            );

        if (visibleSender) {

            sender =
                visibleSender.innerText ||
                "";
        }
    }


    sender =
        cleanText(sender);


    /*
     * BODY
     *
     * Gmail commonly uses:
     *
     * .a3s.aiL
     *
     * We use the first visible message body.
     */

    let bodyElement =
        document.querySelector(
            ".a3s.aiL"
        );


    /*
     * Fallbacks
     */

    if (!bodyElement) {

        bodyElement =
            document.querySelector(
                ".a3s"
            );
    }


    if (!bodyElement) {

        bodyElement =
            document.querySelector(
                "[role='main'] .ii.gt"
            );
    }


    let body = "";


    if (bodyElement) {

        /*
         * innerText gives us readable text rather
         * than all the HTML markup.
         */

        body =
            bodyElement.innerText ||
            bodyElement.textContent ||
            "";
    }


    body =
        cleanText(body);


    /*
     * LINKS
     *
     * Collect links only from the currently
     * visible email body.
     */

    const links = [];


    if (bodyElement) {

        const anchors =
            bodyElement.querySelectorAll(
                "a[href]"
            );


        anchors.forEach(
            (anchor) => {

                const href =
                    anchor.href;


                if (
                    href &&
                    !links.includes(href)
                ) {

                    links.push(href);
                }
            }
        );
    }


    /*
     * DATE
     */

    let date = "";


    const dateElement =
        document.querySelector(
            "span.g3[title]"
        ) ||
        document.querySelector(
            "[data-tooltip]"
        );


    if (dateElement) {

        date =
            dateElement.getAttribute(
                "title"
            ) ||
            dateElement.innerText ||
            "";
    }


    date =
        cleanText(date);


    /*
     * CURRENT GMAIL URL
     */

    const gmailUrl =
        window.location.href;


    /*
     * Return structured email object.
     *
     * IMPORTANT:
     * Nothing is sent anywhere from this file.
     *
     * It only returns the email to popup.js
     * when popup.js explicitly asks for it.
     */

    return {

        subject: subject,

        sender: sender,

        body: body,

        links: links,

        date: date,

        gmail_url: gmailUrl

    };
}


/*
 * Clean unnecessary whitespace.
 */

function cleanText(text) {

    return String(text || "")
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .replace(/[ \t]+/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}