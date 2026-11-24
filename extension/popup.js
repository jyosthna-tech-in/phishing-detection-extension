console.log("NEW POPUP.JS LOADED");

const button = document.getElementById("checkButton");
const status = document.getElementById("status");

const N8N_WEBHOOK_URL =
    "https://phishing-detection-extension-three.vercel.app/api/analyze";


button.addEventListener("click", async () => {

    console.log("NEW BUTTON CODE RUNNING");

    button.disabled = true;

    status.innerHTML = `
        <div class="loading">
            🔍 Reading Gmail...
        </div>
    `;

    try {

        // Get active tab
        const tabs = await chrome.tabs.query({
            active: true,
            currentWindow: true
        });

        if (!tabs.length) {
            throw new Error("No active browser tab found.");
        }

        const tab = tabs[0];

        console.log("Current tab:", tab.url);

        // Make sure Gmail is open
        if (
            !tab.url ||
            !tab.url.startsWith("https://mail.google.com/")
        ) {
            throw new Error(
                "Please open a Gmail email first."
            );
        }

        status.innerHTML = `
            <div class="loading">
                📧 Extracting email...
            </div>
        `;


        // Extract email directly from Gmail
        const results =
            await chrome.scripting.executeScript({

                target: {
                    tabId: tab.id
                },

                func: () => {

                    const subjectElement =
                        document.querySelector("h2.hP");

                    const senderElement =
                        document.querySelector(".gD[email]");

                    const bodyElement =
                        document.querySelector(".a3s");

                    const subject =
                        subjectElement?.innerText || "";

                    const sender =
                        senderElement?.getAttribute("email") ||
                        senderElement?.innerText ||
                        "";

                    const body =
                        bodyElement?.innerText ||
                        bodyElement?.textContent ||
                        "";

                    return {
                        subject: subject.trim(),
                        sender: sender.trim(),
                        body: body.trim(),
                        gmail_url: window.location.href
                    };
                }
            });


        console.log(
            "Extraction result:",
            results
        );


        if (!results || !results[0]) {
            throw new Error(
                "Could not extract email from Gmail."
            );
        }


        const email = results[0].result;

        console.log(
            "Extracted email:",
            email
        );


        if (
            !email.subject &&
            !email.sender &&
            !email.body
        ) {
            throw new Error(
                "No email content was found. Make sure an email is open."
            );
        }


        status.innerHTML = `
            <div class="loading">
                ☁️ Sending email to phishing detector...
            </div>
        `;


        console.log(
            "Sending email to n8n..."
        );


        // Send email to n8n with proper Bearer token headers
        const response = await fetch(
            N8N_WEBHOOK_URL,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer your-actual-secret-token"
                },

                body: JSON.stringify(email)
            }
        );


        console.log(
            "n8n HTTP status:",
            response.status
        );


        if (!response.ok) {
            throw new Error(
                "n8n returned HTTP " +
                response.status
            );
        }


        const data =
            await response.json();


        console.log(
            "n8n response:",
            data
        );


        // Determine badge color based on verdict
        const isSuspicious = data.verdict === "Suspicious" || data.score > 40;
        const badgeColor = isSuspicious ? "#be123c" : "#047857";
        const badgeBg = isSuspicious ? "#fff1f2" : "#ecfdf5";
        const badgeBorder = isSuspicious ? "#fecdd3" : "#a7f3d0";

        status.innerHTML = `
            <div style="
                background: ${badgeBg};
                border: 1px solid ${badgeBorder};
                border-radius: 12px;
                padding: 15px;
                color: ${badgeColor};
                line-height: 1.5;
                text-align: left;
            ">
                <strong>Verdict: ${data.verdict}</strong>
                <br>
                <strong>Risk Score:</strong> ${data.score}/100
                <br><br>
                <strong>Analysis:</strong><br>
                ${data.reason}
            </div>
        `;


    } catch (error) {

        console.error(
            "PHISHING DETECTOR ERROR:",
            error
        );


        status.innerHTML = `
            <div style="
                background:#fff1f2;
                border:1px solid #fecdd3;
                border-radius:12px;
                padding:15px;
                color:#be123c;
                line-height:1.5;
            ">
                <strong>❌ Error</strong>
                <br><br>
                ${error.message}
            </div>
        `;

    } finally {

        button.disabled = false;
    }
});